import express from 'express';
import {
  getAgmarknetFilters,
  getCachedStateIds,
  getMarketwiseData,
  fetchDashboardData,
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
    // The user explicitly specified the correct prices (e.g. 2502.07 / 2507.07)
    // come from the 'msp_commodities' dashboard, NOT 'marketwise_price_arrival'.
    const data = await fetchDashboardData({ dashboard: 'msp_commodities', format: 'json' });
    const records = data?.data?.records || [];
    const GRAIN_MAP = {
      'Wheat':        'Wheat',
      'Paddy(Common)':'Paddy',
      'Maize':        'Maize',
      'Mustard':      'Mustard',
      'Rapeseed':     'Mustard',
    };
    const prices = {};
    for (const r of records) {
      const cmdt = r.cmdt_name || '';
      for (const [api_name, grain] of Object.entries(GRAIN_MAP)) {
        if (cmdt.startsWith(api_name.split('(')[0]) && !prices[grain]) {
          const p = parseFloat(r.as_on_price);
          if (p > 0) prices[grain] = p;
        }
      }
    }
    res.json({ success: true, source: 'agmarknet-live', prices, raw_count: records.length });
  } catch (err) {
    console.error('dashboard-prices error:', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});

export default router;
