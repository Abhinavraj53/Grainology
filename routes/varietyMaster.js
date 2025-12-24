import express from 'express';
import VarietyMaster from '../models/VarietyMaster.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all variety master records
router.get('/', authenticate, async (req, res) => {
  try {
    const { commodity_name } = req.query;
    const query = {};

    if (commodity_name) {
      query.commodity_name = commodity_name;
    }

    const varieties = await VarietyMaster.find(query)
      .sort({ commodity_name: 1, variety_name: 1 });
    res.json(varieties);
  } catch (error) {
    console.error('Get variety master error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch variety master' });
  }
});

// Get variety master by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const variety = await VarietyMaster.findById(req.params.id);
    if (!variety) {
      return res.status(404).json({ error: 'Variety not found' });
    }
    res.json(variety);
  } catch (error) {
    console.error('Get variety error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch variety' });
  }
});

// Create variety master (admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const variety = new VarietyMaster(req.body);
    await variety.save();
    res.status(201).json(variety);
  } catch (error) {
    console.error('Create variety error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Variety with this name already exists for this commodity' });
    }
    res.status(500).json({ error: error.message || 'Failed to create variety' });
  }
});

// Update variety master (admin only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const variety = await VarietyMaster.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!variety) {
      return res.status(404).json({ error: 'Variety not found' });
    }

    res.json(variety);
  } catch (error) {
    console.error('Update variety error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Variety with this name already exists for this commodity' });
    }
    res.status(500).json({ error: error.message || 'Failed to update variety' });
  }
});

// Delete variety master (admin only) - soft delete by setting is_active to false
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const variety = await VarietyMaster.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    );

    if (!variety) {
      return res.status(404).json({ error: 'Variety not found' });
    }

    res.json({ message: 'Variety deactivated successfully', variety });
  } catch (error) {
    console.error('Delete variety error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete variety' });
  }
});

export default router;

