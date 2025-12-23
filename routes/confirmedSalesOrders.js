import express from 'express';
import ConfirmedSalesOrder from '../models/ConfirmedSalesOrder.js';
import User from '../models/User.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

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

export default router;

