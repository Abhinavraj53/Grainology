import express from 'express';
import LocationMaster from '../models/LocationMaster.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all location master records (optional filter by state)
router.get('/', authenticate, async (req, res) => {
  try {
    const { is_active, state } = req.query;
    const query = {};

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }
    if (state && String(state).trim()) {
      query.state = String(state).trim();
    }

    const locations = await LocationMaster.find(query)
      .sort({ state: 1, name: 1 });
    res.json(locations);
  } catch (error) {
    console.error('Get location master error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch location master' });
  }
});

// Search locations by name (realtime) - case-insensitive, for duplicate check
router.get('/search', authenticate, async (req, res) => {
  try {
    const { state, q } = req.query;
    if (!state || !String(state).trim()) {
      return res.status(400).json({ error: 'state is required' });
    }
    const searchName = (q && String(q).trim()) || '';
    const query = { state: String(state).trim(), is_active: true };
    if (searchName) {
      query.name = new RegExp('^' + searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
    }
    const existing = await LocationMaster.findOne(query);
    res.json({ exists: !!existing, location: existing ? existing.toJSON() : null });
  } catch (error) {
    console.error('Location search error:', error);
    res.status(500).json({ error: error.message || 'Failed to search' });
  }
});

// Get location master by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const location = await LocationMaster.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch location' });
  }
});

// Create location master (admin only) - duplicate check case-insensitive
router.post('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { state, name } = req.body;
    if (!state || !String(state).trim()) {
      return res.status(400).json({ error: 'State is required' });
    }
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Location name is required' });
    }

    const stateTrim = String(state).trim();
    const nameTrim = String(name).trim();
    const existing = await LocationMaster.findOne({
      state: stateTrim,
      name: new RegExp('^' + nameTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
      is_active: true
    });
    if (existing) {
      return res.status(400).json({ error: 'A location with this name already exists in this state' });
    }

    const location = new LocationMaster({ state: stateTrim, name: nameTrim });
    await location.save();
    res.status(201).json(location);
  } catch (error) {
    console.error('Create location error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Location with this name already exists in this state' });
    }
    res.status(500).json({ error: error.message || 'Failed to create location' });
  }
});

// Update location master (admin only) - duplicate check case-insensitive (exclude self)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { state, name } = req.body;
    if (state && String(state).trim() && name && String(name).trim()) {
      const stateTrim = String(state).trim();
      const nameTrim = String(name).trim();
      const existing = await LocationMaster.findOne({
        state: stateTrim,
        name: new RegExp('^' + nameTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
        is_active: true,
        _id: { $ne: req.params.id }
      });
      if (existing) {
        return res.status(400).json({ error: 'A location with this name already exists in this state' });
      }
    }

    const location = await LocationMaster.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Update location error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Location with this name already exists in this state' });
    }
    res.status(500).json({ error: error.message || 'Failed to update location' });
  }
});

// Delete location master (admin only) - soft delete by setting is_active to false
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const location = await LocationMaster.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    );

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({ message: 'Location deactivated successfully', location });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete location' });
  }
});

export default router;
