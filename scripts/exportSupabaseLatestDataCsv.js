import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { getSupabaseAdmin } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const outputDir = path.resolve(
  projectRoot,
  process.env.LATEST_DATA_EXPORT_DIR || path.join('staging', 'kaggle-latest-data'),
);
const outputCsv = path.join(outputDir, 'latest_data.csv');
const outputSummary = path.join(outputDir, 'latest_data_summary.json');
const pageSize = Number(process.env.SUPABASE_EXPORT_PAGE_SIZE || 1000);

const CSV_COLUMNS = [
  'state',
  'district',
  'market',
  'commodity',
  'variety',
  'grade',
  'date',
  'min_price',
  'max_price',
  'modal_price',
];

const DEFAULT_BASE_CANDIDATES = [
  path.resolve(projectRoot, '..', 'commodity_forecasting_v36_with_arrival_csv_bundle', 'latest_data.csv'),
  path.resolve(projectRoot, 'staging', 'kaggle-local-sync', 'kaggle-output', 'release', 'canonical_daily.csv'),
];

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const readAllActuals = async () => {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await getSupabaseAdmin()
      .from('agmarknet_ai_actuals')
      .select('*')
      .order('date', { ascending: true })
      .order('state_name', { ascending: true })
      .order('grain', { ascending: true })
      .range(from, to);

    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
};

const resolveBaseCsv = async () => {
  const candidates = [
    process.env.LATEST_DATA_BASE_CSV && path.resolve(projectRoot, process.env.LATEST_DATA_BASE_CSV),
    ...DEFAULT_BASE_CANDIDATES,
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
};

const normalizeCommodity = (grain) => {
  if (grain === 'Paddy') return 'Paddy(Common)';
  return grain;
};

const normalizeSupabaseRow = (row) => {
  const price = Number(row.price);
  const minPrice = Number(row.price_low);
  const maxPrice = Number(row.price_high);
  return {
    state: row.state_name,
    district: 'All Districts',
    market: 'All Markets',
    commodity: normalizeCommodity(row.grain),
    variety: 'Other',
    grade: 'FAQ',
    date: row.date,
    min_price: Number.isFinite(minPrice) && minPrice > 0 ? minPrice : price,
    max_price: Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : price,
    modal_price: price,
  };
};

const readBaseRows = async (baseCsv) => {
  if (!baseCsv) return [];
  const content = await fs.readFile(baseCsv, 'utf-8');
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });

  return rows.map((row) => ({
    state: row.state ?? row.state_name ?? row.State,
    district: row.district ?? row.district_name ?? 'All Districts',
    market: row.market ?? row.market_name ?? 'All Markets',
    commodity: row.commodity ?? row.cmdt_name ?? row.grain,
    variety: row.variety ?? row.variety_name ?? 'Other',
    grade: row.grade ?? 'FAQ',
    date: row.date ?? row.reported_date,
    min_price: row.min_price ?? row.price_low ?? row.price,
    max_price: row.max_price ?? row.price_high ?? row.price,
    modal_price: row.modal_price ?? row.modalprice ?? row.price,
  })).filter((row) => row.date && row.state && row.commodity && Number(row.modal_price) > 0);
};

const rowKey = (row) => [
  row.state,
  row.district,
  row.market,
  row.commodity,
  row.variety,
  row.grade,
  row.date,
].map((part) => String(part || '').trim().toLowerCase()).join('|');

const mergeRows = (baseRows, supabaseRows) => {
  const merged = new Map();
  for (const row of baseRows) {
    merged.set(rowKey(row), row);
  }
  for (const row of supabaseRows) {
    merged.set(rowKey(row), row);
  }
  return Array.from(merged.values()).sort((left, right) => (
    String(left.date).localeCompare(String(right.date))
    || String(left.state).localeCompare(String(right.state))
    || String(left.commodity).localeCompare(String(right.commodity))
    || String(left.market).localeCompare(String(right.market))
  ));
};

const writeCsv = async (rows) => {
  const lines = [
    CSV_COLUMNS.join(','),
    ...rows.map((row) => CSV_COLUMNS.map((column) => csvEscape(row[column])).join(',')),
  ];
  await fs.writeFile(outputCsv, `${lines.join('\n')}\n`, 'utf-8');
};

const writeDatasetMetadata = async () => {
  const datasetId = process.env.KAGGLE_LATEST_DATASET_ID
    || (process.env.KAGGLE_DATASET_SOURCES || '')
      .split(',')
      .map((source) => source.trim())
      .find((source) => /latest-data/i.test(source));

  if (!datasetId) return null;

  const metadata = {
    id: datasetId,
    title: datasetId.split('/').pop(),
    licenses: [{ name: 'CC0-1.0' }],
  };

  await fs.writeFile(
    path.join(outputDir, 'dataset-metadata.json'),
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf-8',
  );
  return datasetId;
};

const main = async () => {
  await fs.mkdir(outputDir, { recursive: true });

  const baseCsv = await resolveBaseCsv();
  const baseRows = await readBaseRows(baseCsv);
  const supabaseRows = (await readAllActuals())
    .map(normalizeSupabaseRow)
    .filter((row) => row.date && row.state && row.commodity && Number(row.modal_price) > 0);
  const rows = mergeRows(baseRows, supabaseRows);

  await writeCsv(rows);
  const datasetId = await writeDatasetMetadata();

  const summary = {
    generated_at: new Date().toISOString(),
    base_csv: baseCsv,
    base_row_count: baseRows.length,
    supabase_row_count: supabaseRows.length,
    row_count: rows.length,
    latest_date: rows.map((row) => row.date).sort().at(-1) || null,
    states: [...new Set(rows.map((row) => row.state))].sort(),
    commodities: [...new Set(rows.map((row) => row.commodity))].sort(),
    output_csv: outputCsv,
    kaggle_dataset_id: datasetId,
  };

  await fs.writeFile(outputSummary, `${JSON.stringify(summary, null, 2)}\n`, 'utf-8');
  console.log(JSON.stringify(summary, null, 2));
};

main().catch((error) => {
  console.error(`Latest data CSV export failed: ${error.message}`);
  process.exit(1);
});
