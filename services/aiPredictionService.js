import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseAdmin } from '../config/supabase.js';
import { buildAiReasoning } from './aiReasoningService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_DATA_DIR = path.join(__dirname, 'ml-pipeline', 'dashboard', 'data');
const DEFAULT_TTL_MS = Number(process.env.AI_RELEASE_CACHE_TTL_SECONDS || 300) * 1000;

let releaseCache = {
  releaseId: null,
  activeRelease: null,
  files: new Map(),
  lastFetchedAt: 0,
};

let lastGoodReleaseCache = null;

const sourceMode = () => process.env.AI_PREDICTIONS_SOURCE || 'local_files';
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
  };
};

export const getPredictionForState = async (grain, state) => {
  const selectedState = state || 'All States';
  const meta = await getPredictionMeta();
  const [predictions, actuals, forecastSeries, reasoning] = await Promise.all([
    loadReleaseJson('predictions.json'),
    loadReleaseJson('actuals.json').catch(() => ({})),
    loadReleaseJson('forecast_series.json').catch(() => ({})),
    loadReleaseJson('reasoning.json').catch(() => ({})),
  ]);

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
  };
};

export const getReasoningForState = async (grain, state, horizon) => {
  const payload = await getPredictionForState(grain, state);
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
    }),
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
