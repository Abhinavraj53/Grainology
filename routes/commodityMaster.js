import express from 'express';
import CommodityMaster from '../models/CommodityMaster.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all commodity master records
router.get('/', authenticate, async (req, res) => {
  try {
    const { is_active } = req.query;
    const query = {};

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    const commodities = await CommodityMaster.find(query)
      .sort({ name: 1 });
    res.json(commodities);
  } catch (error) {
    console.error('Get commodity master error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch commodity master' });
  }
});

// Get commodity master by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const commodity = await CommodityMaster.findById(req.params.id);
    if (!commodity) {
      return res.status(404).json({ error: 'Commodity not found' });
    }
    res.json(commodity);
  } catch (error) {
    console.error('Get commodity error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch commodity' });
  }
});

// Create commodity master (admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const commodity = new CommodityMaster(req.body);
    await commodity.save();
    res.status(201).json(commodity);
  } catch (error) {
    console.error('Create commodity error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Commodity with this name already exists' });
    }
    res.status(500).json({ error: error.message || 'Failed to create commodity' });
  }
});

// Update commodity master (admin only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const commodity = await CommodityMaster.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!commodity) {
      return res.status(404).json({ error: 'Commodity not found' });
    }

    res.json(commodity);
  } catch (error) {
    console.error('Update commodity error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Commodity with this name already exists' });
    }
    res.status(500).json({ error: error.message || 'Failed to update commodity' });
  }
});

// Delete commodity master (admin only) - soft delete by setting is_active to false
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const commodity = await CommodityMaster.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    );

    if (!commodity) {
      return res.status(404).json({ error: 'Commodity not found' });
    }

    res.json({ message: 'Commodity deactivated successfully', commodity });
  } catch (error) {
    console.error('Delete commodity error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete commodity' });
  }
});

export default router;

