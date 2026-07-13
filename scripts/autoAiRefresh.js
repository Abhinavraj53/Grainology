import 'dotenv/config';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getAgmarknetFilters,
  getCachedStateIds,
  getMarketwiseData,
} from '../services/agmarknetService.js';
import { aggregateMarketRows, getAiActualsWatermark, upsertAiActuals } from '../services/aiActualsService.js';
import { syncAgmarknet } from '../jobs/agmarknetCron.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const stateDir = path.resolve(projectRoot, process.env.AI_AUTO_STATE_DIR || path.join('staging', 'ai-auto-refresh'));
const lockPath = path.join(stateDir, 'refresh.lock');
const statusPath = path.join(stateDir, 'status.json');

const ALL_STATES_ID = 100006;
const pollMinutes = Number(process.env.AI_AUTO_CHECK_MINUTES || 15);
const cacheCoverageRatio = Number(process.env.AI_AUTO_MIN_STATE_CACHE_COVERAGE || 0.85);
const runOnce = process.argv.includes('--once');
const forceRun = process.argv.includes('--force') || process.env.AI_AUTO_FORCE === 'true';
const skipKaggle = process.argv.includes('--skip-kaggle') || process.env.AI_AUTO_SKIP_KAGGLE === 'true';
const publishSupabaseRelease = process.env.AI_AUTO_PUBLISH_SUPABASE_RELEASE === 'true';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runCommand = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: process.env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    stdout += text;
    if (options.live) process.stdout.write(text);
  });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderr += text;
    if (options.live) process.stderr.write(text);
  });
  child.on('error', reject);
  child.on('close', (code) => {
    if (code === 0) resolve({ stdout, stderr });
    else reject(new Error(`${command} ${args.join(' ')} failed with code ${code}\n${stderr || stdout}`));
  });
});

const writeStatus = async (patch) => {
  await fs.mkdir(stateDir, { recursive: true });
  let previous = {};
  try {
    previous = JSON.parse(await fs.readFile(statusPath, 'utf-8'));
  } catch {
    // First run.
  }
  const next = { ...previous, ...patch, updated_at: new Date().toISOString() };
  await fs.writeFile(statusPath, `${JSON.stringify(next, null, 2)}\n`, 'utf-8');
  return next;
};

const acquireLock = async () => {
  await fs.mkdir(stateDir, { recursive: true });
  try {
    const handle = await fs.open(lockPath, 'wx');
    await handle.writeFile(JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }));
    await handle.close();
    return true;
  } catch {
    return false;
  }
};

const releaseLock = async () => {
  await fs.rm(lockPath, { force: true });
};

const parseAgmarknetDate = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return null;
};

const extractStates = (filters) => {
  const rawStates = filters?.data?.state_data || filters?.data?.states || filters?.states || [];
  return rawStates
    .map((state) => Number(state.id ?? state.value ?? state.state_id ?? state.stateId))
    .filter((id) => Number.isFinite(id) && id !== ALL_STATES_ID);
};

const detectLatestAgmarknetDate = async () => {
  let result;
  try {
    result = await getMarketwiseData({ state: ALL_STATES_ID }, { forceRefresh: true });
  } catch (liveError) {
    console.warn(`Live Agmarknet latest-date check failed: ${liveError.message}`);
    try {
      result = await getMarketwiseData({ state: ALL_STATES_ID }, { forceRefresh: false });
      console.warn('Continuing latest-date check with cached All States marketwise data.');
    } catch (cacheError) {
      const watermark = await getAiActualsWatermark();
      return {
        latestAgmarknetDate: watermark.latestDate || null,
        allStatesActualRows: 0,
        allStatesCacheKey: null,
        warning: `Agmarknet latest-date check unavailable; using AI actuals watermark. live=${liveError.message}; cache=${cacheError.message}`,
      };
    }
  }

  const { rows } = aggregateMarketRows({
    stateId: ALL_STATES_ID,
    stateName: 'All States',
    records: result.records,
    cacheKey: result.cacheKey,
    fetchedAt: result.fetchedAt,
  });
  await upsertAiActuals(rows);

  const latestFromReported = (result.reportedDates || [])
    .map(parseAgmarknetDate)
    .filter(Boolean)
    .sort()
    .at(-1) || null;
  const latestFromRows = rows.map((row) => row.date).sort().at(-1) || null;

  return {
    latestAgmarknetDate: [latestFromReported, latestFromRows].filter(Boolean).sort().at(-1) || null,
    allStatesActualRows: rows.length,
    allStatesCacheKey: result.cacheKey,
    source: result.source,
    stale: Boolean(result.stale),
  };
};

const needsStateSync = async () => {
  const [filters, cachedStateIds] = await Promise.all([
    getAgmarknetFilters({ forceRefresh: false }),
    getCachedStateIds(),
  ]);
  const expectedStates = extractStates(filters);
  const expectedCount = expectedStates.length + 1; // Include All States.
  const cachedCount = new Set(cachedStateIds).size;
  const coverage = expectedCount ? cachedCount / expectedCount : 0;
  return {
    expectedCount,
    cachedCount,
    coverage,
    insufficientCoverage: coverage < cacheCoverageRatio,
  };
};

const publishSupabase = async () => {
  const releaseDir = path.join(projectRoot, 'staging', 'kaggle-local-sync', 'release');
  await runCommand('python', ['automation/publish_kaggle_release.py', '--bundle-dir', releaseDir], { live: true });
};

const refreshOnce = async () => {
  const lockAcquired = await acquireLock();
  if (!lockAcquired) {
    console.log('AI refresh is already running; skipping this tick.');
    return;
  }

  const startedAt = new Date().toISOString();
  await writeStatus({ status: 'running', started_at: startedAt, error: null });

  try {
    const watermarkBefore = await getAiActualsWatermark();
    const freshness = await detectLatestAgmarknetDate();
    let coverage;
    try {
      coverage = await needsStateSync();
    } catch (coverageError) {
      coverage = {
        expectedCount: 0,
        cachedCount: 0,
        coverage: 1,
        insufficientCoverage: false,
        warning: coverageError.message,
      };
      console.warn(`State cache coverage check skipped: ${coverageError.message}`);
    }
    const hasNewDate = freshness.latestAgmarknetDate
      && (!watermarkBefore.latestDate || freshness.latestAgmarknetDate > watermarkBefore.latestDate);
    const shouldRunHeavy = forceRun || hasNewDate || coverage.insufficientCoverage;

    await writeStatus({
      status: shouldRunHeavy ? 'running-heavy-refresh' : 'idle-no-new-data',
      watermark_before: watermarkBefore,
      freshness,
      coverage,
      has_new_date: Boolean(hasNewDate),
      force_run: forceRun,
    });

    console.log({
      watermarkBefore,
      freshness,
      coverage,
      hasNewDate,
      forceRun,
      shouldRunHeavy,
    });

    if (!shouldRunHeavy) return;

    let syncResult = null;
    try {
      syncResult = await syncAgmarknet();
      await writeStatus({ status: 'synced-agmarknet', sync_result: {
        successCount: syncResult.successes.length,
        failureCount: syncResult.failures.length,
        latestDate: syncResult.latestDate,
      } });
    } catch (syncError) {
      if (!forceRun) throw syncError;
      console.warn(`Agmarknet sync failed during forced AI refresh; continuing with existing cache/Supabase data: ${syncError.message}`);
      await writeStatus({
        status: 'agmarknet-sync-skipped-force',
        sync_warning: syncError.message,
      });
    }

    await runCommand('node', ['scripts/backfillAiActualsFromCache.js', '--apply'], { live: true });
    const watermarkAfter = await getAiActualsWatermark();
    await writeStatus({ status: 'backfilled-actuals', watermark_after: watermarkAfter });

    await runCommand('node', ['scripts/exportSupabaseLatestDataCsv.js'], { live: true });
    await writeStatus({ status: 'exported-latest-csv' });

    await runCommand('node', ['scripts/publishLatestDataCsvToKaggle.js'], { live: true });
    await writeStatus({ status: 'published-latest-dataset' });

    if (!skipKaggle) {
      await runCommand('node', ['scripts/runKaggleNotebookLocal.js'], { live: true });
      await writeStatus({ status: 'kaggle-release-installed-locally' });

      if (publishSupabaseRelease) {
        await publishSupabase();
        await writeStatus({ status: 'supabase-release-published' });
      }
    }

    await writeStatus({
      status: 'success',
      completed_at: new Date().toISOString(),
      watermark_after: await getAiActualsWatermark(),
    });
  } catch (error) {
    await writeStatus({
      status: 'failed',
      failed_at: new Date().toISOString(),
      error: error.message,
    });
    throw error;
  } finally {
    await releaseLock();
  }
};

const main = async () => {
  await refreshOnce();
  if (runOnce) return;

  const intervalMs = Math.max(1, pollMinutes) * 60 * 1000;
  console.log(`Watching Agmarknet/Supabase every ${pollMinutes} minute(s). Press Ctrl+C to stop.`);
  setInterval(() => {
    refreshOnce().catch((error) => {
      console.error(`[${new Date().toISOString()}] AI auto refresh failed: ${error.message}`);
    });
  }, intervalMs);
};

main().catch((error) => {
  console.error(`AI auto refresh failed: ${error.message}`);
  process.exit(1);
});
