import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const projectRoot = process.cwd();
const kaggleDir = path.join(projectRoot, 'kaggle');
const metadataPath = path.join(kaggleDir, 'kernel-metadata.json');
const requiredEnv = ['KAGGLE_USERNAME', 'KAGGLE_KEY', 'KAGGLE_KERNEL_ID'];

const pollSeconds = Number(process.env.LOCAL_KAGGLE_RUN_POLL_SECONDS || 60);
const timeoutMinutes = Number(process.env.LOCAL_KAGGLE_RUN_TIMEOUT_MINUTES || 360);
const skipBuild = process.argv.includes('--no-build');
const skipSync = process.argv.includes('--no-sync');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const slugToTitle = (slug) => slug
  .split('-')
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const parseDatasetSources = () => {
  const raw = process.env.KAGGLE_DATASET_SOURCES || '';
  return raw
    .split(',')
    .map((source) => source.trim())
    .filter(Boolean);
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
    if (code === 0) {
      resolve({ stdout, stderr });
    } else {
      reject(new Error(`${command} ${args.join(' ')} failed with code ${code}\n${stderr || stdout}`));
    }
  });
});

const ensureKernelMetadata = async () => {
  const metadataRaw = await fs.readFile(metadataPath, 'utf-8');
  const metadata = JSON.parse(metadataRaw);
  let changed = false;

  if (metadata.id === process.env.KAGGLE_KERNEL_ID) {
    // Keep going; title/dataset sources may still need normalization.
  } else {
    const previousId = metadata.id;
    metadata.id = process.env.KAGGLE_KERNEL_ID;
    changed = true;
    console.warn(`Updated kaggle/kernel-metadata.json id from ${previousId} to ${metadata.id}.`);
    console.warn('This keeps Kaggle push and output sync pointed at the same notebook.');
  }

  const kernelSlug = process.env.KAGGLE_KERNEL_ID.split('/').pop();
  const expectedTitle = slugToTitle(kernelSlug || metadata.title || 'grainology');
  if (metadata.title !== expectedTitle) {
    const previousTitle = metadata.title;
    metadata.title = expectedTitle;
    changed = true;
    console.warn(`Updated kaggle/kernel-metadata.json title from "${previousTitle}" to "${metadata.title}" so it resolves to the notebook slug.`);
  }

  const datasetSources = parseDatasetSources();
  if (datasetSources.length) {
    metadata.dataset_sources = datasetSources;
    changed = true;
    console.warn(`Using KAGGLE_DATASET_SOURCES from .env: ${datasetSources.join(', ')}`);
  } else {
    const suspiciousSources = (metadata.dataset_sources || []).filter((source) => {
      const owner = String(source).split('/')[0];
      return owner && owner !== process.env.KAGGLE_USERNAME;
    });
    if (suspiciousSources.length) {
      console.warn(`Dataset sources may not be accessible to ${process.env.KAGGLE_USERNAME}: ${suspiciousSources.join(', ')}`);
      console.warn('Set KAGGLE_DATASET_SOURCES in .env to accessible dataset refs, for example owner/dataset-slug,owner/latest-data-slug.');
    }
  }

  if (changed) {
    await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf-8');
  }
  return metadata;
};

const assertEnv = async () => {
  const missing = requiredEnv.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing .env values for Kaggle notebook run: ${missing.join(', ')}`);
  }
};

const normalizeStatus = (output) => output.trim().toLowerCase();

const waitForCompletion = async () => {
  const timeoutAt = Date.now() + Math.max(1, timeoutMinutes) * 60 * 1000;
  const intervalMs = Math.max(10, pollSeconds) * 1000;

  console.log(`Waiting for Kaggle run to finish. Polling every ${Math.round(intervalMs / 1000)} seconds.`);

  while (Date.now() < timeoutAt) {
    const { stdout, stderr } = await runCommand('kaggle', ['kernels', 'status', process.env.KAGGLE_KERNEL_ID]);
    const statusText = normalizeStatus(stdout || stderr);
    const singleLine = statusText.replace(/\s+/g, ' ').trim();
    console.log(`[${new Date().toISOString()}] Kaggle status: ${singleLine || 'unknown'}`);

    if (statusText.includes('complete')) return;
    if (
      statusText.includes('error')
      || statusText.includes('failed')
      || statusText.includes('failure')
      || statusText.includes('cancel')
    ) {
      throw new Error(`Kaggle run did not complete successfully: ${singleLine}`);
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timed out after ${timeoutMinutes} minute(s) waiting for Kaggle run to complete.`);
};

const main = async () => {
  await assertEnv();
  await ensureKernelMetadata();

  if (!skipBuild) {
    console.log('Regenerating Kaggle notebook from local source...');
    await runCommand('node', ['automation/build_kaggle_notebook.mjs'], { live: true });
  }

  console.log(`Pushing and running Kaggle notebook ${process.env.KAGGLE_KERNEL_ID}...`);
  await runCommand('kaggle', ['kernels', 'push', '-p', kaggleDir], { live: true });

  await waitForCompletion();

  if (skipSync) {
    console.log('Kaggle run completed. Skipping local output sync because --no-sync was passed.');
    return;
  }

  console.log('Kaggle run completed. Syncing output into local website data...');
  await runCommand('node', ['scripts/syncKaggleAiReleaseLocal.js', '--once'], { live: true });
};

main().catch((error) => {
  console.error(`Kaggle notebook run failed: ${error.message}`);
  if (error.message.includes('ENOENT') || error.message.includes('not recognized')) {
    console.error('Kaggle CLI was not found. Install it with: py -m pip install kaggle');
  } else if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Forbidden')) {
    console.error('Kaggle rejected the request. Check KAGGLE_USERNAME/KAGGLE_KEY and notebook ownership/access.');
  } else if (error.message.includes('404') || error.message.includes('Not Found')) {
    console.error('Kaggle could not find the notebook. Check KAGGLE_KERNEL_ID and kaggle/kernel-metadata.json id.');
  }
  process.exit(1);
});
