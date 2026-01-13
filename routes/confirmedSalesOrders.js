import express from 'express';
import ConfirmedSalesOrder from '../models/ConfirmedSalesOrder.js';
import User from '../models/User.js';
import CommodityMaster from '../models/CommodityMaster.js';
import VarietyMaster from '../models/VarietyMaster.js';
import WarehouseMaster from '../models/WarehouseMaster.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { parseFile } from '../utils/csvParser.js';
import { getMappedValue, parseDate, parseNumeric, toNA, getAvailableColumns } from '../utils/columnMapper.js';

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

// Get available columns from uploaded file (for column mapping UI)
router.post('/bulk-upload/preview', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse the file
    const records = parseFile(req.file.buffer, req.file.originalname);
    
    if (!records || records.length === 0) {
      return res.status(400).json({ error: 'File is empty or invalid' });
    }

    // Get available columns and first few rows for preview
    const columns = getAvailableColumns(records);
    const previewRows = records.slice(0, 5); // First 5 rows for preview

    res.json({
      success: true,
      columns: columns,
      previewRows: previewRows,
      totalRows: records.length
    });
  } catch (error) {
    console.error('Preview file error:', error);
    res.status(500).json({ 
      error: 'Preview failed',
      message: error.message || 'Failed to preview file'
    });
  }
});

// Bulk upload confirmed sales orders from CSV/Excel (admin only)
router.post('/bulk-upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse column mappings from request body (if provided)
    let columnMapping = {};
    try {
      if (req.body.columnMapping) {
        columnMapping = typeof req.body.columnMapping === 'string' 
          ? JSON.parse(req.body.columnMapping) 
          : req.body.columnMapping;
      }
    } catch (e) {
      console.warn('Failed to parse column mapping, using defaults:', e.message);
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
        // Map CSV/Excel columns to order fields using column mapping or fallback to default names
        // Parse date using column mapping
        const transactionDateValue = getMappedValue(
          record,
          columnMapping.transaction_date,
          ['Date of Transaction', 'transaction_date', 'Transaction Date', 'Date'],
          ''
        );
        const transactionDate = parseDate(transactionDateValue);

        // Parse other deductions from columns Other Deduction 1-9 with remarks
        const otherDeductions = [];
        for (let j = 1; j <= 9; j++) {
          const dedMappingKey = `other_deduction_${j}`;
          const dedAmount = getMappedValue(
            record,
            columnMapping[dedMappingKey],
            [`Other Deduction ${j}`, `other_deduction_${j}`],
            ''
          );
          const dedRemarksMappingKey = `other_deduction_${j}_remarks`;
          const dedRemarks = getMappedValue(
            record,
            columnMapping[dedRemarksMappingKey],
            [`Other Deduction ${j} Remarks`, `other_deduction_${j}_remarks`],
            ''
          );
          
          if (dedAmount && dedAmount !== '-' && dedAmount !== 'Not Available' && String(dedAmount).trim() !== '') {
            const amount = parseNumeric(dedAmount);
            if (amount > 0) {
              otherDeductions.push({
                amount: amount,
                remarks: dedRemarks || ''
              });
            }
          }
        }

        // Get customer from CSV - Customer column or Seller Name column
        const customerName = toNA(getMappedValue(
          record,
          columnMapping.customer_name || columnMapping.seller_name,
          ['Customer', 'customer', 'Seller Name', 'seller_name', 'Seller'],
          ''
        ));
        
        if (!customerName || customerName === 'N/A') {
          errors.push(`Row ${rowNum}: Customer is required. Please specify Customer in the CSV.`);
          continue;
        }

        // Find customer by name
        const customer = allCustomers.find(c => c.name === customerName);
        if (!customer) {
          errors.push(`Row ${rowNum}: Customer "${customerName}" not found. Please use a valid customer name.`);
          continue;
        }

        // Get all fields from CSV using column mapping with fallbacks
        const state = toNA(getMappedValue(record, columnMapping.state, ['State', 'state'], ''));
        const sellerName = toNA(getMappedValue(record, columnMapping.seller_name, ['Seller Name', 'seller_name', 'Seller', 'Customer', 'customer'], customerName));
        const location = toNA(getMappedValue(record, columnMapping.location, ['Location', 'location'], ''));
        const warehouseName = toNA(getMappedValue(record, columnMapping.warehouse_name, ['Warehouse Name', 'warehouse_name', 'Warehouse'], ''));
        const commodity = toNA(getMappedValue(record, columnMapping.commodity, ['Commodity', 'commodity'], 'Paddy'));
        const variety = toNA(getMappedValue(record, columnMapping.variety, ['Variety', 'variety'], ''));

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
          invoice_number: toNA(getMappedValue(record, columnMapping.invoice_number, ['Invoice Number', 'invoice_number', 'Invoice No'], `INV-${Date.now()}-${i}`)),
          transaction_date: transactionDate,
          state: state,
          seller_name: sellerName,
          location: location,
          warehouse_name: warehouseName,
          chamber_no: toNA(getMappedValue(record, columnMapping.chamber_no, ['Chamber No.', 'Chamber No', 'chamber_no', 'Chamber'], '')),
          commodity: commodity,
          variety: variety,
          gate_pass_no: toNA(getMappedValue(record, columnMapping.gate_pass_no, ['Gate Pass No.', 'Gate Pass No', 'gate_pass_no', 'Gate Pass'], '')),
          vehicle_no: toNA(getMappedValue(record, columnMapping.vehicle_no, ['Vehicle No.', 'Vehicle No', 'vehicle_no', 'Vehicle Number', 'Truck No'], '')),
          weight_slip_no: toNA(getMappedValue(record, columnMapping.weight_slip_no, ['Weight Slip No.', 'Weight Slip No', 'weight_slip_no', 'Weight Slip'], '')),
          gross_weight_mt: parseNumeric(getMappedValue(record, columnMapping.gross_weight_mt, ['Gross Weight in MT (Vehicle + Goods)', 'Gross Weight (MT)', 'gross_weight_mt', 'Gross Weight'], 0)),
          tare_weight_mt: parseNumeric(getMappedValue(record, columnMapping.tare_weight_mt, ['Tare Weight of Vehicle', 'Tare Weight (MT)', 'tare_weight_mt', 'Tare Weight'], 0)),
          no_of_bags: parseInt(getMappedValue(record, columnMapping.no_of_bags, ['No. of Bags', 'No of Bags', 'no_of_bags', 'Bags'], 0) || 0),
          net_weight_mt: parseNumeric(getMappedValue(record, columnMapping.net_weight_mt, ['Net Weight in MT', 'Net Weight (MT)', 'net_weight_mt', 'Net Weight'], 0)),
          rate_per_mt: parseNumeric(getMappedValue(record, columnMapping.rate_per_mt, ['Rate Per MT', 'Rate per MT', 'rate_per_mt', 'Rate'], 0)),
          gross_amount: parseNumeric(getMappedValue(record, columnMapping.gross_amount, ['Gross Amount', 'gross_amount'], 0)),
          // Quality parameters
          hlw_wheat: parseNumeric(getMappedValue(record, columnMapping.hlw_wheat, ['HLW (Hectolitre Weight) in Wheat', 'HLW', 'hlw_wheat', 'Hectolitre Weight'], 0)),
          excess_hlw: parseNumeric(getMappedValue(record, columnMapping.excess_hlw, ['Excess HLW', 'excess_hlw'], 0)),
          deduction_amount_hlw: parseNumeric(getMappedValue(record, columnMapping.deduction_amount_hlw, ['Deduction Amount Rs. (HLW)', 'Deduction Amount HLW', 'deduction_amount_hlw'], 0)),
          moisture_moi: parseNumeric(getMappedValue(record, columnMapping.moisture_moi, ['Moisture (MOI)', 'Moisture', 'moisture_moi'], 0)),
          excess_moisture: parseNumeric(getMappedValue(record, columnMapping.excess_moisture, ['Excess Moisture', 'excess_moisture'], 0)),
          bdoi: parseNumeric(getMappedValue(record, columnMapping.bdoi, ['Broken, Damage, Discolour, Immature (BDOI)', 'BDOI', 'bdoi'], 0)),
          excess_bdoi: parseNumeric(getMappedValue(record, columnMapping.excess_bdoi, ['Excess BDOI', 'excess_bdoi'], 0)),
          moi_bdoi: parseNumeric(getMappedValue(record, columnMapping.moi_bdoi, ['MOI+BDOI', 'moi_bdoi'], 0)),
          weight_deduction_kg: parseNumeric(getMappedValue(record, columnMapping.weight_deduction_kg, ['Weight Deduction in KG (MOI+BDOI)', 'Weight Deduction (KG)', 'weight_deduction_kg'], 0)),
          deduction_amount_moi_bdoi: parseNumeric(getMappedValue(record, columnMapping.deduction_amount_moi_bdoi, ['Deduction Amount Rs. (MOI+BDOI)', 'Deduction Amount MOI+BDOI', 'deduction_amount_moi_bdoi'], 0)),
          other_deductions: otherDeductions,
          quality_report: {},
          delivery_location: toNA(getMappedValue(record, columnMapping.delivery_location, ['Delivery Location', 'delivery_location'], '')),
          remarks: toNA(getMappedValue(record, columnMapping.remarks, ['Remarks', 'remarks'], '')),
          // Net Amount and Total Deduction - take from CSV, do not calculate
          net_amount: parseNumeric(getMappedValue(record, columnMapping.net_amount, ['Net Amount', 'net_amount'], 0)),
          created_by: req.userId
        };

        // Calculate total deduction if not provided
        const mappedTotalDeduction = parseNumeric(getMappedValue(record, columnMapping.total_deduction, ['Total Deduction', 'total_deduction'], null));
        if (mappedTotalDeduction !== null && mappedTotalDeduction !== 0) {
          orderData.total_deduction = mappedTotalDeduction;
        } else {
          orderData.total_deduction = orderData.deduction_amount_hlw + orderData.deduction_amount_moi_bdoi + 
            otherDeductions.reduce((sum, ded) => sum + (ded.amount || 0), 0);
        }

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

