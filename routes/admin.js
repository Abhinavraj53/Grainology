import express from 'express';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Offer from '../models/Offer.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import SaleOrder from '../models/SaleOrder.js';
import ConfirmedSalesOrder from '../models/ConfirmedSalesOrder.js';
import ConfirmedPurchaseOrder from '../models/ConfirmedPurchaseOrder.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalFarmers,
      totalTraders,
      verifiedUsers,
      totalPurchaseOrders,
      totalSaleOrders,
      totalConfirmedSalesOrders,
      totalConfirmedPurchaseOrders
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'farmer' }),
      User.countDocuments({ role: 'trader' }),
      User.countDocuments({ kyc_status: 'verified' }),
      PurchaseOrder.countDocuments(),
      SaleOrder.countDocuments(),
      ConfirmedSalesOrder.countDocuments(),
      ConfirmedPurchaseOrder.countDocuments()
    ]);

    // Calculate total amounts for confirmed orders
    const confirmedSalesOrders = await ConfirmedSalesOrder.find({});
    const confirmedPurchaseOrders = await ConfirmedPurchaseOrder.find({});
    
    const totalConfirmedSalesAmount = confirmedSalesOrders.reduce((sum, order) => {
      return sum + (order.net_amount || 0);
    }, 0);
    
    const totalConfirmedPurchaseAmount = confirmedPurchaseOrders.reduce((sum, order) => {
      return sum + (order.net_amount || 0);
    }, 0);

    res.json({
      totalUsers,
      totalFarmers,
      totalTraders,
      verifiedUsers,
      totalPurchaseOrders,
      totalSaleOrders,
      totalConfirmedSalesOrders,
      totalConfirmedPurchaseOrders,
      totalConfirmedSalesAmount,
      totalConfirmedPurchaseAmount
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch stats' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

export default router;

