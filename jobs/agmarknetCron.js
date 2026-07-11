import cron from 'node-cron';
import { getAgmarknetFilters, getMarketwiseData } from '../services/agmarknetService.js';
import { aggregateMarketRows, upsertAiActuals } from '../services/aiActualsService.js';

const ALL_STATES_ID = 100006;
const CONCURRENCY = Number(process.env.AGMARKNET_STATE_SYNC_CONCURRENCY || 3);
const STATE_DELAY_MS = Number(process.env.AGMARKNET_STATE_SYNC_DELAY_MS || 500);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const extractStates = (filters) => {
  const rawStates = filters?.data?.state_data || filters?.data?.states || filters?.states || [];
  const states = rawStates
    .map((state) => ({
      id: Number(state.id ?? state.value ?? state.state_id ?? state.stateId),
      name: String(state.name ?? state.label ?? state.state_name ?? state.stateName ?? '').trim(),
    }))
    .filter((state) => Number.isFinite(state.id) && state.id !== ALL_STATES_ID);

  return [
    { id: ALL_STATES_ID, name: 'All States' },
    ...states,
  ];
};

const fetchStateWithRetry = async (state, attempts = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await getMarketwiseData({ state: state.id }, { forceRefresh: true });
      const { rows, summary } = aggregateMarketRows({
        stateId: state.id,
        stateName: state.name,
        records: result.records,
        cacheKey: result.cacheKey,
        fetchedAt: result.fetchedAt,
      });
      const upsert = await upsertAiActuals(rows);
      return {
        state,
        source: result.source,
        count: result.count,
        actualRows: rows.length,
        latestDate: upsert.latestDate,
        skipped: summary.skipped,
      };
    } catch (error) {
      lastError = error;
      await delay(750 * attempt);
    }
  }

  return {
    state,
    error: lastError?.message || 'Unknown Agmarknet state sync error',
  };
};

const runPool = async (items, worker) => {
  const results = [];
  let index = 0;

  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      results.push(await worker(current));
      await delay(STATE_DELAY_MS);
    }
  });

  await Promise.all(workers);
  return results;
};

export const syncAgmarknet = async () => {
  const startedAt = new Date().toISOString();
  console.log(`Starting daily Agmarknet sync at ${startedAt}`);

  const filters = await getAgmarknetFilters({ forceRefresh: true });
  const states = extractStates(filters);
  console.log(`Agmarknet filter cache updated; syncing ${states.length} state scopes`);

  const results = await runPool(states, fetchStateWithRetry);
  const failures = results.filter((result) => result.error);
  const successes = results.filter((result) => !result.error);
  const latestDate = successes
    .map((result) => result.latestDate)
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  if (failures.length > 0) {
    console.warn('Agmarknet partial state failures:', failures.map((failure) => ({
      state: failure.state.name,
      id: failure.state.id,
      error: failure.error,
    })));
  }

  console.log('Agmarknet sync summary:', {
    startedAt,
    completedAt: new Date().toISOString(),
    successCount: successes.length,
    failureCount: failures.length,
    latestDate,
    totalActualRows: successes.reduce((sum, result) => sum + result.actualRows, 0),
  });

  return { successes, failures, latestDate };
};

export const startAgmarknetCron = () => {
  const task = cron.schedule('0 30 6 * * *', () => {
    syncAgmarknet().catch((error) => {
      console.error(`Daily Agmarknet sync failed: ${error.message}`);
    });
  }, { timezone: 'Asia/Kolkata' });

  console.log('Agmarknet daily sync scheduled for 6:30 AM Asia/Kolkata');
  return task;
};
