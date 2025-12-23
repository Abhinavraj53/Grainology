import express from 'express';
import ConfirmedPurchaseOrder from '../models/ConfirmedPurchaseOrder.js';
import User from '../models/User.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

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
    const orderData = {
      ...req.body,
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

export default router;

