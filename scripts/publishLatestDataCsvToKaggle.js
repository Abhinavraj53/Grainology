import 'dotenv/config';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const latestDataDir = path.resolve(
  projectRoot,
  process.env.LATEST_DATA_EXPORT_DIR || path.join('staging', 'kaggle-latest-data'),
);
const minCsvBytes = Number(process.env.LATEST_DATA_MIN_BYTES || 10 * 1024 * 1024);
const minCsvRows = Number(process.env.LATEST_DATA_MIN_ROWS || 100000);
const useQuietMode = process.env.KAGGLE_DATASET_VERSION_QUIET !== 'false';

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

const assertFileExists = async (filePath) => {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Missing required file: ${filePath}. Run npm run ai:update-latest-csv first.`);
  }
};

const assertCsvLooksComplete = async () => {
  const csvPath = path.join(latestDataDir, 'latest_data.csv');
  const summaryPath = path.join(latestDataDir, 'latest_data_summary.json');
  const csvStat = await fs.stat(csvPath);
  const summary = JSON.parse(await fs.readFile(summaryPath, 'utf-8').catch(() => '{}'));

  if (process.env.ALLOW_SMALL_LATEST_DATA_PUBLISH === 'true') return;
  if (csvStat.size < minCsvBytes) {
    throw new Error(`Refusing to publish latest_data.csv because it is only ${csvStat.size} bytes. Expected at least ${minCsvBytes} bytes.`);
  }
  if (Number(summary.row_count || 0) < minCsvRows) {
    throw new Error(`Refusing to publish latest_data.csv because summary row_count is ${summary.row_count}. Expected at least ${minCsvRows}.`);
  }
};

const publishDatasetVersion = async (message) => {
  const args = ['datasets', 'version', '-p', latestDataDir, '-m', message, '--dir-mode', 'zip'];
  const quietArgs = [...args, '--quiet'];

  try {
    await runCommand('kaggle', useQuietMode ? quietArgs : args, { live: true });
  } catch (error) {
    if (useQuietMode && /unrecognized arguments?:\s*--quiet/i.test(error.message)) {
      console.warn('Kaggle CLI does not support --quiet; retrying dataset publish without it.');
      await runCommand('kaggle', args, { live: true });
      return;
    }
    throw error;
  }
};

const main = async () => {
  await assertFileExists(path.join(latestDataDir, 'latest_data.csv'));
  await assertFileExists(path.join(latestDataDir, 'dataset-metadata.json'));
  await assertCsvLooksComplete();

  const metadata = JSON.parse(await fs.readFile(path.join(latestDataDir, 'dataset-metadata.json'), 'utf-8'));
  const message = process.env.KAGGLE_LATEST_DATASET_MESSAGE
    || `Update latest_data.csv from Supabase actuals at ${new Date().toISOString()}`;

  console.log(`Publishing latest_data.csv to Kaggle dataset ${metadata.id}`);
  await publishDatasetVersion(message);
};

main().catch((error) => {
  console.error(`Kaggle latest-data publish failed: ${error.message}`);
  if (error.message.includes('ENOENT') || error.message.includes('not recognized')) {
    console.error('Kaggle CLI was not found. Install it with: py -m pip install kaggle');
  }
  process.exit(1);
});
