import express from 'express';
import WarehouseMaster from '../models/WarehouseMaster.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all warehouse master records
router.get('/', authenticate, async (req, res) => {
  try {
    const { is_active } = req.query;
    const query = {};

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    const warehouses = await WarehouseMaster.find(query)
      .sort({ name: 1 });
    res.json(warehouses);
  } catch (error) {
    console.error('Get warehouse master error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch warehouse master' });
  }
});

// Get warehouse master by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const warehouse = await WarehouseMaster.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    res.json(warehouse);
  } catch (error) {
    console.error('Get warehouse error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch warehouse' });
  }
});

// Create warehouse master (admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const warehouse = new WarehouseMaster(req.body);
    await warehouse.save();
    res.status(201).json(warehouse);
  } catch (error) {
    console.error('Create warehouse error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Warehouse with this name already exists' });
    }
    res.status(500).json({ error: error.message || 'Failed to create warehouse' });
  }
});

// Update warehouse master (admin only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const warehouse = await WarehouseMaster.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    res.json(warehouse);
  } catch (error) {
    console.error('Update warehouse error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Warehouse with this name already exists' });
    }
    res.status(500).json({ error: error.message || 'Failed to update warehouse' });
  }
});

// Delete warehouse master (admin only) - soft delete by setting is_active to false
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const warehouse = await WarehouseMaster.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    );

    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    res.json({ message: 'Warehouse deactivated successfully', warehouse });
  } catch (error) {
    console.error('Delete warehouse error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete warehouse' });
  }
});

export default router;

