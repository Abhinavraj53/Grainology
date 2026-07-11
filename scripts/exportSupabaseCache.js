import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseAdmin } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const pageSize = Number(process.env.SUPABASE_EXPORT_PAGE_SIZE || 1000);
const outputRoot = path.join(projectRoot, 'staging', 'supabase-cache-dump');

const TABLES = [
  'agmarknet_filters_cache',
  'agmarknet_marketwise_cache',
  'agmarknet_ai_actuals',
  'msp_fallback_prices',
  'ai_prediction_releases',
];

const readTable = async (table) => {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await getSupabaseAdmin()
      .from(table)
      .select('*')
      .range(from, to);

    if (error) {
      return { table, rows, error: error.message };
    }

    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return { table, rows, error: null };
};

const summarizeTable = (table, rows, error) => {
  if (error) return { table, error, row_count: rows.length };

  const summary = { table, row_count: rows.length };
  if (table === 'agmarknet_filters_cache') {
    summary.dashboard_names = rows.map((row) => row.dashboard_name).filter(Boolean);
    summary.fetched_at = rows.map((row) => row.fetched_at).filter(Boolean).sort().at(-1) || null;
  }
  if (table === 'agmarknet_marketwise_cache') {
    summary.latest_fetched_at = rows.map((row) => row.fetched_at).filter(Boolean).sort().at(-1) || null;
    summary.cache_keys = rows.map((row) => row.cache_key).filter(Boolean);
    summary.state_ids = [...new Set(rows.map((row) => Number(row.request_payload?.state)).filter(Number.isFinite))]
      .sort((left, right) => left - right);
    summary.reported_dates = [...new Set(rows.flatMap((row) => row.reported_dates || []))]
      .filter(Boolean)
      .sort();
  }
  if (table === 'agmarknet_ai_actuals') {
    summary.latest_date = rows.map((row) => row.date).filter(Boolean).sort().at(-1) || null;
    summary.states = [...new Set(rows.map((row) => row.state_name).filter(Boolean))].sort();
    summary.grains = [...new Set(rows.map((row) => row.grain).filter(Boolean))].sort();
  }
  if (table === 'ai_prediction_releases') {
    summary.active_releases = rows.filter((row) => row.is_active).map((row) => row.release_id);
    summary.latest_generated_at = rows.map((row) => row.generated_at).filter(Boolean).sort().at(-1) || null;
  }
  return summary;
};

const main = async () => {
  await fs.mkdir(outputRoot, { recursive: true });
  const exportDir = path.join(outputRoot, new Date().toISOString().replace(/[:.]/g, '-'));
  await fs.mkdir(exportDir, { recursive: true });

  const summaries = [];
  for (const table of TABLES) {
    const { rows, error } = await readTable(table);
    await fs.writeFile(
      path.join(exportDir, `${table}.json`),
      JSON.stringify({ table, row_count: rows.length, error, rows }, null, 2),
      'utf-8',
    );
    summaries.push(summarizeTable(table, rows, error));
    console.log(`${table}: ${rows.length} rows${error ? ` (${error})` : ''}`);
  }

  await fs.writeFile(path.join(exportDir, '_summary.json'), JSON.stringify(summaries, null, 2), 'utf-8');
  console.log(`\nExported Supabase cache dump to: ${exportDir}`);
  console.log(JSON.stringify(summaries, null, 2));
};

main().catch((error) => {
  console.error(`Supabase cache export failed: ${error.message}`);
  process.exit(1);
});
