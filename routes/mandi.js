import express from 'express';
import MandiPrice from '../models/MandiPrice.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all mandi prices
router.get('/', authenticate, async (req, res) => {
  try {
    const { state, district, commodity, variety } = req.query;
    const query = {};

    if (state) query.state = state;
    if (district) query.district = district;
    if (commodity) query.commodity = commodity;
    if (variety) query.variety = variety;

    const prices = await MandiPrice.find(query).sort({ price_date: -1, createdAt: -1 });
    res.json(prices);
  } catch (error) {
    console.error('Get mandi prices error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch mandi prices' });
  }
});

// Get mandi price by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const price = await MandiPrice.findById(req.params.id);
    if (!price) {
      return res.status(404).json({ error: 'Mandi price not found' });
    }
    res.json(price);
  } catch (error) {
    console.error('Get mandi price error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch mandi price' });
  }
});

// Create mandi price (admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const price = new MandiPrice(req.body);
    await price.save();
    res.status(201).json(price);
  } catch (error) {
    console.error('Create mandi price error:', error);
    res.status(500).json({ error: error.message || 'Failed to create mandi price' });
  }
});

export default router;

