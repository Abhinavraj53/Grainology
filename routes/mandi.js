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

// MSP (Minimum Support Price) data for 2025-26 season
const MSP_DATA = {
  'Bajra': 2775.00,
  'Pearl Millet': 2775.00,
  'Cumbu': 2775.00,
  'Barley': 1980.00,
  'Jau': 1980.00,
  'Jowar': 3699.00,
  'Sorghum': 3699.00,
  'Maize': 2400.00,
  'Paddy': 2369.00,
  'Common Paddy': 2369.00,
  'Ragi': 4886.00,
  'Finger Millet': 4886.00,
  'Wheat': 2425.00,
  'Cotton': 7710.00,
  'Copra': 12100.00,
  'Groundnut': 7263.00,
  'Soybean': 4600.00,
  'Sunflower': 7200.00,
  'Tomato': 0, // No MSP for vegetables
  'Onion': 0,
  'Potato': 0,
};

// Commodity groups mapping
const COMMODITY_GROUPS = {
  'Cereals': ['Bajra', 'Pearl Millet', 'Cumbu', 'Barley', 'Jau', 'Jowar', 'Sorghum', 'Maize', 'Paddy', 'Common Paddy', 'Ragi', 'Finger Millet', 'Wheat'],
  'Fibre Crops': ['Cotton'],
  'Oil Seeds': ['Copra', 'Groundnut', 'Soybean', 'Sunflower'],
  'Vegetables': ['Tomato', 'Onion', 'Potato'],
  'Others': []
};

// Helper to get commodity group
const getCommodityGroup = (commodity) => {
  if (!commodity) return 'Others';
  const commodityUpper = commodity.trim();
  for (const [group, commodities] of Object.entries(COMMODITY_GROUPS)) {
    if (commodities.some(c => commodityUpper.includes(c) || c.includes(commodityUpper))) {
      return group;
    }
  }
  return 'Others';
};

// Helper to get MSP for a commodity
const getMSP = (commodity) => {
  if (!commodity) return 0;
  const commodityUpper = commodity.trim();
  for (const [key, value] of Object.entries(MSP_DATA)) {
    if (commodityUpper.includes(key) || key.includes(commodityUpper)) {
      return value;
    }
  }
  return 0;
};

// Helper to extract arrival quantity
const extractArrival = (record) => {
  const possibleKeys = [
    'Arrival', 'arrival', 'Arrival_Qty', 'arrival_qty',
    'Arrival_Metric_Tonnes', 'arrival_metric_tonnes',
    'Arrival_MT', 'arrival_mt', 'Quantity', 'quantity'
  ];
  
  for (const key of possibleKeys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') {
      const cleaned = String(value).replace(/,/g, '').trim();
      const num = Number(cleaned);
      if (!isNaN(num) && num >= 0) {
        return num;
      }
    }
  }
  return 0;
};

// AgMarkNet-style endpoint: Grouped data by commodity with date columns
router.get('/agmarknet', async (req, res) => {
  try {
    if (!MANDI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'MANDI_API_KEY is not configured on the server'
      });
    }

    const {
      state = 'all',
      district = 'all',
      market = 'all',
      commodity_group = 'all',
      commodity = 'all',
      variety = 'all',
      grade = 'FAQ',
      limit = 1000,
      offset = 0,
    } = req.query;

    const params = new URLSearchParams({
      'api-key': MANDI_API_KEY,
      format: 'json',
      limit: Math.min(Number(limit) || 500, 2000).toString(), // Reduced from 1000/5000 to 500/2000
      offset: (Number(offset) || 0).toString(),
    });

    // Apply filters - handle 'all' values properly
    if (state && state !== 'all') params.append('filters[state.keyword]', state);
    if (district && district !== 'all') params.append('filters[district]', district);
    if (market && market !== 'all') params.append('filters[market]', market);
    if (commodity && commodity !== 'all') params.append('filters[commodity]', commodity);
    if (variety && variety !== 'all') params.append('filters[variety]', variety);
    
    // If commodity_group is 'Cereals' and commodity is 'all', use smaller limit to prevent timeout
    if (commodity_group === 'Cereals' && commodity === 'all') {
      // Reduce limit significantly to prevent timeout - don't fetch too much at once
      params.set('limit', Math.min(Number(limit) || 1000, 2000).toString()); // Reduced from 5000/10000
    }

    const url = `${MANDI_API_BASE}/resource/${MANDI_RESOURCE_ID}?${params.toString()}`;
    console.log('🔍 Mandi API Request:', {
      url: url.replace(MANDI_API_KEY, '***HIDDEN***'),
      limit: params.get('limit'),
      filters: Array.from(params.entries()).filter(([k]) => k.startsWith('filters'))
    });
    
    // Increase timeout to 30 seconds
    const response = await axios.get(url, { timeout: 30000 }); // Changed from 15000 to 30000

    const records = response.data?.records || [];

    // Helper to extract price
    const extractPrice = (record) => {
      const possibleKeys = [
        'Modal_Price', 'modal_price', 'ModalPrice', 'modalprice',
        'modal_price_rs_quintal', 'modal_price_rs_per_quintal',
        'Price', 'price', 'Avg_Price', 'avg_price'
      ];
      
      for (const key of possibleKeys) {
        const value = record[key];
        if (value !== undefined && value !== null && value !== '') {
          const cleaned = String(value).replace(/,/g, '').trim();
          const num = Number(cleaned);
          if (!isNaN(num) && num > 0) {
            return num;
          }
        }
      }
      return 0;
    };

    // Group data by commodity and date
    const grouped = {};
    
    records.forEach(record => {
      const commodityName = record.Commodity || record.commodity || record.commodity_name || '';
      const varietyName = record.Variety || record.variety || record.variety_name || '';
      const dateStr = record.Arrival_Date || record.arrival_date || record.date || '';
      
      if (!commodityName) return;
      
      // Create a unique key for commodity + variety combination
      const key = varietyName ? `${commodityName} - ${varietyName}` : commodityName;
      
      if (!grouped[key]) {
        grouped[key] = {
          commodity_group: getCommodityGroup(commodityName),
          commodity: commodityName,
          variety: varietyName || '',
          msp: getMSP(commodityName),
          dates: {}
        };
      }
      
      if (dateStr) {
        const dateKey = dateStr.split('T')[0]; // Get YYYY-MM-DD format
        if (!grouped[key].dates[dateKey]) {
          grouped[key].dates[dateKey] = {
            price: extractPrice(record),
            arrival: extractArrival(record)
          };
        } else {
          // If multiple records for same date, average the price and sum arrivals
          const existing = grouped[key].dates[dateKey];
          const newPrice = extractPrice(record);
          const newArrival = extractArrival(record);
          
          if (newPrice > 0) {
            existing.price = existing.price > 0 
              ? (existing.price + newPrice) / 2 
              : newPrice;
          }
          existing.arrival += newArrival;
        }
      }
    });

    // Convert to array and filter by commodity group if specified
    let result = Object.values(grouped);
    
    if (commodity_group && commodity_group !== 'all') {
      result = result.filter(item => item.commodity_group === commodity_group);
    }

    // Sort by commodity group and commodity name
    result.sort((a, b) => {
      if (a.commodity_group !== b.commodity_group) {
        return a.commodity_group.localeCompare(b.commodity_group);
      }
      return a.commodity.localeCompare(b.commodity);
    });

    // Get unique dates from all records (last 3 days)
    const allDates = new Set();
    result.forEach(item => {
      Object.keys(item.dates).forEach(date => allDates.add(date));
    });
    const sortedDates = Array.from(allDates).sort().reverse().slice(0, 3);

    return res.json({
      success: true,
      data: result,
      dates: sortedDates,
      filters: { state, district, market, commodity_group, commodity, variety, grade },
      count: result.length
    });
  } catch (error) {
    console.error('AgMarkNet API error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url?.replace(MANDI_API_KEY, '***HIDDEN***')
    });
    
    // Check if it's a timeout error
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({
        success: false,
        error: 'Request timeout - The API is taking too long to respond',
        details: 'The data.gov.in API may be slow or overloaded. Please try with more specific filters to reduce data size.',
        suggestion: 'Try adding filters like ?commodity=Paddy&state=Bihar&limit=100',
        timeout: '30 seconds'
      });
    }
    
    return res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch AgMarkNet-style data',
      details: error.response?.data || error.message,
    });
  }
});

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
    const response = await axios.get(url, { timeout: 30000 }); // Increased from 10000 to 30000

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
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
    });
    
    // Check if it's a timeout error
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({
        success: false,
        error: 'Request timeout - The API is taking too long to respond',
        details: 'The data.gov.in API may be slow. Try with more specific filters to reduce data size.',
        suggestion: 'Try adding filters like ?commodity=Paddy&state=Bihar&limit=50'
      });
    }
    
    return res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch live mandi prices',
      details: error.response?.data || error.message,
    });
  }
});

// Get filter options (states, districts, markets, commodities, varieties)
router.get('/filters', async (req, res) => {
  try {
    if (!MANDI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'MANDI_API_KEY is not configured on the server'
      });
    }

    // Fetch a large sample to get all unique values, prioritizing Bihar
    // First try to get Bihar-specific data - reduce limit to prevent timeout
    const biharParams = new URLSearchParams({
      'api-key': MANDI_API_KEY,
      format: 'json',
      limit: '2000', // Reduced from 5000 to 2000
      offset: '0',
      'filters[state.keyword]': 'Bihar',
    });

    const biharUrl = `${MANDI_API_BASE}/resource/${MANDI_RESOURCE_ID}?${biharParams.toString()}`;
    let biharResponse;
    let biharRecords = [];
    
    try {
      biharResponse = await axios.get(biharUrl, { timeout: 30000 }); // Increased from 15000 to 30000
      biharRecords = biharResponse.data?.records || [];
    } catch (error) {
      console.warn('Failed to fetch Bihar-specific data, will fetch all data:', error.message);
    }

    // Also fetch general data to get all states - reduce limit to prevent timeout
    const params = new URLSearchParams({
      'api-key': MANDI_API_KEY,
      format: 'json',
      limit: '2000', // Reduced from 5000 to 2000
      offset: '0',
    });

    const url = `${MANDI_API_BASE}/resource/${MANDI_RESOURCE_ID}?${params.toString()}`;
    const response = await axios.get(url, { timeout: 30000 }); // Increased from 15000 to 30000
    const allRecords = response.data?.records || [];

    // Combine Bihar records with all records (Bihar first)
    const records = [...biharRecords, ...allRecords];

    const states = new Set();
    const districts = new Set();
    const markets = new Set();
    const commodities = new Set();
    const varieties = new Set();
    const commodityGroups = new Set();

    // Bihar districts list for default
    const biharDistricts = ['Patna', 'Muzaffarpur', 'Gaya', 'Bhagalpur', 'Purnia', 'Darbhanga', 'Saran', 'Siwan', 'Vaishali', 'Samastipur', 'Madhubani', 'East Champaran', 'West Champaran', 'Sitamarhi', 'Begusarai', 'Nalanda', 'Bhojpur', 'Rohtas', 'Aurangabad', 'Nawada'];

    records.forEach(record => {
      const state = record.State || record.state || record.state_name;
      const district = record.District || record.district || record.district_name;
      const market = record.Market || record.market || record.market_name;
      const commodity = record.Commodity || record.commodity || record.commodity_name;
      const variety = record.Variety || record.variety || record.variety_name;

      if (state) states.add(state);
      if (district) districts.add(district);
      if (market) markets.add(market);
      if (commodity) {
        commodities.add(commodity);
        commodityGroups.add(getCommodityGroup(commodity));
      }
      if (variety) varieties.add(variety);
    });

    // Ensure Bihar districts are included even if not in API response
    biharDistricts.forEach(dist => districts.add(dist));

    // Sort states with Bihar first
    const sortedStates = Array.from(states).sort((a, b) => {
      if (a === 'Bihar') return -1;
      if (b === 'Bihar') return 1;
      return a.localeCompare(b);
    });

    // Sort districts with Bihar districts first
    const sortedDistricts = Array.from(districts).sort((a, b) => {
      const aIsBihar = biharDistricts.some(d => a.includes(d) || d.includes(a));
      const bIsBihar = biharDistricts.some(d => b.includes(d) || d.includes(b));
      if (aIsBihar && !bIsBihar) return -1;
      if (!aIsBihar && bIsBihar) return 1;
      return a.localeCompare(b);
    });

    return res.json({
      success: true,
      states: sortedStates,
      districts: sortedDistricts,
      markets: Array.from(markets).sort(),
      commodities: Array.from(commodities).sort(),
      varieties: Array.from(varieties).sort(),
      commodity_groups: Array.from(commodityGroups).sort(),
    });
  } catch (error) {
    console.error('Get filters error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch filter options',
      details: error.message,
    });
  }
});

// Test endpoint to check Mandi API configuration and connectivity (PUBLIC - no auth)
// IMPORTANT: This must be BEFORE router.get('/:id') to avoid route matching issues
router.get('/test', async (req, res) => {
  try {
    const testResults = {
      timestamp: new Date().toISOString(),
      apiConfiguration: {
        hasApiKey: !!MANDI_API_KEY,
        apiKeyLength: MANDI_API_KEY ? MANDI_API_KEY.length : 0,
        apiKeyPreview: MANDI_API_KEY ? `${MANDI_API_KEY.substring(0, 8)}...` : 'NOT SET',
        apiBase: MANDI_API_BASE,
        resourceId: MANDI_RESOURCE_ID,
      },
      tests: []
    };

    // Test 1: Check if API key is configured
    if (!MANDI_API_KEY || MANDI_API_KEY === 'your-data-gov-api-key') {
      testResults.tests.push({
        name: 'API Key Configuration',
        status: 'FAILED',
        message: 'MANDI_API_KEY is not set or is using placeholder value',
        fix: 'Set MANDI_API_KEY in your environment variables with a valid data.gov.in API key'
      });
      return res.status(500).json({
        success: false,
        error: 'Mandi API is not configured',
        details: testResults
      });
    }

    testResults.tests.push({
      name: 'API Key Configuration',
      status: 'PASSED',
      message: 'API key is configured'
    });

    // Test 2: Try a small API request
    const testParams = new URLSearchParams({
      'api-key': MANDI_API_KEY,
      format: 'json',
      limit: '10', // Small limit for testing
      offset: '0',
    });

    // Add a commodity filter to reduce data
    testParams.append('filters[commodity]', 'Paddy');

    const testUrl = `${MANDI_API_BASE}/resource/${MANDI_RESOURCE_ID}?${testParams.toString()}`;
    
    console.log('🧪 Testing Mandi API:', testUrl.replace(MANDI_API_KEY, '***HIDDEN***'));

    try {
      const startTime = Date.now();
      const response = await axios.get(testUrl, { 
        timeout: 20000, // 20 second timeout for test
        validateStatus: (status) => status < 500 // Don't throw on 4xx
      });
      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        const records = response.data?.records || [];
        testResults.tests.push({
          name: 'API Connectivity',
          status: 'PASSED',
          message: `Successfully connected to data.gov.in API`,
          details: {
            responseTime: `${responseTime}ms`,
            recordsReturned: records.length,
            totalRecords: response.data?.total || 'unknown'
          }
        });

        // Test 3: Check if data structure is correct
        if (records.length > 0) {
          const sampleRecord = records[0];
          const hasCommodity = !!(sampleRecord.Commodity || sampleRecord.commodity);
          const hasPrice = !!(sampleRecord.Modal_Price || sampleRecord.modal_price || 
                             sampleRecord.Price || sampleRecord.price);
          
          testResults.tests.push({
            name: 'Data Structure',
            status: hasCommodity && hasPrice ? 'PASSED' : 'WARNING',
            message: hasCommodity && hasPrice 
              ? 'Data structure looks correct' 
              : 'Data structure may be different than expected',
            details: {
              sampleFields: Object.keys(sampleRecord).slice(0, 10),
              hasCommodity,
              hasPrice
            }
          });
        } else {
          testResults.tests.push({
            name: 'Data Structure',
            status: 'WARNING',
            message: 'No records returned - API may be working but no data available',
            details: {
              responseData: response.data
            }
          });
        }
      } else {
        testResults.tests.push({
          name: 'API Connectivity',
          status: 'FAILED',
          message: `API returned status ${response.status}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            data: response.data
          }
        });
      }

      return res.json({
        success: true,
        message: 'Mandi API test completed',
        results: testResults
      });

    } catch (apiError) {
      testResults.tests.push({
        name: 'API Connectivity',
        status: 'FAILED',
        message: apiError.message,
        details: {
          code: apiError.code,
          response: apiError.response?.data,
          status: apiError.response?.status
        }
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to connect to Mandi API',
        details: testResults
      });
    }

  } catch (error) {
    console.error('Test endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Test endpoint error',
      details: error.message
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

