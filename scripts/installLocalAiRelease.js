import fs from 'fs/promises';
import { createHash } from 'crypto';
import path from 'path';

const sourceDir = path.resolve(process.argv[2] || 'staging');
const targetDir = path.resolve('services', 'ml-pipeline', 'dashboard', 'data');

const requiredFiles = [
  'manifest.json',
  'predictions.json',
  'actuals.json',
  'forecast_series.json',
  'historical_efficiency.json',
  'backtest.json',
  'reasoning.json',
  'states.json',
  'metrics.json',
  'canonical_daily.parquet',
  'canonical_daily.csv',
  'checksums.json',
];

const sha256 = async (filePath) => {
  const content = await fs.readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const assertBundle = async () => {
  for (const fileName of requiredFiles) {
    const filePath = path.join(sourceDir, fileName);
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`Missing required release file: ${fileName}`);
    }
  }

  const manifest = await readJson(path.join(sourceDir, 'manifest.json'));
  const expectedHorizons = JSON.stringify([7, 30, 90]);
  const actualHorizons = JSON.stringify([...(manifest.horizons || [])].map(Number).sort((a, b) => a - b));
  if (manifest.status !== 'success') throw new Error(`Manifest status is ${manifest.status}`);
  if (actualHorizons !== expectedHorizons) throw new Error(`Manifest horizons must be ${expectedHorizons}`);
  if (!Array.isArray(manifest.states) || !manifest.states.includes('All States')) {
    throw new Error('Manifest states must include All States');
  }

  for (const [fileName, expectedHash] of Object.entries(manifest.files || {})) {
    const filePath = path.join(sourceDir, fileName);
    const actualHash = await sha256(filePath);
    if (actualHash !== expectedHash) {
      throw new Error(`Checksum mismatch for ${fileName}`);
    }
  }

  return manifest;
};

const install = async () => {
  const manifest = await assertBundle();
  await fs.mkdir(targetDir, { recursive: true });

  for (const fileName of requiredFiles) {
    await fs.copyFile(path.join(sourceDir, fileName), path.join(targetDir, fileName));
  }

  console.log({
    installed: true,
    sourceDir,
    targetDir,
    runId: manifest.run_id,
    dataLatestDate: manifest.data_latest_date,
    stateCount: manifest.states.length,
    grains: manifest.grains,
  });
};

install().catch((error) => {
  console.error(`Local AI release install failed: ${error.message}`);
  process.exit(1);
});
