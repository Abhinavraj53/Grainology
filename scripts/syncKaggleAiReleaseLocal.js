import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const projectRoot = process.cwd();
const pollMinutes = Number(process.env.LOCAL_KAGGLE_SYNC_MINUTES || 15);
const outputRetryCount = Number(process.env.LOCAL_KAGGLE_OUTPUT_RETRIES || 6);
const outputRetrySeconds = Number(process.env.LOCAL_KAGGLE_OUTPUT_RETRY_SECONDS || 30);
const runOnce = process.argv.includes('--once');
const workRoot = path.resolve(process.env.LOCAL_KAGGLE_SYNC_DIR || 'staging', 'kaggle-local-sync');
const outputDir = path.join(workRoot, 'kaggle-output');
const releaseDir = path.join(workRoot, 'release');

const requiredEnv = ['KAGGLE_USERNAME', 'KAGGLE_KEY', 'KAGGLE_KERNEL_ID'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const assertEnv = () => {
  const missing = requiredEnv.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing .env values for local Kaggle sync: ${missing.join(', ')}`);
  }
};

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
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  child.on('error', reject);
  child.on('close', (code) => {
    if (code === 0) {
      resolve({ stdout, stderr });
    } else {
      reject(new Error(`${command} ${args.join(' ')} failed with code ${code}\n${stderr || stdout}`));
    }
  });
});

const copyReleaseFiles = async () => {
  await fs.rm(releaseDir, { recursive: true, force: true });
  await fs.mkdir(releaseDir, { recursive: true });

  const kaggleReleaseDir = path.join(outputDir, 'release');
  try {
    const stat = await fs.stat(kaggleReleaseDir);
    if (stat.isDirectory()) {
      await fs.cp(kaggleReleaseDir, releaseDir, { recursive: true });
      return;
    }
  } catch {
    // Kaggle may place files directly in the output root.
  }

  const entries = await fs.readdir(outputDir, { withFileTypes: true });
  const allFiles = entries.filter((entry) => entry.isFile());
  if (!allFiles.length) {
    throw new Error('Kaggle output downloaded successfully, but it contains no files. Save a Kaggle version that writes release files under /kaggle/working/release/.');
  }

  const allowedExtensions = new Set(['.json', '.csv', '.parquet']);
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!allowedExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    await fs.copyFile(path.join(outputDir, entry.name), path.join(releaseDir, entry.name));
  }

  const copied = await fs.readdir(releaseDir);
  if (!copied.length) {
    throw new Error('Kaggle output has files, but none are release files (.json, .csv, .parquet). Confirm the notebook writes the release bundle.');
  }
};

const hasDownloadedFiles = async () => {
  try {
    const releaseEntries = await fs.readdir(path.join(outputDir, 'release'));
    if (releaseEntries.length) return true;
  } catch {
    // Fall back to checking the output root.
  }

  try {
    const entries = await fs.readdir(outputDir);
    return entries.length > 0;
  } catch {
    return false;
  }
};

const syncOnce = async () => {
  assertEnv();

  const startedAt = new Date();
  console.log(`[${startedAt.toISOString()}] Checking Kaggle output for ${process.env.KAGGLE_KERNEL_ID}`);

  let lastError;
  for (let attempt = 1; attempt <= Math.max(1, outputRetryCount); attempt += 1) {
    await fs.rm(outputDir, { recursive: true, force: true });
    await fs.mkdir(outputDir, { recursive: true });

    try {
      await runCommand('kaggle', ['kernels', 'output', process.env.KAGGLE_KERNEL_ID, '-p', outputDir]);
      await copyReleaseFiles();
      lastError = null;
      break;
    } catch (error) {
      if (error.message.includes('charmap') && await hasDownloadedFiles()) {
        console.warn('Kaggle CLI hit a Windows console encoding warning after downloading files; continuing with local install.');
        await copyReleaseFiles();
        lastError = null;
        break;
      }

      lastError = error;
      const retryableEmptyOutput = error.message.includes('contains no files');
      if (!retryableEmptyOutput || attempt >= Math.max(1, outputRetryCount)) {
        throw error;
      }

      console.warn(`Kaggle output is not published yet. Retrying in ${outputRetrySeconds}s (${attempt}/${outputRetryCount})...`);
      await sleep(Math.max(1, outputRetrySeconds) * 1000);
    }
  }

  if (lastError) throw lastError;

  const { stdout } = await runCommand('node', ['scripts/installLocalAiRelease.js', releaseDir]);
  console.log(stdout.trim());
  console.log(`[${new Date().toISOString()}] Local AI release is updated.`);
};

const main = async () => {
  await syncOnce();
  if (runOnce) return;

  const intervalMs = Math.max(1, pollMinutes) * 60 * 1000;
  console.log(`Watching Kaggle output every ${pollMinutes} minute(s). Press Ctrl+C to stop.`);

  setInterval(() => {
    syncOnce().catch((error) => {
      console.error(`[${new Date().toISOString()}] Local Kaggle sync failed: ${error.message}`);
    });
  }, intervalMs);
};

main().catch((error) => {
  console.error(`Local Kaggle sync failed: ${error.message}`);
  if (error.message.includes('ENOENT') || error.message.includes('not recognized')) {
    console.error('Kaggle CLI was not found. Install it with: py -m pip install kaggle');
    console.error('Then keep KAGGLE_USERNAME, KAGGLE_KEY, and KAGGLE_KERNEL_ID in .env.');
  } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
    console.error('Kaggle rejected the request. Check that KAGGLE_USERNAME/KAGGLE_KEY are from the same Kaggle account that owns or can access KAGGLE_KERNEL_ID.');
    console.error('Also confirm the kernel slug is correct and the notebook has a completed run with output.');
  } else if (error.message.includes('404') || error.message.includes('Not Found')) {
    console.error('Kaggle could not find downloadable output for this notebook ref.');
    console.error('Open the Kaggle notebook, use Save Version / Save & Run All, wait until it fully completes, and confirm it writes files under /kaggle/working/release/.');
    console.error('Also confirm KAGGLE_KERNEL_ID exactly matches the notebook ref shown by Kaggle, for example username/notebook-slug.');
  }
  process.exit(1);
});
