import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const projectRoot = process.cwd();
const pollMinutes = Number(process.env.LOCAL_KAGGLE_SYNC_MINUTES || 15);
const outputRetryCount = Number(process.env.LOCAL_KAGGLE_OUTPUT_RETRIES || 30);
const outputRetrySeconds = Number(process.env.LOCAL_KAGGLE_OUTPUT_RETRY_SECONDS || 20);
const runOnce = process.argv.includes('--once');
const workRoot = path.resolve(process.env.LOCAL_KAGGLE_SYNC_DIR || 'staging', 'kaggle-local-sync');
const outputDir = path.join(workRoot, 'kaggle-output');
const releaseDir = path.join(workRoot, 'release');
const extractedZipDir = path.join(workRoot, 'kaggle-output-unzipped');

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

const pathExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const extractZip = async (zipPath, destinationDir) => {
  await fs.rm(destinationDir, { recursive: true, force: true });
  await fs.mkdir(destinationDir, { recursive: true });

  try {
    await runCommand('python', ['-m', 'zipfile', '-e', zipPath, destinationDir]);
    return;
  } catch (pythonError) {
    try {
      await runCommand('py', ['-m', 'zipfile', '-e', zipPath, destinationDir]);
      return;
    } catch {
      throw pythonError;
    }
  }
};

const listFilesForDebug = async (rootDir, maxFiles = 80) => {
  const files = [];
  const walk = async (dir, prefix = '') => {
    if (files.length >= maxFiles) return;
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (files.length >= maxFiles) break;
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath);
      } else {
        files.push(relativePath);
      }
    }
  };
  await walk(rootDir);
  return files;
};

const copyReleaseFilesFromDirectory = async (sourceDir) => {
  const nestedReleaseDir = path.join(sourceDir, 'release');
  if (await pathExists(nestedReleaseDir)) {
    const stat = await fs.stat(nestedReleaseDir);
    if (stat.isDirectory()) {
      await fs.cp(nestedReleaseDir, releaseDir, { recursive: true });
      return true;
    }
  }

  const entries = await fs.readdir(sourceDir, { withFileTypes: true }).catch(() => []);
  const allowedExtensions = new Set(['.json', '.csv', '.parquet']);
  let copiedAny = false;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!allowedExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    await fs.copyFile(path.join(sourceDir, entry.name), path.join(releaseDir, entry.name));
    copiedAny = true;
  }
  return copiedAny;
};

const copyReleaseFiles = async () => {
  await fs.rm(releaseDir, { recursive: true, force: true });
  await fs.mkdir(releaseDir, { recursive: true });

  if (await copyReleaseFilesFromDirectory(outputDir)) {
    return;
  }

  const entries = await fs.readdir(outputDir, { withFileTypes: true });
  const allFiles = entries.filter((entry) => entry.isFile());
  if (!allFiles.length) {
    throw new Error('Kaggle output downloaded successfully, but it contains no files. Save a Kaggle version that writes release files under /kaggle/working/release/.');
  }

  const zipFiles = allFiles.filter((entry) => path.extname(entry.name).toLowerCase() === '.zip');
  for (const zipFile of zipFiles) {
    const zipPath = path.join(outputDir, zipFile.name);
    const destinationDir = path.join(extractedZipDir, path.basename(zipFile.name, '.zip'));
    await extractZip(zipPath, destinationDir);
    if (await copyReleaseFilesFromDirectory(destinationDir)) {
      console.log(`Extracted AI release files from ${zipFile.name}`);
      return;
    }
  }

  const copied = await fs.readdir(releaseDir);
  if (!copied.length) {
    const rootFiles = await listFilesForDebug(outputDir);
    const extractedFiles = await listFilesForDebug(extractedZipDir);
    const debugList = [
      rootFiles.length ? `output files: ${rootFiles.join(', ')}` : 'output files: none',
      extractedFiles.length ? `zip contents: ${extractedFiles.join(', ')}` : 'zip contents: none',
    ].join('\n');
    throw new Error(`Kaggle output has files, but none are release files (.json, .csv, .parquet), including inside .zip archives. Confirm the notebook writes the release bundle.\n${debugList}`);
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

      console.warn(`Kaggle output is visible only after Kaggle publishes it through the API. Retrying in ${outputRetrySeconds}s (${attempt}/${outputRetryCount})...`);
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
