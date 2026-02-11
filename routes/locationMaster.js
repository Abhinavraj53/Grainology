import express from 'express';
import LocationMaster from '../models/LocationMaster.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all location master records
router.get('/', authenticate, async (req, res) => {
  try {
    const { is_active } = req.query;
    const query = {};

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    const locations = await LocationMaster.find(query)
      .sort({ name: 1 });
    res.json(locations);
  } catch (error) {
    console.error('Get location master error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch location master' });
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

// Create location master (admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const location = new LocationMaster(req.body);
    await location.save();
    res.status(201).json(location);
  } catch (error) {
    console.error('Create location error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Location with this name already exists' });
    }
    res.status(500).json({ error: error.message || 'Failed to create location' });
  }
});

// Update location master (admin only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
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
      return res.status(400).json({ error: 'Location with this name already exists' });
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
