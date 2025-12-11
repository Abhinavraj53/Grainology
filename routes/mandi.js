import express from 'express';
import axios from 'axios';
import MandiPrice from '../models/MandiPrice.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Environment for data.gov.in Mandi API
const MANDI_API_BASE = (process.env.MANDI_API_BASE || 'https://api.data.gov.in').replace(/\/$/, '');
const MANDI_API_KEY = process.env.MANDI_API_KEY || '';
const MANDI_RESOURCE_ID = process.env.MANDI_RESOURCE_ID || '9ef84268-d588-465a-a308-a864a43d0070';

// Public: live mandi prices from data.gov.in (no auth required)
router.get('/live', async (req, res) => {
  try {
    if (!MANDI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'MANDI_API_KEY is not configured on the server'
      });
    }

    const {
      state,
      district,
      market,
      commodity,
      limit = 50,
      offset = 0,
      format = 'json',
    } = req.query;

    const params = new URLSearchParams({
      'api-key': MANDI_API_KEY,
      format: format || 'json',
      limit: Math.min(Number(limit) || 50, 100).toString(),
      offset: (Number(offset) || 0).toString(),
    });

    // Apply filters per data.gov.in spec
    if (state) params.append('filters[state.keyword]', state);
    if (district) params.append('filters[district]', district);
    if (market) params.append('filters[market]', market);
    if (commodity) params.append('filters[commodity]', commodity);

    const url = `${MANDI_API_BASE}/resource/${MANDI_RESOURCE_ID}?${params.toString()}`;
    const response = await axios.get(url, { timeout: 10000 });

    const records = response.data?.records || [];

    // Normalize records to front-end shape
    const mapped = records.map((r, idx) => ({
      id: r._id || r.id || `${r.market || 'mandi'}-${idx}`,
      state: r.state || '',
      district: r.district || r.district_name || '',
      market: r.market || r.market_name || '',
      commodity: r.commodity || '',
      variety: r.variety || '',
      min_price: Number(r.min_price) || 0,
      max_price: Number(r.max_price) || 0,
      modal_price: Number(r.modal_price) || 0,
      price_date: r.arrival_date || r.date || new Date().toISOString(),
      created_at: new Date().toISOString(),
    }));

    return res.json({
      success: true,
      count: mapped.length,
      total: response.data?.total || mapped.length,
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
      records: mapped,
      raw: process.env.NODE_ENV === 'development' ? records : undefined,
    });
  } catch (error) {
    console.error('Live mandi API error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch live mandi prices',
      details: error.response?.data || error.message,
    });
  }
});

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

