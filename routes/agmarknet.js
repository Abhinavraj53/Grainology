import express from 'express';
import {
  getAgmarknetFilters,
  getCachedStateIds,
  getMarketwiseData,
} from '../services/agmarknetService.js';

const router = express.Router();

const sendMarketwise = async (req, res) => {
  try {
    const result = await getMarketwiseData(req.body, { forceRefresh: req.body?.force === true });
    res.json({
      status: 'success',
      success: true,
      stale: Boolean(result.stale),
      source: result.source,
      cached: Boolean(result.cached),
      columns: result.columns || [],
      records: result.records || [],
      reported_dates: result.reportedDates || [],
      fetched_at: result.fetchedAt || result.updatedAt,
      warning: result.warning,
    });
  } catch (error) {
    console.error('Marketwise Agmarknet error:', error.message);
    res.status(502).json({ status: 'error', success: false, error: error.message });
  }
};

router.post('/marketwise', sendMarketwise);
router.post('/marketwise-price-arrival', sendMarketwise);

router.get('/filters', async (req, res) => {
  try {
    const [result, cachedStateIds] = await Promise.all([
      getAgmarknetFilters({ forceRefresh: req.query.force === 'true' }),
      getCachedStateIds(),
    ]);
    res.json({
      source: result.source,
      stale: Boolean(result.stale),
      live_available: result.source === 'agmarknet-live',
      cached_state_ids: cachedStateIds,
      data: result.raw,
    });
  } catch (error) {
    console.error('Agmarknet filters error:', error.message);
    res.status(503).json({ success: false, error: error.message });
  }
});

router.post('/sync', async (req, res) => {
  if (!process.env.CRON_SECRET || req.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const [marketwise, filters] = await Promise.all([
      getMarketwiseData({}, { forceRefresh: true }),
      getAgmarknetFilters({ forceRefresh: true }),
    ]);
    return res.json({
      success: true,
      records: marketwise.count,
      dataSource: marketwise.source,
      filtersUpdated: Boolean(filters.success),
    });
  } catch (error) {
    return res.status(503).json({ success: false, error: error.message });
  }
});

// ── /dashboard-prices ─────────────────────────────────────────────────────
// Fetches current national average prices from Agmarknet's main dashboard-data
// API (the same source as the MSP Commodities table). Returns a simple
// grain → current_price map. Used by the ML pipeline for correct current prices.
router.get('/dashboard-prices', async (req, res) => {
  try {
    const result = await getMarketwiseData({}, { forceRefresh: req.query.force === 'true' });
    const records = result.records || [];
    const normalizeCommodity = (name = '') => {
      const normalized = String(name).toLowerCase().replace(/\s+/g, ' ').trim();
      if (normalized.includes('wheat')) return 'Wheat';
      if (normalized.includes('paddy')) return 'Paddy';
      if (normalized.includes('maize')) return 'Maize';
      if (normalized.includes('mustard') || normalized.includes('rapeseed')) return 'Mustard';
      return null;
    };

    const prices = {};
    for (const r of records) {
      const grain = normalizeCommodity(r.commodity || r.raw?.cmdt_name);
      if (!grain || prices[grain] != null) continue;
      const price = Number(r.price?.as_on?.value ?? r.raw?.as_on_price);
      if (Number.isFinite(price) && price > 0) prices[grain] = price;
    }

    res.json({
      success: true,
      source: result.source,
      stale: Boolean(result.stale),
      cached: Boolean(result.cached),
      prices,
      reported_dates: result.reportedDates || [],
      raw_count: records.length,
    });
  } catch (err) {
    console.error('dashboard-prices error:', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});

export default router;
