import express from 'express';
import axios from 'axios';
import MandiPrice from '../models/MandiPrice.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Environment for data.gov.in Mandi API
const MANDI_API_BASE = (process.env.MANDI_API_BASE || 'https://api.data.gov.in').replace(/\/$/, '');
const MANDI_API_KEY = process.env.MANDI_API_KEY || '';
// Default to variety-wise daily market prices resource if env not provided
const MANDI_RESOURCE_ID = process.env.MANDI_RESOURCE_ID || '35985678-0d79-46b4-9ed6-6f13308a1d24';

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

    // Log first record structure and all available keys for debugging
    if (records.length > 0) {
      const sampleRecord = records[0];
      console.log('Sample record keys from data.gov.in:', Object.keys(sampleRecord));
      console.log('Sample record (first 3 fields):', {
        ...Object.fromEntries(Object.entries(sampleRecord).slice(0, 3)),
        '...': '...'
      });
      // Log price-related fields specifically
      const priceFields = Object.keys(sampleRecord).filter(k => 
        k.toLowerCase().includes('price') || k.toLowerCase().includes('min') || 
        k.toLowerCase().includes('max') || k.toLowerCase().includes('modal')
      );
      if (priceFields.length > 0) {
        console.log('Price-related fields found:', priceFields.map(k => `${k}: ${sampleRecord[k]}`));
      } else {
        console.warn('⚠️  No price-related fields found in record!');
      }
    }

    // Helper function to extract price value from various field name formats
    const extractPrice = (record, possibleKeys, fieldType = '') => {
      // First try the known possible keys
      for (const key of possibleKeys) {
        const value = record[key];
        if (value !== undefined && value !== null && value !== '') {
          // Handle string values with commas (e.g., "1,234.56")
          const cleaned = String(value).replace(/,/g, '').trim();
          const num = Number(cleaned);
          if (!isNaN(num) && num > 0) {
            return num;
          }
        }
      }
      
      // Fallback: search for any field containing the price type (case-insensitive)
      if (fieldType) {
        const allKeys = Object.keys(record);
        const matchingKey = allKeys.find(k => 
          k.toLowerCase().includes(fieldType.toLowerCase()) && 
          (k.toLowerCase().includes('price') || k.toLowerCase().includes('rs'))
        );
        if (matchingKey) {
          const value = record[matchingKey];
          if (value !== undefined && value !== null && value !== '') {
            const cleaned = String(value).replace(/,/g, '').trim();
            const num = Number(cleaned);
            if (!isNaN(num) && num > 0) {
              console.log(`Found ${fieldType} price in field: ${matchingKey} = ${num}`);
              return num;
            }
          }
        }
      }
      
      return 0;
    };

    // Normalize records to front-end shape
    const mapped = records.map((r, idx) => {
      // Try multiple possible field name variations for prices (including capitalized versions)
      const minPrice = extractPrice(r, [
        'Min_Price', // Capitalized version from data.gov.in
        'min_price',
        'minprice',
        'MinPrice',
        'min_price_rs_quintal',
        'min_price_rs_quintal_',
        'min_price_rs_per_quintal',
        'min_price_rs_per_quintal_',
        'min_price_rs_quintal__',
        'min_price_rs_per_quintal__'
      ], 'min');

      const maxPrice = extractPrice(r, [
        'Max_Price', // Capitalized version from data.gov.in
        'max_price',
        'maxprice',
        'MaxPrice',
        'max_price_rs_quintal',
        'max_price_rs_quintal_',
        'max_price_rs_per_quintal',
        'max_price_rs_per_quintal_',
        'max_price_rs_quintal__',
        'max_price_rs_per_quintal__'
      ], 'max');

      const modalPrice = extractPrice(r, [
        'Modal_Price', // Capitalized version from data.gov.in
        'modal_price',
        'modalprice',
        'ModalPrice',
        'modal_price_rs_quintal',
        'modal_price_rs_quintal_',
        'modal_price_rs_per_quintal',
        'modal_price_rs_per_quintal_',
        'modal_price_rs_quintal__',
        'modal_price_rs_per_quintal__'
      ], 'modal');

      return {
        id: r._id || r.id || `${r.Market || r.market || r.market_name || 'mandi'}-${idx}`,
        state: r.State || r.state || r.state_name || '',
        district: r.District || r.district || r.district_name || '',
        market: r.Market || r.market || r.market_name || '',
        commodity: r.Commodity || r.commodity || r.commodity_name || '',
        variety: r.Variety || r.variety || r.variety_name || '',
        min_price: minPrice,
        max_price: maxPrice,
        modal_price: modalPrice,
        price_date: r.Arrival_Date || r.arrival_date || r.date || r.price_date || new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
    });

    // Log statistics about mapped data
    const recordsWithPrices = mapped.filter(r => r.min_price > 0 || r.max_price > 0 || r.modal_price > 0);
    console.log(`Mandi API: Fetched ${records.length} records, ${recordsWithPrices.length} have valid prices`);

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

