import express from 'express';
import LogisticsProvider from '../models/LogisticsProvider.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all logistics providers
router.get('/', authenticate, async (req, res) => {
  try {
    const { is_active, pickup_city, delivery_city, id, company_name } = req.query;
    const query = {};

    if (id) query._id = id;
    if (is_active !== undefined) query.is_active = is_active === 'true';
    if (pickup_city) query.pickup_city = pickup_city;
    if (delivery_city) query.delivery_city = delivery_city;
    if (company_name) query.company_name = new RegExp(company_name, 'i');

    const providers = await LogisticsProvider.find(query).sort({ company_name: 1 });
    res.json(providers);
  } catch (error) {
    console.error('Get logistics providers error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch logistics providers' });
  }
});

// Get logistics provider by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const provider = await LogisticsProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ error: 'Logistics provider not found' });
    }
    res.json(provider);
  } catch (error) {
    console.error('Get logistics provider error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch logistics provider' });
  }
});

// Create logistics provider (admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const body = Array.isArray(req.body) ? req.body[0] : req.body;
    const provider = new LogisticsProvider(body);
    await provider.save();
    res.status(201).json(provider);
  } catch (error) {
    console.error('Create logistics provider error:', error);
    res.status(500).json({ error: error.message || 'Failed to create logistics provider' });
  }
});

// Update logistics provider (admin only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const provider = await LogisticsProvider.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!provider) {
      return res.status(404).json({ error: 'Logistics provider not found' });
    }

    res.json(provider);
  } catch (error) {
    console.error('Update logistics provider error:', error);
    res.status(500).json({ error: error.message || 'Failed to update logistics provider' });
  }
});

// Delete logistics provider (admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const provider = await LogisticsProvider.findByIdAndDelete(req.params.id);
    if (!provider) {
      return res.status(404).json({ error: 'Logistics provider not found' });
    }
    res.json({ message: 'Logistics provider deleted successfully' });
  } catch (error) {
    console.error('Delete logistics provider error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete logistics provider' });
  }
});

export default router;

