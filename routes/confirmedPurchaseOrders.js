import express from 'express';
import ConfirmedPurchaseOrder from '../models/ConfirmedPurchaseOrder.js';
import User from '../models/User.js';
import CommodityMaster from '../models/CommodityMaster.js';
import VarietyMaster from '../models/VarietyMaster.js';
import WarehouseMaster from '../models/WarehouseMaster.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { parseFile } from '../utils/csvParser.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all confirmed purchase orders (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const orders = await ConfirmedPurchaseOrder.find()
      .populate('customer_id', 'name email mobile_number')
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Get confirmed purchase orders error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch confirmed purchase orders' });
  }
});

// Get confirmed purchase orders for a specific customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const { customerId } = req.params;

    // Non-admin users can only see their own orders
    if (user.role !== 'admin' && customerId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const orders = await ConfirmedPurchaseOrder.find({ customer_id: customerId })
      .populate('customer_id', 'name email mobile_number')
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Get customer confirmed purchase orders error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch confirmed purchase orders' });
  }
});

// Get confirmed purchase order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await ConfirmedPurchaseOrder.findById(req.params.id)
      .populate('customer_id', 'name email mobile_number')
      .populate('created_by', 'name email');

    if (!order) {
      return res.status(404).json({ error: 'Confirmed purchase order not found' });
    }

    const user = await User.findById(req.userId);
    // Non-admin users can only see their own orders
    if (user.role !== 'admin' && order.customer_id._id.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get confirmed purchase order error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch confirmed purchase order' });
  }
});

// Create confirmed purchase order (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    console.log('Creating confirmed purchase order:', req.body);
    
    // If customer_id is not provided, find customer by supplier_name
    let customerId = req.body.customer_id;
    if (!customerId && req.body.supplier_name) {
      const customer = await User.findOne({ 
        name: req.body.supplier_name,
        role: { $ne: 'admin' }
      });
      if (!customer) {
        return res.status(404).json({ error: `Customer not found with supplier name: ${req.body.supplier_name}` });
      }
      customerId = customer._id;
    }
    
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID or Supplier Name is required' });
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
      (orderData.deduction_amount_moi_bddi || 0) +
      otherDeductionsTotal;

    // Calculate net amount
    orderData.total_deduction = totalDeduction;
    orderData.net_amount = (orderData.gross_amount || 0) - totalDeduction;

    const order = new ConfirmedPurchaseOrder(orderData);
    await order.save();
    await order.populate('customer_id', 'name email mobile_number');
    await order.populate('created_by', 'name email');
    res.status(201).json(order);
  } catch (error) {
    console.error('Create confirmed purchase order error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Invoice number already exists' });
    }
    res.status(500).json({ error: error.message || 'Failed to create confirmed purchase order' });
  }
});

// Update confirmed purchase order (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const order = await ConfirmedPurchaseOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Confirmed purchase order not found' });
    }

    // Recalculate deductions if amounts changed
    if (req.body.gross_amount !== undefined || 
        req.body.deduction_amount_hlw !== undefined ||
        req.body.deduction_amount_moi_bddi !== undefined ||
        req.body.other_deductions !== undefined) {
      const otherDeductions = req.body.other_deductions !== undefined ? req.body.other_deductions : (order.other_deductions || []);
      const otherDeductionsTotal = otherDeductions.reduce((sum, ded) => sum + (ded.amount || 0), 0);
      
      const totalDeduction = 
        (req.body.deduction_amount_hlw !== undefined ? req.body.deduction_amount_hlw : (order.deduction_amount_hlw || 0)) +
        (req.body.deduction_amount_moi_bddi !== undefined ? req.body.deduction_amount_moi_bddi : (order.deduction_amount_moi_bddi || 0)) +
        otherDeductionsTotal;

      const grossAmount = req.body.gross_amount !== undefined ? req.body.gross_amount : order.gross_amount;
      req.body.total_deduction = totalDeduction;
      req.body.net_amount = grossAmount - totalDeduction;
    }

    const updatedOrder = await ConfirmedPurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('customer_id', 'name email mobile_number')
      .populate('created_by', 'name email');

    res.json(updatedOrder);
  } catch (error) {
    console.error('Update confirmed purchase order error:', error);
    res.status(500).json({ error: error.message || 'Failed to update confirmed purchase order' });
  }
});

// Delete confirmed purchase order (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const order = await ConfirmedPurchaseOrder.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Confirmed purchase order not found' });
    }
    res.json({ message: 'Confirmed purchase order deleted successfully' });
  } catch (error) {
    console.error('Delete confirmed purchase order error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete confirmed purchase order' });
  }
});

// Bulk upload confirmed purchase orders from CSV/Excel (admin only)
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
    const validSupplierNames = new Set(allCustomers.map(c => c.name));

    // Transform and validate records
    const orders = [];
    const errors = [];
    const warnings = []; // For non-blocking validation warnings

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

        // Parse other deductions from columns Other Deduction 1-10 (no separate remarks columns in new CSV format)
        const otherDeductions = [];
        for (let j = 1; j <= 10; j++) {
          const dedAmount = record[`Other Deduction ${j}`] || record[`other_deduction_${j}`] || '';
          
          if (dedAmount && dedAmount !== '-' && dedAmount !== 'Not Available' && dedAmount.trim() !== '') {
            const amount = parseFloat(dedAmount) || 0;
            if (amount > 0) {
              otherDeductions.push({
                amount: amount,
                remarks: '' // No separate remarks column in new CSV format
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

        // Get customer from CSV - Supplier Name column (new CSV format doesn't have separate Customer column)
        const supplierName = record['Supplier Name'] || record.supplier_name || record['Supplier'] || record['Customer'] || record.customer || '';
        if (!supplierName) {
          errors.push(`Row ${rowNum}: Supplier Name is required. Please specify Supplier Name in the CSV.`);
          continue;
        }

        // Find customer by name (Supplier Name = Customer Name in purchase orders)
        // For testing: Create customer if not found, or use first available customer
        let customer = allCustomers.find(c => c.name === supplierName);
        if (!customer) {
          // For testing: Use first available customer or create a note
          if (allCustomers.length > 0) {
            customer = allCustomers[0];
            warnings.push(`Row ${rowNum}: Supplier Name "${supplierName}" not found. Using "${customer.name}" for testing.`);
          } else {
            errors.push(`Row ${rowNum}: No customers found in system. Please create at least one customer first.`);
            continue;
          }
        }

        // Validate against master data (warnings only for testing, not blocking)
        const state = record['State'] || record.state || '';
        const location = record['Location'] || record.location || '';
        const warehouseName = record['Warehouse Name'] || record.warehouse_name || record['Warehouse'] || '';
        const commodity = record['Commodity'] || record.commodity || 'Paddy';
        const variety = record['Variety'] || record.variety || '';

        // Validate state (warning only, not blocking)
        if (state && !validStates.has(state)) {
          warnings.push(`Row ${rowNum}: State "${state}" not in master list (using as-is for testing)`);
        }

        // Validate location (warning only, not blocking)
        if (location && !validLocations.has(location.toUpperCase())) {
          warnings.push(`Row ${rowNum}: Location "${location}" not in master list (using as-is for testing)`);
        }

        // Validate warehouse (warning only, not blocking)
        if (warehouseName && !validWarehouses.has(warehouseName)) {
          warnings.push(`Row ${rowNum}: Warehouse "${warehouseName}" not in master list (using as-is for testing)`);
        }

        // Validate commodity (warning only, not blocking)
        if (commodity && !validCommodities.has(commodity)) {
          warnings.push(`Row ${rowNum}: Commodity "${commodity}" not in master list (using as-is for testing)`);
        }

        // Validate variety (warning only, not blocking)
        if (variety && commodity && validCommodities.has(commodity)) {
          const commodityVarieties = validVarieties.get(commodity);
          if (commodityVarieties && !commodityVarieties.has(variety)) {
            warnings.push(`Row ${rowNum}: Variety "${variety}" not in master list for "${commodity}" (using as-is for testing)`);
          }
        }

        const orderData = {
          customer_id: customer._id,
          invoice_number: record['Invoice Number'] || record.invoice_number || record['Invoice No'] || `INV-${Date.now()}-${i}`,
          transaction_date: transactionDate,
          state: state,
          supplier_name: supplierName,
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
          bddi: parseNumeric(record['Broken, Damage, Discolour, Immature (BDDI)'] || record['BDDI'] || record.bddi),
          excess_bddi: parseNumeric(record['Excess BDDI'] || record.excess_bddi),
          moi_bddi: parseNumeric(record['MOI+BDDI'] || record.moi_bddi),
          weight_deduction_kg: parseNumeric(record['Weight Deduction in KG'] || record['Weight Deduction in KG (MOI+BDDI)'] || record['Weight Deduction (KG)'] || record.weight_deduction_kg),
          deduction_amount_moi_bddi: parseNumeric(record['Deduction Amount Rs. (MOI+BDDI)'] || record['Deduction Amount MOI+BDDI'] || record.deduction_amount_moi_bddi),
          other_deductions: otherDeductions,
          quality_report: {},
          delivery_location: record['Delivery Location'] || record.delivery_location || '',
          remarks: record['Remarks'] || record.remarks || '',
          // Net Amount and Total Deduction - take from CSV, do not calculate
          net_amount: parseNumeric(record['Net Amount'] || record.net_amount),
          total_deduction: parseNumeric(record['Total Deduction'] || record.total_deduction,
            parseNumeric(record['Deduction Amount Rs. (HLW)'] || record.deduction_amount_hlw) +
            parseNumeric(record['Deduction Amount Rs. (MOI+BDDI)'] || record.deduction_amount_moi_bddi) +
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
        errors: errors,
        warnings: warnings.length > 0 ? warnings : undefined
      });
    }

    // Insert orders
    const savedOrders = await ConfirmedPurchaseOrder.insertMany(orders, { ordered: false });
    
    res.json({
      success: true,
      message: `Successfully uploaded ${savedOrders.length} confirmed purchase orders`,
      count: savedOrders.length,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      orders: savedOrders
    });
  } catch (error) {
    console.error('Bulk upload confirmed purchase orders error:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message || 'Failed to process file'
    });
  }
});

export default router;

