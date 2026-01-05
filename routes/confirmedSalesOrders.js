import express from 'express';
import ConfirmedSalesOrder from '../models/ConfirmedSalesOrder.js';
import User from '../models/User.js';
import CommodityMaster from '../models/CommodityMaster.js';
import VarietyMaster from '../models/VarietyMaster.js';
import WarehouseMaster from '../models/WarehouseMaster.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { parseFile } from '../utils/csvParser.js';

const router = express.Router();

// Test route to verify the router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Confirmed sales orders route is working' });
});

// All routes require authentication
router.use(authenticate);

// Get all confirmed sales orders (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const orders = await ConfirmedSalesOrder.find()
      .populate('customer_id', 'name email mobile_number')
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Get confirmed sales orders error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch confirmed sales orders' });
  }
});

// Get confirmed sales orders for a specific customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const { customerId } = req.params;

    // Non-admin users can only see their own orders
    if (user.role !== 'admin' && customerId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const orders = await ConfirmedSalesOrder.find({ customer_id: customerId })
      .populate('customer_id', 'name email mobile_number')
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Get customer confirmed sales orders error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch confirmed sales orders' });
  }
});

// Get confirmed sales order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await ConfirmedSalesOrder.findById(req.params.id)
      .populate('customer_id', 'name email mobile_number')
      .populate('created_by', 'name email');

    if (!order) {
      return res.status(404).json({ error: 'Confirmed sales order not found' });
    }

    const user = await User.findById(req.userId);
    // Non-admin users can only see their own orders
    if (user.role !== 'admin' && order.customer_id._id.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get confirmed sales order error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch confirmed sales order' });
  }
});

// Create confirmed sales order (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    console.log('Creating confirmed sales order:', req.body);
    
    // If customer_id is not provided, find customer by seller_name
    let customerId = req.body.customer_id;
    if (!customerId && req.body.seller_name) {
      const customer = await User.findOne({ 
        name: req.body.seller_name,
        role: { $ne: 'admin' }
      });
      if (!customer) {
        return res.status(404).json({ error: `Customer not found with seller name: ${req.body.seller_name}` });
      }
      customerId = customer._id;
    }
    
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID or Seller Name is required' });
    }

    const orderData = {
      ...req.body,
      customer_id: customerId,
      created_by: req.userId
    };

    // Calculate total deduction
    const otherDeductionsTotal = (orderData.other_deductions || []).reduce((sum, ded) => sum + (ded.amount || 0), 0);
    const totalDeduction = 
      (orderData.deduction_amount_hlw || 0) +
      (orderData.deduction_amount_moi_bdoi || 0) +
      otherDeductionsTotal;

    // Calculate net amount
    orderData.total_deduction = totalDeduction;
    orderData.net_amount = (orderData.gross_amount || 0) - totalDeduction;

    const order = new ConfirmedSalesOrder(orderData);
    await order.save();
    await order.populate('customer_id', 'name email mobile_number');
    await order.populate('created_by', 'name email');
    res.status(201).json(order);
  } catch (error) {
    console.error('Create confirmed sales order error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Invoice number already exists' });
    }
    res.status(500).json({ error: error.message || 'Failed to create confirmed sales order' });
  }
});

// Update confirmed sales order (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const order = await ConfirmedSalesOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Confirmed sales order not found' });
    }

    // Recalculate deductions if amounts changed
    if (req.body.gross_amount !== undefined || 
        req.body.deduction_amount_hlw !== undefined ||
        req.body.deduction_amount_moi_bdoi !== undefined ||
        req.body.other_deductions !== undefined) {
      const otherDeductions = req.body.other_deductions !== undefined ? req.body.other_deductions : (order.other_deductions || []);
      const otherDeductionsTotal = otherDeductions.reduce((sum, ded) => sum + (ded.amount || 0), 0);
      
      const totalDeduction = 
        (req.body.deduction_amount_hlw !== undefined ? req.body.deduction_amount_hlw : (order.deduction_amount_hlw || 0)) +
        (req.body.deduction_amount_moi_bdoi !== undefined ? req.body.deduction_amount_moi_bdoi : (order.deduction_amount_moi_bdoi || 0)) +
        otherDeductionsTotal;

      const grossAmount = req.body.gross_amount !== undefined ? req.body.gross_amount : order.gross_amount;
      req.body.total_deduction = totalDeduction;
      req.body.net_amount = grossAmount - totalDeduction;
    }

    const updatedOrder = await ConfirmedSalesOrder.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('customer_id', 'name email mobile_number')
      .populate('created_by', 'name email');

    res.json(updatedOrder);
  } catch (error) {
    console.error('Update confirmed sales order error:', error);
    res.status(500).json({ error: error.message || 'Failed to update confirmed sales order' });
  }
});

// Delete confirmed sales order (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const order = await ConfirmedSalesOrder.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Confirmed sales order not found' });
    }
    res.json({ message: 'Confirmed sales order deleted successfully' });
  } catch (error) {
    console.error('Delete confirmed sales order error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete confirmed sales order' });
  }
});

// Bulk upload confirmed sales orders from CSV/Excel (admin only)
router.post('/bulk-upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse the file
    const records = parseFile(req.file.buffer, req.file.originalname);
    
    if (!records || records.length === 0) {
      return res.status(400).json({ error: 'File is empty or invalid' });
    }

    // Fetch master data for validation
    const [commodities, varieties, warehouses, allCustomers] = await Promise.all([
      CommodityMaster.find({ is_active: true }),
      VarietyMaster.find({ is_active: true }),
      WarehouseMaster.find({ is_active: true }),
      User.find({ role: { $ne: 'admin' } })
    ]);

    const validCommodities = new Set(commodities.map(c => c.name));
    const validVarieties = new Map(); // commodity -> Set of varieties
    varieties.forEach(v => {
      if (!validVarieties.has(v.commodity_name)) {
        validVarieties.set(v.commodity_name, new Set());
      }
      validVarieties.get(v.commodity_name).add(v.variety_name);
    });
    const validWarehouses = new Set(warehouses.map(w => w.name));
    const validStates = new Set([
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
      'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
      'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
      'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
      'Andaman and Nicobar Islands', 'Chandigarh', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
    ]);
    const validLocations = new Set([
      'GULABBAGH', 'BUXAR', 'PATNA', 'MUZAFFARPUR', 'GAYA', 'BHAGALPUR',
      'PURNIA', 'DARBHANGA', 'SARAN', 'SIWAN', 'VAISHALI', 'SAMASTIPUR'
    ]);
    const validSellerNames = new Set(allCustomers.map(c => c.name));

    // Transform and validate records
    const orders = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

      try {
        // Map CSV/Excel columns to order fields - ALL FIELDS MANUAL, NO AUTO-CALCULATION
        // Parse date - handle DD/MM/YY format
        let transactionDate = record['Date of Transaction'] || record.transaction_date || record['Transaction Date'] || record['Date'] || '';
        if (transactionDate && transactionDate.includes('/')) {
          // Convert DD/MM/YY to YYYY-MM-DD
          const parts = transactionDate.split('/');
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
            transactionDate = `${year}-${month}-${day}`;
          }
        }
        if (!transactionDate) {
          transactionDate = new Date().toISOString().split('T')[0];
        }

        // Parse other deductions from columns Other Deduction 1-9 with remarks
        const otherDeductions = [];
        for (let j = 1; j <= 9; j++) {
          const dedAmount = record[`Other Deduction ${j}`] || record[`other_deduction_${j}`] || '';
          const dedRemarks = record[`Other Deduction ${j} Remarks`] || record[`other_deduction_${j}_remarks`] || '';
          
          if (dedAmount && dedAmount !== '-' && dedAmount !== 'Not Available' && dedAmount.trim() !== '') {
            const amount = parseFloat(dedAmount) || 0;
            if (amount > 0) {
              otherDeductions.push({
                amount: amount,
                remarks: dedRemarks || ''
              });
            }
          }
        }

        // Helper function to parse numeric values, handling "Not Available", "-", etc.
        const parseNumeric = (value, defaultValue = 0) => {
          if (!value || value === '-' || value === 'Not Available' || value === 'Not Applicable' || String(value).trim() === '') {
            return defaultValue;
          }
          const parsed = parseFloat(value);
          return isNaN(parsed) ? defaultValue : parsed;
        };

        // Get customer from CSV - Customer column or Seller Name column
        const customerName = record['Customer'] || record.customer || record['Seller Name'] || record.seller_name || record['Seller'] || '';
        if (!customerName) {
          errors.push(`Row ${rowNum}: Customer is required. Please specify Customer in the CSV.`);
          continue;
        }

        // Find customer by name
        const customer = allCustomers.find(c => c.name === customerName);
        if (!customer) {
          errors.push(`Row ${rowNum}: Customer "${customerName}" not found. Please use a valid customer name.`);
          continue;
        }

        // Validate against master data
        const state = record['State'] || record.state || '';
        const sellerName = record['Seller Name'] || record.seller_name || record['Seller'] || customerName;
        const location = record['Location'] || record.location || '';
        const warehouseName = record['Warehouse Name'] || record.warehouse_name || record['Warehouse'] || '';
        const commodity = record['Commodity'] || record.commodity || 'Paddy';
        const variety = record['Variety'] || record.variety || '';

        // Validate state
        if (state && !validStates.has(state)) {
          errors.push(`Row ${rowNum}: Invalid state "${state}". Must be one of the valid Indian states.`);
        }

        // Validate seller name matches customer
        if (sellerName && sellerName !== customerName) {
          errors.push(`Row ${rowNum}: Seller Name "${sellerName}" does not match Customer "${customerName}". Seller Name must be the same as Customer.`);
        }

        // Validate location
        if (location && !validLocations.has(location.toUpperCase())) {
          errors.push(`Row ${rowNum}: Invalid location "${location}". Must be from the valid locations list.`);
        }

        // Validate warehouse
        if (warehouseName && !validWarehouses.has(warehouseName)) {
          errors.push(`Row ${rowNum}: Invalid warehouse "${warehouseName}". Must be from the warehouse master list.`);
        }

        // Validate commodity
        if (commodity && !validCommodities.has(commodity)) {
          errors.push(`Row ${rowNum}: Invalid commodity "${commodity}". Must be from the commodity master list.`);
        }

        // Validate variety (if provided and commodity is valid)
        if (variety && commodity && validCommodities.has(commodity)) {
          const commodityVarieties = validVarieties.get(commodity);
          if (commodityVarieties && !commodityVarieties.has(variety)) {
            errors.push(`Row ${rowNum}: Invalid variety "${variety}" for commodity "${commodity}". Must be from the variety master list for this commodity.`);
          }
        }

        const orderData = {
          customer_id: customer._id,
          invoice_number: record['Invoice Number'] || record.invoice_number || record['Invoice No'] || `INV-${Date.now()}-${i}`,
          transaction_date: transactionDate,
          state: state,
          seller_name: sellerName,
          location: location,
          warehouse_name: warehouseName,
          chamber_no: record['Chamber No.'] || record['Chamber No'] || record.chamber_no || record['Chamber'] || '',
          commodity: commodity,
          variety: variety,
          gate_pass_no: record['Gate Pass No.'] || record['Gate Pass No'] || record.gate_pass_no || record['Gate Pass'] || '',
          vehicle_no: record['Vehicle No.'] || record['Vehicle No'] || record.vehicle_no || record['Vehicle Number'] || record['Truck No'] || '',
          weight_slip_no: record['Weight Slip No.'] || record['Weight Slip No'] || record.weight_slip_no || record['Weight Slip'] || '',
          gross_weight_mt: parseNumeric(record['Gross Weight in MT (Vehicle + Goods)'] || record['Gross Weight (MT)'] || record.gross_weight_mt || record['Gross Weight']),
          tare_weight_mt: parseNumeric(record['Tare Weight of Vehicle'] || record['Tare Weight (MT)'] || record.tare_weight_mt || record['Tare Weight']),
          no_of_bags: parseInt(record['No. of Bags'] || record['No of Bags'] || record.no_of_bags || record['Bags'] || 0),
          net_weight_mt: parseNumeric(record['Net Weight in MT'] || record['Net Weight (MT)'] || record.net_weight_mt || record['Net Weight']),
          rate_per_mt: parseNumeric(record['Rate Per MT'] || record['Rate per MT'] || record.rate_per_mt || record['Rate']),
          gross_amount: parseNumeric(record['Gross Amount'] || record.gross_amount),
          // Quality parameters - all manual
          hlw_wheat: parseNumeric(record['HLW (Hectolitre Weight) in Wheat'] || record['HLW'] || record.hlw_wheat || record['Hectolitre Weight']),
          excess_hlw: parseNumeric(record['Excess HLW'] || record.excess_hlw),
          deduction_amount_hlw: parseNumeric(record['Deduction Amount Rs. (HLW)'] || record['Deduction Amount HLW'] || record.deduction_amount_hlw),
          moisture_moi: parseNumeric(record['Moisture (MOI)'] || record['Moisture'] || record.moisture_moi),
          excess_moisture: parseNumeric(record['Excess Moisture'] || record.excess_moisture),
          bdoi: parseNumeric(record['Broken, Damage, Discolour, Immature (BDOI)'] || record['BDOI'] || record.bdoi),
          excess_bdoi: parseNumeric(record['Excess BDOI'] || record.excess_bdoi),
          moi_bdoi: parseNumeric(record['MOI+BDOI'] || record.moi_bdoi),
          weight_deduction_kg: parseNumeric(record['Weight Deduction in KG (MOI+BDOI)'] || record['Weight Deduction (KG)'] || record.weight_deduction_kg),
          deduction_amount_moi_bdoi: parseNumeric(record['Deduction Amount Rs. (MOI+BDOI)'] || record['Deduction Amount MOI+BDOI'] || record.deduction_amount_moi_bdoi),
          other_deductions: otherDeductions,
          quality_report: {},
          delivery_location: record['Delivery Location'] || record.delivery_location || '',
          remarks: record['Remarks'] || record.remarks || '',
          // Net Amount and Total Deduction - take from CSV, do not calculate
          net_amount: parseNumeric(record['Net Amount'] || record.net_amount),
          total_deduction: parseNumeric(record['Total Deduction'] || record.total_deduction, 
            parseNumeric(record['Deduction Amount Rs. (HLW)'] || record.deduction_amount_hlw) +
            parseNumeric(record['Deduction Amount Rs. (MOI+BDOI)'] || record.deduction_amount_moi_bdoi) +
            otherDeductions.reduce((sum, ded) => sum + (ded.amount || 0), 0)
          ),
          created_by: req.userId
        };

        // Validate required fields
        if (!orderData.vehicle_no) {
          errors.push(`Row ${rowNum}: Vehicle number is required`);
          continue;
        }
        if (!orderData.net_weight_mt || orderData.net_weight_mt <= 0) {
          errors.push(`Row ${rowNum}: Net weight must be greater than 0`);
          continue;
        }
        if (!orderData.rate_per_mt || orderData.rate_per_mt <= 0) {
          errors.push(`Row ${rowNum}: Rate per MT must be greater than 0`);
          continue;
        }

        orders.push(orderData);
      } catch (error) {
        errors.push(`Row ${rowNum}: ${error.message}`);
      }
    }

    if (orders.length === 0) {
      return res.status(400).json({ 
        error: 'No valid orders found in file',
        errors: errors
      });
    }

    // Insert orders
    const savedOrders = await ConfirmedSalesOrder.insertMany(orders, { ordered: false });
    
    res.json({
      success: true,
      message: `Successfully uploaded ${savedOrders.length} confirmed sales orders`,
      count: savedOrders.length,
      errors: errors.length > 0 ? errors : undefined,
      orders: savedOrders
    });
  } catch (error) {
    console.error('Bulk upload confirmed sales orders error:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message || 'Failed to process file'
    });
  }
});

export default router;

