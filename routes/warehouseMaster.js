import express from 'express';
import WarehouseMaster from '../models/WarehouseMaster.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all warehouse master records (optional filter by location_id)
router.get('/', authenticate, async (req, res) => {
  try {
    const { is_active, location_id } = req.query;
    const query = {};

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }
    if (location_id && String(location_id).trim()) {
      query.location_id = String(location_id).trim();
    }

    const warehouses = await WarehouseMaster.find(query)
      .sort({ name: 1 });
    res.json(warehouses);
  } catch (error) {
    console.error('Get warehouse master error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch warehouse master' });
  }
});

// Search warehouses by name (realtime) - case-insensitive, for duplicate check
router.get('/search', authenticate, async (req, res) => {
  try {
    const { location_id, q } = req.query;
    if (!location_id || !String(location_id).trim()) {
      return res.status(400).json({ error: 'location_id is required' });
    }
    const searchName = (q && String(q).trim()) || '';
    const query = { location_id: String(location_id).trim(), is_active: true };
    if (searchName) {
      query.name = new RegExp('^' + searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
    }
    const existing = await WarehouseMaster.findOne(query);
    res.json({ exists: !!existing, warehouse: existing ? existing.toJSON() : null });
  } catch (error) {
    console.error('Warehouse search error:', error);
    res.status(500).json({ error: error.message || 'Failed to search' });
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

// Create warehouse master (admin only) - duplicate check case-insensitive
router.post('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { location_id, name } = req.body;
    if (!location_id || !String(location_id).trim()) {
      return res.status(400).json({ error: 'Location is required' });
    }
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Warehouse name is required' });
    }

    const locId = String(location_id).trim();
    const nameTrim = String(name).trim();
    const existing = await WarehouseMaster.findOne({
      location_id: locId,
      name: new RegExp('^' + nameTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
      is_active: true
    });
    if (existing) {
      return res.status(400).json({ error: 'A warehouse with this name already exists at this location' });
    }

    const warehouse = new WarehouseMaster({ location_id: locId, name: nameTrim });
    await warehouse.save();
    res.status(201).json(warehouse);
  } catch (error) {
    console.error('Create warehouse error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Warehouse with this name already exists at this location' });
    }
    res.status(500).json({ error: error.message || 'Failed to create warehouse' });
  }
});

// Update warehouse master (admin only) - duplicate check case-insensitive (exclude self)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { location_id, name } = req.body;
    if (location_id && String(location_id).trim() && name && String(name).trim()) {
      const locId = String(location_id).trim();
      const nameTrim = String(name).trim();
      const existing = await WarehouseMaster.findOne({
        location_id: locId,
        name: new RegExp('^' + nameTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
        is_active: true,
        _id: { $ne: req.params.id }
      });
      if (existing) {
        return res.status(400).json({ error: 'A warehouse with this name already exists at this location' });
      }
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
      return res.status(400).json({ error: 'Warehouse with this name already exists at this location' });
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

