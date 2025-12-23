import express from 'express';
import ConfirmedSalesOrder from '../models/ConfirmedSalesOrder.js';
import User from '../models/User.js';
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
    const orderData = {
      ...req.body,
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

    const { customer_id } = req.body;
    if (!customer_id) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    // Verify customer exists
    const customer = await User.findById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Parse the file
    const records = parseFile(req.file.buffer, req.file.originalname);
    
    if (!records || records.length === 0) {
      return res.status(400).json({ error: 'File is empty or invalid' });
    }

    // Transform and validate records
    const orders = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

      try {
        // Map CSV/Excel columns to order fields
        const orderData = {
          customer_id: customer_id,
          invoice_number: record.invoice_number || record['Invoice Number'] || record['Invoice No'] || `INV-${Date.now()}-${i}`,
          transaction_date: record.transaction_date || record['Transaction Date'] || record['Date'] || new Date().toISOString().split('T')[0],
          state: record.state || record['State'] || '',
          seller_name: record.seller_name || record['Seller Name'] || record['Seller'] || '',
          location: record.location || record['Location'] || '',
          warehouse_name: record.warehouse_name || record['Warehouse Name'] || record['Warehouse'] || '',
          chamber_no: record.chamber_no || record['Chamber No'] || record['Chamber'] || '',
          commodity: record.commodity || record['Commodity'] || 'Paddy',
          variety: record.variety || record['Variety'] || '',
          gate_pass_no: record.gate_pass_no || record['Gate Pass No'] || record['Gate Pass'] || '',
          vehicle_no: record.vehicle_no || record['Vehicle No'] || record['Vehicle Number'] || record['Truck No'] || '',
          weight_slip_no: record.weight_slip_no || record['Weight Slip No'] || record['Weight Slip'] || '',
          gross_weight_mt: parseFloat(record.gross_weight_mt || record['Gross Weight (MT)'] || record['Gross Weight'] || 0),
          tare_weight_mt: parseFloat(record.tare_weight_mt || record['Tare Weight (MT)'] || record['Tare Weight'] || 0),
          no_of_bags: parseInt(record.no_of_bags || record['No of Bags'] || record['Bags'] || 0),
          net_weight_mt: parseFloat(record.net_weight_mt || record['Net Weight (MT)'] || record['Net Weight'] || 0),
          rate_per_mt: parseFloat(record.rate_per_mt || record['Rate per MT'] || record['Rate'] || 0),
          gross_amount: parseFloat(record.gross_amount || record['Gross Amount'] || 0),
          // Quality parameters
          hlw_wheat: parseFloat(record.hlw_wheat || record['HLW'] || record['Hectolitre Weight'] || 0),
          excess_hlw: parseFloat(record.excess_hlw || record['Excess HLW'] || 0),
          deduction_amount_hlw: parseFloat(record.deduction_amount_hlw || record['Deduction Amount HLW'] || 0),
          moisture_moi: parseFloat(record.moisture_moi || record['Moisture'] || 0),
          excess_moisture: parseFloat(record.excess_moisture || record['Excess Moisture'] || 0),
          bdoi: parseFloat(record.bdoi || record['BDOI'] || 0),
          excess_bdoi: parseFloat(record.excess_bdoi || record['Excess BDOI'] || 0),
          moi_bdoi: parseFloat(record.moi_bdoi || record['MOI+BDOI'] || 0),
          weight_deduction_kg: parseFloat(record.weight_deduction_kg || record['Weight Deduction (KG)'] || 0),
          deduction_amount_moi_bdoi: parseFloat(record.deduction_amount_moi_bdoi || record['Deduction Amount MOI+BDOI'] || 0),
          other_deductions: [],
          quality_report: {},
          delivery_location: record.delivery_location || record['Delivery Location'] || '',
          remarks: record.remarks || record['Remarks'] || '',
          created_by: req.userId
        };

        // Parse other deductions if provided
        if (record.other_deductions || record['Other Deductions']) {
          try {
            const deductions = typeof record.other_deductions === 'string' 
              ? JSON.parse(record.other_deductions) 
              : record.other_deductions;
            if (Array.isArray(deductions)) {
              orderData.other_deductions = deductions;
            }
          } catch (e) {
            // If parsing fails, leave as empty array
          }
        }

        // Calculate total deduction
        const otherDeductionsTotal = (orderData.other_deductions || []).reduce((sum, ded) => sum + (ded.amount || 0), 0);
        orderData.total_deduction = 
          (orderData.deduction_amount_hlw || 0) +
          (orderData.deduction_amount_moi_bdoi || 0) +
          otherDeductionsTotal;

        // Calculate net amount
        orderData.net_amount = (orderData.gross_amount || 0) - orderData.total_deduction;

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

