import { getSupabaseAdmin } from '../config/supabase.js';

export const TARGET_GRAINS = ['Wheat', 'Paddy', 'Maize', 'Mustard'];
const TARGET_GRAIN_SET = new Set(TARGET_GRAINS);
const MONTHS = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

const normalizeStateKey = (stateName) => String(stateName || '')
  .trim()
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : null;
};

const parseDateTitle = (rawValue) => {
  const value = String(rawValue || '').trim();
  if (!value) return null;

  const isoMatch = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const dmyText = value.match(/\b(\d{1,2})[-/\s]([A-Za-z]{3,9})[-/\s](\d{4})\b/);
  if (dmyText) {
    const month = MONTHS[dmyText[2].slice(0, 3).toLowerCase()];
    if (!month) return null;
    return `${dmyText[3]}-${month}-${dmyText[1].padStart(2, '0')}`;
  }

  const dmyNumeric = value.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
  if (dmyNumeric) {
    return `${dmyNumeric[3]}-${dmyNumeric[2].padStart(2, '0')}-${dmyNumeric[1].padStart(2, '0')}`;
  }

  return null;
};

export const normalizeGrainName = (rawCommodity) => {
  const value = String(rawCommodity || '').trim().toLowerCase();
  if (!value) return null;

  if (/\b(mustard\s*oil|oil\s*mustard|sarson\s*oil)\b/.test(value)) return null;
  if (/\bwheat\b/.test(value)) return 'Wheat';
  if (/\b(paddy|common paddy)\b/.test(value)) return 'Paddy';
  if (/\b(maize|corn)\b/.test(value)) return 'Maize';
  if (/\b(mustard|sarson|rape seed|rapeseed)\b/.test(value)) return 'Mustard';
  return null;
};

export const extractReportedDatePoints = (record) => {
  const price = record?.price || {};
  const arrival = record?.arrival_metric_tonnes || {};
  const candidates = [
    { price: price.as_on, arrival: arrival.as_on, fallbackDate: record?.reported_date },
    { price: price.one_day_ago, arrival: arrival.one_day_ago },
    { price: price.two_day_ago, arrival: arrival.two_day_ago },
  ];

  return candidates
    .map((point) => {
      const date = parseDateTitle(point.price?.title) || parseDateTitle(point.fallbackDate);
      const pointPrice = toFiniteNumber(point.price?.value);
      const pointArrival = toFiniteNumber(point.arrival?.value);
      if (!date || pointPrice === null || pointPrice <= 0) return null;
      return {
        date,
        price: pointPrice,
        arrival: pointArrival !== null && pointArrival >= 0 ? pointArrival : null,
      };
    })
    .filter(Boolean);
};

const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

export const aggregateMarketRows = ({
  stateId,
  stateName,
  records,
  cacheKey = null,
  fetchedAt = new Date().toISOString(),
  aggregationMethod = process.env.AGGREGATION_METHOD || 'median',
}) => {
  const groups = new Map();
  const summary = { scanned: 0, skipped: 0 };
  const resolvedStateName = stateName || (Number(stateId) === 100006 ? 'All States' : String(stateId || 'Unknown'));

  for (const record of records || []) {
    summary.scanned += 1;
    const grain = normalizeGrainName(record?.commodity);
    if (!grain || !TARGET_GRAIN_SET.has(grain)) {
      summary.skipped += 1;
      continue;
    }

    for (const point of extractReportedDatePoints(record)) {
      const key = `${point.date}|${resolvedStateName}|${grain}`;
      const existing = groups.get(key) || {
        date: point.date,
        state_name: resolvedStateName,
        state_id: stateId == null ? null : String(stateId),
        state_key: normalizeStateKey(resolvedStateName),
        grain,
        prices: [],
        arrivals: [],
        market_count: 0,
        aggregation_method: aggregationMethod,
        source_cache_key: cacheKey,
        source_fetched_at: fetchedAt,
      };

      existing.prices.push(point.price);
      if (point.arrival !== null) existing.arrivals.push(point.arrival);
      existing.market_count += 1;
      groups.set(key, existing);
    }
  }

  const rows = Array.from(groups.values()).map((group) => {
    const price = aggregationMethod === 'mean'
      ? group.prices.reduce((sum, value) => sum + value, 0) / group.prices.length
      : median(group.prices);

    return {
      date: group.date,
      state_name: group.state_name,
      state_id: group.state_id,
      state_key: group.state_key,
      grain: group.grain,
      price: Number(price.toFixed(2)),
      price_low: Number(Math.min(...group.prices).toFixed(2)),
      price_high: Number(Math.max(...group.prices).toFixed(2)),
      arrival: group.arrivals.length
        ? Number(group.arrivals.reduce((sum, value) => sum + value, 0).toFixed(3))
        : null,
      market_count: group.market_count,
      aggregation_method: group.aggregation_method,
      source_cache_key: group.source_cache_key,
      source_fetched_at: group.source_fetched_at,
      updated_at: new Date().toISOString(),
    };
  });

  return { rows, summary: { ...summary, produced: rows.length } };
};

export const upsertAiActuals = async (rowsOrOptions) => {
  const rows = Array.isArray(rowsOrOptions)
    ? rowsOrOptions
    : aggregateMarketRows(rowsOrOptions || {}).rows;

  if (!rows.length) return { insertedOrUpdated: 0, latestDate: null };

  const { error } = await getSupabaseAdmin()
    .from('agmarknet_ai_actuals')
    .upsert(rows, { onConflict: 'date,state_name,grain' });

  if (error) throw new Error(`Failed to upsert AI actuals: ${error.message}`);

  const latestDate = rows.map((row) => row.date).sort().at(-1) || null;
  return { insertedOrUpdated: rows.length, latestDate };
};

export const getAiActualsWatermark = async () => {
  const { data, error } = await getSupabaseAdmin()
    .from('agmarknet_ai_actuals')
    .select('date, updated_at')
    .order('date', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to read AI actuals watermark: ${error.message}`);
  return {
    latestDate: data?.date || null,
    latestUpdatedAt: data?.updated_at || null,
  };
};
