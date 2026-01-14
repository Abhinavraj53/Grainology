import express from 'express';
import ConfirmedPurchaseOrder from '../models/ConfirmedPurchaseOrder.js';
import User from '../models/User.js';
import CommodityMaster from '../models/CommodityMaster.js';
import VarietyMaster from '../models/VarietyMaster.js';
import WarehouseMaster from '../models/WarehouseMaster.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { parseFile } from '../utils/csvParser.js';
import { getMappedValue, parseDate, parseNumeric, toNA, getAvailableColumns } from '../utils/columnMapper.js';

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

// Bulk upload confirmed purchase orders from CSV/Excel (admin only)
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
    const validSupplierNames = new Set(allCustomers.map(c => c.name));

    // Transform and validate records - PRESERVE ALL ROWS IN ORIGINAL ORDER
    const orders = [];
    const errors = [];
    const warnings = []; // For non-blocking validation warnings
    const skippedRows = []; // Track skipped rows

    // Helper function to convert empty/blank values to "N/A"
    const toNA = (value) => {
      if (value === null || value === undefined || value === '' || value === '-' || value === 'Not Available' || String(value).trim() === '') {
        return 'N/A';
      }
      return String(value).trim();
    };

    // Helper function to sanitize numeric fields in an order object (prevent NaN)
    const sanitizeNumericFields = (order) => {
      const numericFields = [
        'gross_weight_mt', 'tare_weight_mt', 'no_of_bags', 'net_weight_mt', 'rate_per_mt', 'gross_amount',
        'hlw_wheat', 'excess_hlw', 'deduction_amount_hlw', 'moisture_moi', 'excess_moisture',
        'bddi', 'excess_bddi', 'moi_bddi', 'weight_deduction_kg', 'deduction_amount_moi_bddi',
        'net_amount', 'total_deduction'
      ];
      
      const sanitized = { ...order };
      numericFields.forEach(field => {
        if (sanitized[field] === null || sanitized[field] === undefined || isNaN(sanitized[field])) {
          sanitized[field] = 0;
        } else if (typeof sanitized[field] === 'string') {
          const parsed = parseFloat(sanitized[field]);
          sanitized[field] = isNaN(parsed) ? 0 : parsed;
        }
      });
      
      // Special handling for no_of_bags (must be integer)
      if (sanitized.no_of_bags !== undefined) {
        const bags = parseInt(sanitized.no_of_bags);
        sanitized.no_of_bags = isNaN(bags) ? 0 : bags;
      }
      
      return sanitized;
    };

    // Ensure we have at least one customer - create a fallback if needed
    let fallbackCustomer = allCustomers.length > 0 ? allCustomers[0] : null;
    if (!fallbackCustomer) {
      // Try to find any user (even admin) as fallback
      const anyUser = await User.findOne();
      if (anyUser) {
        fallbackCustomer = anyUser;
        warnings.push('No customers found. Using first available user as fallback.');
      } else {
        return res.status(400).json({ 
          error: 'No users found in system. Please create at least one user before uploading orders.' 
        });
      }
    }

    console.log(`Processing ${records.length} rows from file. Starting bulk upload...`);

    for (let i = 0; i < records.length; i++) {
      const record = records[i] || {}; // Handle undefined/null records
      const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

      // Process ALL rows - even if completely empty, create order with N/A values to preserve sequence
      // This ensures no rows are skipped and original order is maintained
      const hasData = record && Object.values(record).some(val => {
        if (val === null || val === undefined) return false;
        const str = String(val).trim();
        return str !== '' && str !== '-' && str !== 'N/A';
      });
      
      if (!hasData) {
        // Still create an order with N/A values to preserve sequence
        warnings.push(`Row ${rowNum}: Appears empty, but creating order with N/A values to preserve sequence`);
        // Continue to process this row with N/A values
      }

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

        // Parse other deductions from columns Other Deduction 1-10
        const otherDeductions = [];
        for (let j = 1; j <= 10; j++) {
          const dedMappingKey = `other_deduction_${j}`;
          const dedAmount = getMappedValue(
            record,
            columnMapping[dedMappingKey],
            [`Other Deduction ${j}`, `other_deduction_${j}`],
            ''
          );
          
          if (dedAmount && dedAmount !== '-' && dedAmount !== 'Not Available' && String(dedAmount).trim() !== '') {
            const amount = parseNumeric(dedAmount);
            if (amount > 0) {
              otherDeductions.push({
                amount: amount,
                remarks: '' // No separate remarks column in new CSV format
              });
            }
          }
        }

        // Get customer from CSV - Supplier Name column
        // ALWAYS use a customer - never skip rows due to customer lookup
        const supplierName = toNA(getMappedValue(
          record,
          columnMapping.supplier_name,
          ['Supplier Name', 'supplier_name', 'Supplier', 'Customer', 'customer'],
          'N/A'
        ));
        
        // Find customer by name, or use fallback customer - NEVER SKIP ROW
        let customer = allCustomers.find(c => c.name === supplierName);
        if (!customer) {
          // Always use fallback customer - never skip the row
          customer = fallbackCustomer;
          if (supplierName !== 'N/A') {
            warnings.push(`Row ${rowNum}: Supplier Name "${supplierName}" not found. Using "${customer.name}" instead.`);
          }
        }

        // Get all fields from CSV using column mapping with fallbacks
        const state = toNA(getMappedValue(record, columnMapping.state, ['State', 'state'], ''));
        const location = toNA(getMappedValue(record, columnMapping.location, ['Location', 'location'], ''));
        const warehouseName = toNA(getMappedValue(record, columnMapping.warehouse_name, ['Warehouse Name', 'warehouse_name', 'Warehouse'], ''));
        const commodity = toNA(getMappedValue(record, columnMapping.commodity, ['Commodity', 'commodity'], 'Paddy'));
        const variety = toNA(getMappedValue(record, columnMapping.variety, ['Variety', 'variety'], ''));

        // Create order data - preserve ALL data as-is from CSV, use N/A for blanks
        // Add row_sequence to preserve original order
        const orderData = {
          customer_id: customer._id,
          invoice_number: toNA(getMappedValue(
            record,
            columnMapping.invoice_number,
            ['Invoice Number', 'invoice_number', 'Invoice No'],
            `INV-${Date.now()}-${i}-${rowNum}`
          )),
          transaction_date: transactionDate,
          state: state,
          supplier_name: supplierName,
          location: location,
          warehouse_name: warehouseName,
          chamber_no: toNA(getMappedValue(record, columnMapping.chamber_no, ['Chamber No.', 'Chamber No', 'chamber_no', 'Chamber'], '')),
          commodity: commodity,
          variety: variety,
          gate_pass_no: toNA(getMappedValue(record, columnMapping.gate_pass_no, ['Gate Pass No.', 'Gate Pass No', 'gate_pass_no', 'Gate Pass'], '')),
          vehicle_no: toNA(getMappedValue(record, columnMapping.vehicle_no, ['Vehicle No.', 'Vehicle No', 'vehicle_no', 'Vehicle Number', 'Truck No'], `VEH-${rowNum}`)),
          weight_slip_no: toNA(getMappedValue(record, columnMapping.weight_slip_no, ['Weight Slip No.', 'Weight Slip No', 'weight_slip_no', 'Weight Slip'], '')),
          gross_weight_mt: parseNumeric(getMappedValue(record, columnMapping.gross_weight_mt, ['Gross Weight in MT (Vehicle + Goods)', 'Gross Weight (MT)', 'gross_weight_mt', 'Gross Weight'], 0)),
          tare_weight_mt: parseNumeric(getMappedValue(record, columnMapping.tare_weight_mt, ['Tare Weight of Vehicle', 'Tare Weight (MT)', 'tare_weight_mt', 'Tare Weight'], 0)),
          no_of_bags: (() => {
            const value = getMappedValue(record, columnMapping.no_of_bags, ['No. of Bags', 'No of Bags', 'no_of_bags', 'Bags'], 0);
            if (value === null || value === undefined || value === '' || value === '-' || value === 'Not Available' || String(value).trim() === '') {
              return 0;
            }
            const parsed = parseInt(value);
            return isNaN(parsed) ? 0 : parsed;
          })(),
          net_weight_mt: parseNumeric(getMappedValue(record, columnMapping.net_weight_mt, ['Net Weight in MT', 'Net Weight (MT)', 'net_weight_mt', 'Net Weight'], 0)),
          rate_per_mt: parseNumeric(getMappedValue(record, columnMapping.rate_per_mt, ['Rate Per MT', 'Rate per MT', 'rate_per_mt', 'Rate'], 0)),
          gross_amount: parseNumeric(getMappedValue(record, columnMapping.gross_amount, ['Gross Amount', 'gross_amount'], 0)),
          // Quality parameters
          hlw_wheat: parseNumeric(getMappedValue(record, columnMapping.hlw_wheat, ['HLW (Hectolitre Weight) in Wheat', 'HLW', 'hlw_wheat', 'Hectolitre Weight'], 0)),
          excess_hlw: parseNumeric(getMappedValue(record, columnMapping.excess_hlw, ['Excess HLW', 'excess_hlw'], 0)),
          deduction_amount_hlw: parseNumeric(getMappedValue(record, columnMapping.deduction_amount_hlw, ['Deduction Amount Rs. (HLW)', 'Deduction Amount HLW', 'deduction_amount_hlw'], 0)),
          moisture_moi: parseNumeric(getMappedValue(record, columnMapping.moisture_moi, ['Moisture (MOI)', 'Moisture', 'moisture_moi'], 0)),
          excess_moisture: parseNumeric(getMappedValue(record, columnMapping.excess_moisture, ['Excess Moisture', 'excess_moisture'], 0)),
          bddi: parseNumeric(getMappedValue(record, columnMapping.bddi, ['Broken, Damage, Discolour, Immature (BDDI)', 'BDDI', 'bddi'], 0)),
          excess_bddi: parseNumeric(getMappedValue(record, columnMapping.excess_bddi, ['Excess BDDI', 'excess_bddi'], 0)),
          moi_bddi: parseNumeric(getMappedValue(record, columnMapping.moi_bddi, ['MOI+BDDI', 'moi_bddi'], 0)),
          weight_deduction_kg: parseNumeric(getMappedValue(record, columnMapping.weight_deduction_kg, ['Weight Deduction in KG', 'Weight Deduction in KG (MOI+BDDI)', 'Weight Deduction (KG)', 'weight_deduction_kg'], 0)),
          deduction_amount_moi_bddi: parseNumeric(getMappedValue(record, columnMapping.deduction_amount_moi_bddi, ['Deduction Amount Rs. (MOI+BDDI)', 'Deduction Amount MOI+BDDI', 'deduction_amount_moi_bddi'], 0)),
          other_deductions: otherDeductions,
          quality_report: {},
          delivery_location: toNA(getMappedValue(record, columnMapping.delivery_location, ['Delivery Location', 'delivery_location'], '')),
          remarks: toNA(getMappedValue(record, columnMapping.remarks, ['Remarks', 'remarks'], '')),
          // Net Amount and Total Deduction - take from CSV, do not calculate
          net_amount: parseNumeric(getMappedValue(record, columnMapping.net_amount, ['Net Amount', 'net_amount'], 0)),
          created_by: req.userId,
          row_sequence: i, // Preserve original row order from CSV
          uploaded_at: new Date()
        };

        // Calculate total deduction - use mapped value if provided, otherwise calculate
        const mappedTotalDeduction = parseNumeric(getMappedValue(record, columnMapping.total_deduction, ['Total Deduction', 'total_deduction'], null));
        if (mappedTotalDeduction !== null && mappedTotalDeduction !== 0) {
          orderData.total_deduction = mappedTotalDeduction;
        } else {
          orderData.total_deduction = orderData.deduction_amount_hlw + orderData.deduction_amount_moi_bddi + 
            otherDeductions.reduce((sum, ded) => sum + (ded.amount || 0), 0);
        }

        // Ensure vehicle_no is never empty (required field)
        if (!orderData.vehicle_no || orderData.vehicle_no === 'N/A' || orderData.vehicle_no.trim() === '') {
          orderData.vehicle_no = `VEH-${rowNum}`;
        }
        
        // Sanitize all numeric fields to prevent NaN values
        const sanitizedOrder = sanitizeNumericFields(orderData);
        
        orders.push(sanitizedOrder);
      } catch (error) {
        // Log detailed error for debugging but STILL CREATE ORDER with N/A values
        console.error(`Error processing row ${rowNum}:`, error);
        errors.push(`Row ${rowNum}: ${error.message || 'Unknown error'} - Creating order with default values`);
        
        // Create a minimal order even on error to preserve sequence
        try {
          const errorOrderData = sanitizeNumericFields({
            customer_id: fallbackCustomer._id,
            invoice_number: `INV-ERROR-${Date.now()}-${i}-${rowNum}`,
            transaction_date: new Date().toISOString().split('T')[0],
            state: 'N/A',
            supplier_name: 'N/A',
            location: 'N/A',
            warehouse_name: 'N/A',
            chamber_no: 'N/A',
            commodity: 'N/A',
            variety: 'N/A',
            gate_pass_no: 'N/A',
            vehicle_no: `VEH-ERROR-${rowNum}`,
            weight_slip_no: 'N/A',
            gross_weight_mt: 0,
            tare_weight_mt: 0,
            no_of_bags: 0,
            net_weight_mt: 0,
            rate_per_mt: 0,
            gross_amount: 0,
            hlw_wheat: 0,
            excess_hlw: 0,
            deduction_amount_hlw: 0,
            moisture_moi: 0,
            excess_moisture: 0,
            bddi: 0,
            excess_bddi: 0,
            moi_bddi: 0,
            weight_deduction_kg: 0,
            deduction_amount_moi_bddi: 0,
            other_deductions: [],
            quality_report: {},
            delivery_location: 'N/A',
            remarks: `ERROR: ${error.message}`,
            net_amount: 0,
            total_deduction: 0,
            created_by: req.userId,
            row_sequence: i,
            uploaded_at: new Date()
          });
          orders.push(errorOrderData);
        } catch (fallbackError) {
          console.error(`Failed to create fallback order for row ${rowNum}:`, fallbackError);
          skippedRows.push(rowNum);
        }
      }
    }

    // Log summary before insertion
    console.log(`Processing ${records.length} rows: ${orders.length} orders prepared, ${errors.length} errors, ${skippedRows.length} skipped rows`);

    if (orders.length === 0) {
      return res.status(400).json({ 
        error: 'No orders could be created from file',
        errors: errors,
        warnings: warnings.length > 0 ? warnings : undefined,
        totalRows: records.length,
        skippedRows: skippedRows
      });
    }

    // Insert orders one by one to preserve order and track failures
    let savedOrders = [];
    let insertErrors = [];
    let successCount = 0;
    let failCount = 0;
    
    console.log(`Starting to insert ${orders.length} orders...`);
    
    // Insert in batches to preserve order and handle errors better
    const batchSize = 100;
    for (let batchStart = 0; batchStart < orders.length; batchStart += batchSize) {
      const batch = orders.slice(batchStart, batchStart + batchSize);
      
      try {
        // Try batch insert first (faster)
        const batchResult = await ConfirmedPurchaseOrder.insertMany(batch, { 
          ordered: false, // Continue on errors
          rawResult: false
        });
        
        savedOrders.push(...batchResult);
        successCount += batchResult.length;
        
        // Check if all documents were inserted - if not, some failed silently
        if (batchResult.length < batch.length) {
          const failedCount = batch.length - batchResult.length;
          console.log(`Batch ${Math.floor(batchStart / batchSize) + 1}: ${batchResult.length} inserted, ${failedCount} failed silently (likely duplicates or validation errors)`);
          
          // Find which ones failed by checking invoice numbers
          const insertedInvoiceNumbers = new Set(batchResult.map(doc => doc.invoice_number));
          
          // Try to insert the missing ones individually
          for (let j = 0; j < batch.length; j++) {
            const order = batch[j];
            const rowNum = batchStart + j + 2;
            
            // Skip if this was successfully inserted (check by invoice number)
            if (insertedInvoiceNumbers.has(order.invoice_number)) {
              continue;
            }
            
            // This one failed silently - try individual insert to get specific error
            try {
              // Sanitize order before attempting insert
              const sanitizedOrder = sanitizeNumericFields(order);
              const savedOrder = await ConfirmedPurchaseOrder.create(sanitizedOrder);
              savedOrders.push(savedOrder);
              successCount++;
            } catch (individualError) {
              // Check if it's a duplicate invoice number (most common case)
              if (individualError.code === 11000 || individualError.message.includes('duplicate') || individualError.message.includes('E11000')) {
                try {
                  // Create fallback order with modified invoice number - sanitize all numeric fields
                  const fallbackOrder = sanitizeNumericFields({
                    ...order,
                    invoice_number: `${order.invoice_number}-DUP-${Date.now()}-${rowNum}`,
                    remarks: `[DUPLICATE: Original invoice ${order.invoice_number}] ${order.remarks || ''}`.trim(),
                    vehicle_no: order.vehicle_no || `VEH-FALLBACK-${rowNum}`
                  });
                  const savedFallback = await ConfirmedPurchaseOrder.create(fallbackOrder);
                  savedOrders.push(savedFallback);
                  successCount++;
                  insertErrors.push(`Row ${rowNum}: Duplicate invoice_number "${order.invoice_number}" - Created with modified invoice number`);
                } catch (fallbackError) {
                  failCount++;
                  insertErrors.push(`Row ${rowNum}: Duplicate invoice "${order.invoice_number}" and fallback failed: ${fallbackError.message}`);
                  console.error(`Failed to create fallback order for row ${rowNum}:`, fallbackError.message);
                }
              } else {
                // Other validation error - try generic fallback - sanitize all numeric fields
                try {
                  const fallbackOrder = sanitizeNumericFields({
                    ...order,
                    invoice_number: order.invoice_number || `INV-FALLBACK-${Date.now()}-${rowNum}`,
                    remarks: `[INSERT ERROR: ${individualError.message}] ${order.remarks || ''}`.trim(),
                    vehicle_no: order.vehicle_no || `VEH-FALLBACK-${rowNum}`
                  });
                  const savedFallback = await ConfirmedPurchaseOrder.create(fallbackOrder);
                  savedOrders.push(savedFallback);
                  successCount++;
                  insertErrors.push(`Row ${rowNum}: ${individualError.message || 'Insert failed'} - Created fallback order`);
                } catch (fallbackError) {
                  failCount++;
                  insertErrors.push(`Row ${rowNum}: ${individualError.message || 'Insert failed'} - Fallback also failed: ${fallbackError.message}`);
                  console.error(`Failed to create fallback order for row ${rowNum}:`, fallbackError.message);
                }
              }
            }
          }
        } else {
          console.log(`Batch ${Math.floor(batchStart / batchSize) + 1}: Inserted ${batchResult.length} orders`);
        }
      } catch (batchError) {
        // If batch fails completely, try individual inserts to preserve all possible orders
        console.log(`Batch insert failed completely, trying individual inserts for batch starting at row ${batchStart + 2}...`);
        
        for (let j = 0; j < batch.length; j++) {
          const order = batch[j];
          const rowNum = batchStart + j + 2;
          
          try {
            // Sanitize order before attempting insert
            const sanitizedOrder = sanitizeNumericFields(order);
            const savedOrder = await ConfirmedPurchaseOrder.create(sanitizedOrder);
            savedOrders.push(savedOrder);
            successCount++;
          } catch (individualError) {
            // Try to create a fallback order with error info - NEVER SKIP A ROW
            console.error(`Failed to insert row ${rowNum}:`, individualError.message);
            try {
              // Create a minimal order with error information to preserve the row - sanitize numeric fields
              const fallbackOrder = sanitizeNumericFields({
                ...order,
                invoice_number: order.invoice_number || `INV-FALLBACK-${Date.now()}-${rowNum}`,
                remarks: `[INSERT ERROR: ${individualError.message}] ${order.remarks || ''}`.trim(),
                vehicle_no: order.vehicle_no || `VEH-FALLBACK-${rowNum}`
              });
              const savedFallback = await ConfirmedPurchaseOrder.create(fallbackOrder);
              savedOrders.push(savedFallback);
              successCount++;
              insertErrors.push(`Row ${rowNum}: ${individualError.message || 'Insert failed'} - Created fallback order`);
            } catch (fallbackError) {
              // Last resort: log but still count as processed
              failCount++;
              insertErrors.push(`Row ${rowNum}: ${individualError.message || 'Insert failed'} - Fallback also failed: ${fallbackError.message}`);
              console.error(`Failed to create fallback order for row ${rowNum}:`, fallbackError.message);
            }
          }
        }
      }
    }
    
    console.log(`Insertion complete: ${successCount} succeeded, ${failCount} failed out of ${orders.length} total`);
    
    const totalProcessed = records.length;
    const totalSaved = savedOrders.length;
    const totalSkipped = skippedRows.length;
    const totalErrors = errors.length + insertErrors.length;
    
    // Sort saved orders by row_sequence to preserve original order
    savedOrders.sort((a, b) => {
      const seqA = a.row_sequence !== undefined ? a.row_sequence : 999999;
      const seqB = b.row_sequence !== undefined ? b.row_sequence : 999999;
      return seqA - seqB;
    });
    
    res.json({
      success: true,
      message: `Processed ${totalProcessed} rows from file: ${totalSaved} orders saved successfully${totalSkipped > 0 ? `, ${totalSkipped} rows skipped` : ''}${totalErrors > 0 ? `, ${totalErrors} errors` : ''}`,
      count: totalSaved,
      totalRows: totalProcessed,
      savedRows: totalSaved,
      skippedRows: skippedRows.length > 0 ? skippedRows : undefined,
      errors: totalErrors > 0 ? [...errors, ...insertErrors] : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      orders: savedOrders.slice(0, 10) // Return first 10 for preview
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

