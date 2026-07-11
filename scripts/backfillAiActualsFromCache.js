import 'dotenv/config';
import { getSupabaseAdmin } from '../config/supabase.js';
import { aggregateMarketRows, upsertAiActuals } from '../services/aiActualsService.js';

const apply = process.argv.includes('--apply');
const dryRun = process.argv.includes('--dry-run') || !apply;
const pageSize = Number(process.env.AI_ACTUALS_BACKFILL_PAGE_SIZE || 500);

const buildStateNameMap = async () => {
  const { data, error } = await getSupabaseAdmin()
    .from('agmarknet_filters_cache')
    .select('data')
    .eq('dashboard_name', 'marketwise_price_arrival')
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const stateRows = data?.data?.state_data || data?.data?.states || [];
  return new Map(stateRows
    .map((state) => [Number(state.state_id ?? state.id ?? state.value), state.state_name ?? state.name ?? state.label])
    .filter(([id, name]) => Number.isFinite(id) && name));
};

const resolveStateName = (payload, stateNameMap) => {
  const state = Number(payload?.state);
  if (state === 100006) return 'All States';
  return stateNameMap.get(state) || payload?.state_name || payload?.stateName || `State ${state}`;
};

const run = async () => {
  const stateNameMap = await buildStateNameMap();
  let from = 0;
  let scanned = 0;
  let produced = 0;
  let written = 0;
  let latestDate = null;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await getSupabaseAdmin()
      .from('agmarknet_marketwise_cache')
      .select('cache_key, request_payload, records, fetched_at')
      .order('fetched_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    for (const cacheRow of data) {
      scanned += 1;
      const stateId = cacheRow.request_payload?.state;
      if (!Number.isFinite(Number(stateId))) {
        continue;
      }
      const { rows } = aggregateMarketRows({
        stateId,
        stateName: resolveStateName(cacheRow.request_payload, stateNameMap),
        records: cacheRow.records,
        cacheKey: cacheRow.cache_key,
        fetchedAt: cacheRow.fetched_at,
      });
      produced += rows.length;
      if (dryRun || rows.length === 0) continue;
      const result = await upsertAiActuals(rows);
      written += result.insertedOrUpdated;
      latestDate = [latestDate, result.latestDate].filter(Boolean).sort().at(-1) || latestDate;
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log({
    mode: dryRun ? 'dry-run' : 'apply',
    scannedCacheRows: scanned,
    producedActualRows: produced,
    writtenActualRows: written,
    latestDate,
  });
};

run().catch((error) => {
  console.error(`AI actuals backfill failed: ${error.message}`);
  process.exit(1);
});
