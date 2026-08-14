import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseAdmin } from '../config/supabase.js';
import { buildAiReasoning } from './aiReasoningService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_DATA_DIR = path.join(__dirname, 'ml-pipeline', 'dashboard', 'data');
const DEFAULT_TTL_MS = Number(process.env.AI_RELEASE_CACHE_TTL_SECONDS || 300) * 1000;
const DEFAULT_TRANSPORT_BASE_RS_PER_QUINTAL = Number(process.env.MANDI_TRANSPORT_BASE_RS_PER_QUINTAL || 20);
const DEFAULT_TRANSPORT_RS_PER_QUINTAL_KM = Number(process.env.MANDI_TRANSPORT_RS_PER_QUINTAL_KM || 1.8);
const DEFAULT_HANDLING_RS_PER_QUINTAL = Number(process.env.MANDI_HANDLING_RS_PER_QUINTAL || 15);

let releaseCache = {
  releaseId: null,
  activeRelease: null,
  files: new Map(),
  lastFetchedAt: 0,
};

let lastGoodReleaseCache = null;

const sourceMode = () => {
  const configured = process.env.AI_PREDICTIONS_SOURCE || '';
  if (
    process.env.NODE_ENV === 'production'
    && configured === 'local_files'
    && process.env.AI_ALLOW_LOCAL_FILES_IN_PRODUCTION !== 'true'
  ) {
    return 'supabase_release';
  }
  return configured || (process.env.NODE_ENV === 'production' ? 'supabase_release' : 'local_files');
};
const MAX_STATE_FORECAST_STALE_DAYS = Number(process.env.AI_STATE_FORECAST_MAX_STALE_DAYS || 30);

export const invalidateReleaseCache = () => {
  releaseCache = {
    releaseId: null,
    activeRelease: null,
    files: new Map(),
    lastFetchedAt: 0,
  };
};

const readLocalJson = async (fileName) => {
  const content = await fs.readFile(path.join(LOCAL_DATA_DIR, fileName), 'utf-8');
  return JSON.parse(content);
};

const loadOptionalReleaseJson = async (fileName, fallback = null) => {
  try {
    return await loadReleaseJson(fileName);
  } catch {
    return fallback;
  }
};

export const getActiveReleaseMetadata = async () => {
  if (sourceMode() === 'local_files') {
    try {
      const manifest = await readLocalJson('manifest.json');
      return {
        release_id: manifest.release_id || manifest.run_id || 'local-files',
        artifact_prefix: 'local',
        schema_version: manifest.schema_version || 'local',
        data_latest_date: manifest.data_latest_date || null,
        generated_at: manifest.generated_at || null,
        manifest,
        source: 'local_files',
      };
    } catch {
      return {
        release_id: 'local-files',
        artifact_prefix: 'local',
        schema_version: 'local',
        data_latest_date: null,
        generated_at: null,
        manifest: {},
        source: 'local_files',
      };
    }
  }

  const now = Date.now();
  if (releaseCache.activeRelease && now - releaseCache.lastFetchedAt < DEFAULT_TTL_MS) {
    return releaseCache.activeRelease;
  }

  const { data, error } = await getSupabaseAdmin()
    .from('ai_prediction_releases')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (lastGoodReleaseCache?.activeRelease) return lastGoodReleaseCache.activeRelease;
    throw new Error(error?.message || 'No active AI prediction release is available');
  }

  if (releaseCache.releaseId !== data.release_id) {
    releaseCache = {
      releaseId: data.release_id,
      activeRelease: { ...data, source: 'supabase_release' },
      files: new Map(),
      lastFetchedAt: now,
    };
  } else {
    releaseCache.activeRelease = { ...data, source: 'supabase_release' };
    releaseCache.lastFetchedAt = now;
  }

  lastGoodReleaseCache = releaseCache;
  return releaseCache.activeRelease;
};

export const loadReleaseJson = async (fileName) => {
  if (sourceMode() === 'local_files') return readLocalJson(fileName);

  const release = await getActiveReleaseMetadata();
  const cacheKey = `${release.release_id}:${fileName}`;
  if (releaseCache.files.has(cacheKey)) return releaseCache.files.get(cacheKey);

  const objectPath = `${release.artifact_prefix}/${fileName}`;
  const { data, error } = await getSupabaseAdmin()
    .storage
    .from(process.env.AI_PREDICTION_BUCKET || 'ai-predictions')
    .download(objectPath);

  if (error) {
    const fallback = lastGoodReleaseCache?.files?.get(cacheKey);
    if (fallback) return fallback;
    throw new Error(`Failed to download ${objectPath}: ${error.message}`);
  }

  const parsed = JSON.parse(await data.text());
  releaseCache.files.set(cacheKey, parsed);
  lastGoodReleaseCache = releaseCache;
  return parsed;
};

const pickStatePayload = (payload, grain, state) => payload?.[grain]?.[state] || null;

const normalizeTextKey = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const normalizeMarketKey = (market) => {
  if (!market) return '';
  if (typeof market === 'string') return normalizeTextKey(market);
  return String(
    market.market_key
    || market.market_id
    || market.id
    || [
      market.state || market.state_name,
      market.district || market.district_name,
      market.market || market.market_name || market.mandi_name,
    ].filter(Boolean).join('::')
  );
};

const finiteNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const haversineKm = (lat1, lon1, lat2, lon2) => {
  const leftLat = finiteNumber(lat1);
  const leftLon = finiteNumber(lon1);
  const rightLat = finiteNumber(lat2);
  const rightLon = finiteNumber(lon2);
  if ([leftLat, leftLon, rightLat, rightLon].some((value) => value == null)) return null;

  const radiusKm = 6371;
  const toRad = (degree) => (degree * Math.PI) / 180;
  const dLat = toRad(rightLat - leftLat);
  const dLon = toRad(rightLon - leftLon);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(leftLat)) * Math.cos(toRad(rightLat)) * Math.sin(dLon / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const carryingCostForDistance = (distanceKm) => {
  const distance = Math.max(0, finiteNumber(distanceKm) || 0);
  const base = Number.isFinite(DEFAULT_TRANSPORT_BASE_RS_PER_QUINTAL) ? DEFAULT_TRANSPORT_BASE_RS_PER_QUINTAL : 20;
  const perKm = Number.isFinite(DEFAULT_TRANSPORT_RS_PER_QUINTAL_KM) ? DEFAULT_TRANSPORT_RS_PER_QUINTAL_KM : 1.8;
  const handling = Number.isFinite(DEFAULT_HANDLING_RS_PER_QUINTAL) ? DEFAULT_HANDLING_RS_PER_QUINTAL : 15;
  return {
    transport_base_rs_per_quintal: roundCurrency(base),
    transport_rs_per_quintal_km: roundCurrency(perKm),
    handling_rs_per_quintal: roundCurrency(handling),
    total_carrying_cost_rs_per_quintal: roundCurrency(base + handling + (distance * perKm)),
  };
};

const roundCurrency = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : null;
};

export const applyFarmGatePrices = (prediction, carryingCost) => {
  if (!prediction || !carryingCost) return prediction;
  const totalCost = finiteNumber(carryingCost.total_carrying_cost_rs_per_quintal) || 0;
  const out = JSON.parse(JSON.stringify(prediction));
  const currentPrice = finiteNumber(out.current_price);
  if (currentPrice != null) {
    out.farm_gate_current_price = roundCurrency(Math.max(0, currentPrice - totalCost));
    out.carrying_cost_rs_per_quintal = roundCurrency(totalCost);
  }

  for (const horizonPayload of Object.values(out.horizons || {})) {
    if (horizonPayload?.prediction_interval) {
      const intervalLower = finiteNumber(horizonPayload.prediction_interval.lower);
      const intervalUpper = finiteNumber(horizonPayload.prediction_interval.upper);
      if (finiteNumber(horizonPayload.confidence_lower) == null && intervalLower != null) {
        horizonPayload.confidence_lower = roundCurrency(intervalLower);
      }
      if (finiteNumber(horizonPayload.confidence_upper) == null && intervalUpper != null) {
        horizonPayload.confidence_upper = roundCurrency(intervalUpper);
      }
    }
    const predicted = finiteNumber(horizonPayload?.predicted_price);
    if (predicted != null) {
      horizonPayload.farm_gate_predicted_price = roundCurrency(Math.max(0, predicted - totalCost));
      horizonPayload.carrying_cost_rs_per_quintal = roundCurrency(totalCost);
    }
    for (const key of ['confidence_lower', 'confidence_upper']) {
      const value = finiteNumber(horizonPayload?.[key]);
      if (value != null) horizonPayload[`farm_gate_${key}`] = roundCurrency(Math.max(0, value - totalCost));
    }
    if (horizonPayload?.prediction_interval) {
      const lower = finiteNumber(horizonPayload.prediction_interval.lower);
      const upper = finiteNumber(horizonPayload.prediction_interval.upper);
      horizonPayload.farm_gate_prediction_interval = {
        ...horizonPayload.prediction_interval,
        lower: lower == null ? null : roundCurrency(Math.max(0, lower - totalCost)),
        upper: upper == null ? null : roundCurrency(Math.max(0, upper - totalCost)),
      };
    }
  }
  return out;
};

const flattenMarkets = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.markets)) return payload.markets;
  if (!payload || typeof payload !== 'object') return [];
  return Object.values(payload).flatMap((value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value).filter((item) => item && typeof item === 'object');
    return [];
  });
};

const pickMarketPayload = (payload, grain, marketKey) => {
  const byGrain = payload?.[grain] || {};
  if (!marketKey) return null;
  return byGrain[marketKey]
    || byGrain[String(marketKey)]
    || byGrain[normalizeTextKey(marketKey)]
    || Object.values(byGrain).find((entry) => {
      const key = normalizeMarketKey(entry?.market || entry?.market_context || entry);
      return key && key === normalizeTextKey(marketKey);
    })
    || null;
};

export const findMarket = (markets, { marketId, market_id: marketIdSnake, market, state, district, lat, lng }) => {
  const requestedId = String(marketId || marketIdSnake || '').trim();
  const requestedMarket = normalizeTextKey(market);
  const requestedState = normalizeTextKey(state);
  const requestedDistrict = normalizeTextKey(district);

  const filtered = markets.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    if (requestedState && requestedState !== 'all-states') {
      const itemState = normalizeTextKey(item.state || item.state_name);
      if (itemState && itemState !== requestedState) return false;
    }
    if (requestedDistrict) {
      const itemDistrict = normalizeTextKey(item.district || item.district_name);
      if (itemDistrict && itemDistrict !== requestedDistrict) return false;
    }
    return true;
  });

  if (requestedId) {
    const byId = filtered.find((item) => String(item.market_id || item.id || '').trim() === requestedId);
    if (byId) return { market: byId, distance_km: null, match_mode: 'market_id' };
  }

  if (requestedMarket) {
    const byName = filtered.find((item) => normalizeTextKey(item.market || item.market_name || item.mandi_name) === requestedMarket);
    if (byName) return { market: byName, distance_km: null, match_mode: 'market_name' };
  }

  const userLat = finiteNumber(lat);
  const userLng = finiteNumber(lng);
  if (userLat != null && userLng != null) {
    const withDistance = filtered
      .map((item) => ({
        market: item,
        distance_km: haversineKm(userLat, userLng, item.lat ?? item.latitude, item.lng ?? item.lon ?? item.longitude),
      }))
      .filter((item) => item.distance_km != null)
      .sort((left, right) => left.distance_km - right.distance_km);
    if (withDistance.length) return { ...withDistance[0], match_mode: 'nearest_location' };
  }

  return filtered.length ? { market: filtered[0], distance_km: null, match_mode: 'first_available' } : null;
};

const downloadReleaseJson = async (release, relativePath) => {
  const cacheKey = `${release.release_id}:${relativePath}`;
  if (releaseCache.files.has(cacheKey)) return releaseCache.files.get(cacheKey);

  const objectPath = `${release.artifact_prefix}/${relativePath}`;
  const { data, error } = await getSupabaseAdmin()
    .storage
    .from(process.env.AI_PREDICTION_BUCKET || 'ai-predictions')
    .download(objectPath);

  if (error) throw new Error(`Failed to download ${objectPath}: ${error.message}`);

  const parsed = JSON.parse(await data.text());
  releaseCache.files.set(cacheKey, parsed);
  lastGoodReleaseCache = releaseCache;
  return parsed;
};

const getChunkedEfficiencyPayload = async (grain, state, horizon) => {
  if (sourceMode() === 'local_files') return null;

  const release = await getActiveReleaseMetadata();
  let index = null;
  try {
    index = await downloadReleaseJson(release, 'historical_efficiency.index.json');
  } catch {
    return null;
  }

  const byState = index?.chunks?.[grain];
  const selected = byState?.[state] || null;
  const chunkPath = selected?.[String(horizon)] || selected?.[Number(horizon)] || selected?.all;
  if (!chunkPath) return null;

  return downloadReleaseJson(release, chunkPath);
};

const daysBetween = (leftDate, rightDate) => {
  const left = new Date(leftDate).getTime();
  const right = new Date(rightDate).getTime();
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return Math.floor((left - right) / (1000 * 60 * 60 * 24));
};

const hasUsableSamples = (prediction) => {
  const horizons = Object.values(prediction?.horizons || {});
  if (!horizons.length) return false;
  return horizons.some((horizon) => Number(horizon?.metrics?.sample_count || 0) > 0 || horizon?.selected_method === 'ml');
};

const getStaleReason = (prediction, meta) => {
  if (!prediction) return 'missing prediction';

  const latestDate = meta?.data_latest_date;
  const actualDate = prediction.last_actual_date || prediction.last_data_date;
  if (!actualDate) return 'missing latest actual date';

  if (latestDate) {
    const ageDays = daysBetween(latestDate, actualDate);
    if (ageDays != null && ageDays > MAX_STATE_FORECAST_STALE_DAYS) {
      return `state data is ${ageDays} days behind the release latest date`;
    }
  }

  if (!hasUsableSamples(prediction)) {
    return 'not enough recent samples for this state/grain';
  }

  return null;
};

export const getPredictionMeta = async () => {
  const release = await getActiveReleaseMetadata();
  const predictions = await loadReleaseJson('predictions.json').catch(() => ({}));
  const statesFile = await loadReleaseJson('states.json').catch(() => null);
  const marketsFile = await loadOptionalReleaseJson('markets.json', null);
  const evaluationReport = await loadOptionalReleaseJson('evaluation_report.json', null);
  const driftReport = await loadOptionalReleaseJson('data_drift_report.json', null);
  const publishQuality = await loadOptionalReleaseJson('publish_quality_report.json', null);
  const markets = flattenMarkets(marketsFile);
  const manifest = release.manifest || {};
  const grains = manifest.grains || Object.keys(predictions || {});
  const rawStates = manifest.states
    || statesFile?.states
    || Array.from(new Set(Object.values(predictions || {}).flatMap((grainMap) => Object.keys(grainMap || {}))));
  const states = rawStates
    .map((state) => (typeof state === 'string' ? state : state?.state_name))
    .filter(Boolean);

  return {
    release_id: release.release_id,
    generated_at: release.generated_at || manifest.generated_at || null,
    data_latest_date: release.data_latest_date || manifest.data_latest_date || null,
    schema_version: release.schema_version || manifest.schema_version || null,
    source: release.source,
    grains,
    states,
    markets: markets.slice(0, 5000).map((market) => ({
      market_key: normalizeMarketKey(market),
      market_id: market.market_id || market.id || null,
      market_name: market.market_name || market.market || market.mandi_name || null,
      district: market.district || market.district_name || null,
      state: market.state || market.state_name || null,
      lat: finiteNumber(market.lat ?? market.latitude),
      lng: finiteNumber(market.lng ?? market.lon ?? market.longitude),
      grain_count: finiteNumber(market.grain_count),
      row_count: finiteNumber(market.row_count),
      latest_date: market.latest_date || null,
    })),
    market_prediction_available: Boolean(markets.length || manifest.market_prediction_available),
    evaluation: evaluationReport?.summary || null,
    evaluation_strategy: evaluationReport?.evaluation_strategy || null,
    data_drift: driftReport?.summary || null,
    publish_quality: publishQuality ? {
      passed: publishQuality.passed,
      warning_count: Array.isArray(publishQuality.warnings) ? publishQuality.warnings.length : 0,
    } : null,
  };
};

export const getPredictionForState = async (grain, state, options = {}) => {
  const selectedState = state || 'All States';
  const meta = await getPredictionMeta();
  const [predictions, actuals, forecastSeries, reasoning] = await Promise.all([
    loadReleaseJson('predictions.json'),
    loadReleaseJson('actuals.json').catch(() => ({})),
    loadReleaseJson('forecast_series.json').catch(() => ({})),
    loadReleaseJson('reasoning.json').catch(() => ({})),
  ]);

  if (
    options?.market_id
    || options?.market
    || options?.nearest === true
    || (finiteNumber(options?.lat) != null && finiteNumber(options?.lng) != null)
  ) {
    const marketPayload = await getPredictionForMarket(grain, selectedState, options, {
      meta,
      stateFiles: { predictions, actuals, forecastSeries, reasoning },
    });
    if (marketPayload) return marketPayload;
  }

  let effectiveState = selectedState;
  let prediction = pickStatePayload(predictions, grain, selectedState);
  let fallback_reason = null;

  if (selectedState !== 'All States') {
    const staleReason = getStaleReason(prediction, meta);
    if (staleReason) {
      const fallbackPrediction = pickStatePayload(predictions, grain, 'All States');
      if (fallbackPrediction) {
        effectiveState = 'All States';
        prediction = fallbackPrediction;
        fallback_reason = `${selectedState} forecast was replaced with All States because ${staleReason}.`;
      }
    }
  }

  if (!prediction) {
    throw new Error(`No prediction found for ${grain} / ${selectedState}`);
  }

  const selectedActuals = pickStatePayload(actuals, grain, effectiveState);

  return {
    meta,
    grain,
    requested_state: selectedState,
    state: effectiveState,
    fallback_reason,
    prediction,
    actuals: selectedActuals,
    forecast_series: pickStatePayload(forecastSeries, grain, effectiveState),
    reasoning: reasoning?.[grain]?.[effectiveState] || reasoning?.[grain] || null,
    market_context: null,
  };
};

export const getPredictionForMarket = async (grain, state, options = {}, context = {}) => {
  const meta = context.meta || await getPredictionMeta();
  const [marketPredictions, marketActuals, marketForecastSeries, marketReasoning, marketsFile] = await Promise.all([
    loadOptionalReleaseJson('market_predictions.json', {}),
    loadOptionalReleaseJson('market_actuals.json', {}),
    loadOptionalReleaseJson('market_forecast_series.json', {}),
    loadOptionalReleaseJson('market_reasoning.json', {}),
    loadOptionalReleaseJson('markets.json', null),
  ]);

  const markets = flattenMarkets(marketsFile || meta.markets || []);
  const selected = findMarket(markets, { ...options, state });
  const market = selected?.market || null;
  const marketKey = normalizeMarketKey(market) || normalizeTextKey(options.market_id || options.market);
  const payload = pickMarketPayload(marketPredictions, grain, marketKey);

  if (!payload) {
    if (!context.stateFiles) return null;
    const fallback = await getPredictionForState(grain, state, {});
    return {
      ...fallback,
      fallback_reason: fallback.fallback_reason || 'Mandi-level forecast is not available yet; showing state-level forecast.',
      market_context: {
        mode: 'state_fallback',
        requested_nearest: Boolean(options.nearest || options.lat || options.lng || options.market_id || options.market),
        market_key: marketKey || null,
        market_name: market?.market_name || market?.market || market?.mandi_name || options.market || null,
        market_id: market?.market_id || market?.id || options.market_id || null,
        state: market?.state || market?.state_name || state || null,
        district: market?.district || market?.district_name || options.district || null,
        distance_km: selected?.distance_km == null ? null : roundCurrency(selected.distance_km),
        match_mode: selected?.match_mode || 'none',
        note: 'Release does not contain market_predictions.json for this mandi/grain.',
      },
    };
  }

  const distanceKm = finiteNumber(payload.distance_km) ?? selected?.distance_km ?? finiteNumber(options.distance_km);
  const carryingCost = carryingCostForDistance(distanceKm);
  const marketContext = {
    mode: 'market',
    market_key: marketKey,
    market_id: payload.market_id || market?.market_id || market?.id || options.market_id || null,
    market_name: payload.market_name || market?.market_name || market?.market || market?.mandi_name || options.market || null,
    district: payload.district || market?.district || market?.district_name || options.district || null,
    state: payload.state || market?.state || market?.state_name || state || null,
    lat: finiteNumber(payload.lat ?? market?.lat ?? market?.latitude),
    lng: finiteNumber(payload.lng ?? market?.lng ?? market?.lon ?? market?.longitude),
    distance_km: distanceKm == null ? null : roundCurrency(distanceKm),
    match_mode: selected?.match_mode || 'market_release',
    ...carryingCost,
  };

  return {
    meta,
    grain,
    requested_state: state || 'All States',
    state: marketContext.state || state || 'All States',
    fallback_reason: null,
    prediction: applyFarmGatePrices(payload.prediction || payload, carryingCost),
    actuals: pickMarketPayload(marketActuals, grain, marketKey) || payload.actuals || null,
    forecast_series: pickMarketPayload(marketForecastSeries, grain, marketKey) || payload.forecast_series || null,
    reasoning: pickMarketPayload(marketReasoning, grain, marketKey) || payload.reasoning || null,
    market_context: marketContext,
  };
};

export const getReasoningForState = async (grain, state, horizon, options = {}) => {
  const payload = await getPredictionForState(grain, state, options);
  const selectedHorizon = Number(horizon || 7);
  const stateReasoning = payload.reasoning?.[selectedHorizon]
    || payload.reasoning?.[String(selectedHorizon)]
    || payload.reasoning
    || null;

  return {
    meta: payload.meta,
    grain: payload.grain,
    requested_state: payload.requested_state,
    state: payload.state,
    fallback_reason: payload.fallback_reason,
    horizon: selectedHorizon,
    reasoning: await buildAiReasoning({
      grain: payload.grain,
      state: payload.state,
      horizon: selectedHorizon,
      prediction: payload.prediction,
      actuals: payload.actuals,
      forecastSeries: payload.forecast_series,
      existingReasoning: stateReasoning,
      meta: payload.meta,
      marketContext: payload.market_context,
    }),
    market_context: payload.market_context,
  };
};

export const getEfficiencyForState = async (grain, state, horizon) => {
  const selectedState = state || 'All States';
  const selectedHorizon = String(horizon || 7);
  const meta = await getPredictionMeta();
  let effectiveState = selectedState;
  let payload = await getChunkedEfficiencyPayload(grain, selectedState, selectedHorizon);
  let fallback_reason = null;

  if (!payload && selectedState !== 'All States') {
    payload = await getChunkedEfficiencyPayload(grain, 'All States', selectedHorizon);
    if (payload) {
      effectiveState = 'All States';
      fallback_reason = `${selectedState} efficiency series is not available; showing All States validation.`;
    }
  }

  if (!payload) {
    const efficiency = await loadReleaseJson('historical_efficiency.json');
    let statePayload = pickStatePayload(efficiency, grain, selectedState);

    if (!statePayload && selectedState !== 'All States') {
      statePayload = pickStatePayload(efficiency, grain, 'All States');
      if (statePayload) {
        effectiveState = 'All States';
        fallback_reason = `${selectedState} efficiency series is not available; showing All States validation.`;
      }
    }

    payload = statePayload?.[selectedHorizon] || statePayload?.[Number(selectedHorizon)] || statePayload;
  }

  if (!payload) {
    throw new Error(`No efficiency series found for ${grain} / ${selectedState} / ${selectedHorizon}`);
  }

  return {
    meta,
    grain,
    requested_state: selectedState,
    state: effectiveState,
    fallback_reason,
    horizon: Number(selectedHorizon),
    efficiency: payload,
  };
};

export const getPredictionStatus = async () => {
  try {
    const meta = await getPredictionMeta();
    return { available: true, ...meta };
  } catch (error) {
    return {
      available: false,
      source: sourceMode(),
      error: error.message,
    };
  }
};
