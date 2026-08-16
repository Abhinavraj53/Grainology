import fs from 'fs/promises';
import path from 'path';

const root = process.cwd();
const releaseArg = process.argv.find((arg) => arg.startsWith('--release='));
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const candidates = [
  releaseArg?.slice('--release='.length),
  'staging/kaggle-local-sync/release',
  'staging/manual-release-zip/release',
  'data/ai-release',
].filter(Boolean).map((value) => path.resolve(root, value));

const readJson = async (filePath) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
};

let releaseDir = null;
let manifest = null;
for (const candidate of candidates) {
  const value = await readJson(path.join(candidate, 'manifest.json'));
  if (value) {
    releaseDir = candidate;
    manifest = value;
    break;
  }
}

if (!releaseDir || !manifest) {
  throw new Error('No release manifest found. Sync a Kaggle release or pass --release=path/to/release.');
}

const evaluation = await readJson(path.join(releaseDir, 'evaluation_report.json'));
const drift = await readJson(path.join(releaseDir, 'data_drift_report.json'));
const summary = evaluation?.summary || {};
const stateCount = Array.isArray(manifest.states) ? manifest.states.length : null;
const grainCount = Array.isArray(manifest.grains) ? manifest.grains.length : null;
const horizons = Array.isArray(manifest.horizons) ? manifest.horizons.join(', ') : 'unknown';
const auditedMetricsAvailable = Boolean(evaluation?.evaluation_strategy === 'horizon_embargo_temporal_holdout');

const metric = (value) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}%` : 'pending successful audited run';
const report = `# Grainology Resume Evidence

Generated from: \`${path.relative(root, releaseDir)}\`

## Verified System Scale

- Canonical observations: ${manifest.actuals_row_count?.toLocaleString?.('en-US') || 'unknown'}
- Latest data date: ${manifest.data_latest_date || 'unknown'}
- Target grains: ${grainCount ?? 'unknown'} (${(manifest.grains || []).join(', ') || 'unknown'})
- Forecast horizons: ${horizons} days
- State entries: ${stateCount ?? 'unknown'}
- Release status: ${manifest.status || 'unknown'}
- Release quality gate: ${manifest.quality_gates?.passed === true ? 'passed' : 'not verified'}

## Audited Temporal Holdout

- Evaluation artifact present: ${auditedMetricsAvailable ? 'yes' : 'no'}
- Strategy: ${evaluation?.evaluation_strategy || 'pending successful audited run'}
- National weighted MAPE: ${metric(summary.national_weighted_mape)}
- National MAPE range: ${metric(summary.national_min_mape)} to ${metric(summary.national_max_mape)}
- Evaluated series: ${summary.series_evaluated ?? 'pending'}
- Promoted model series: ${summary.promoted_series ?? 'pending'}
- Persistence fallback series: ${summary.baseline_series ?? 'pending'}
- Drift warnings: ${drift?.summary?.warning_series ?? 'pending'}

## Claim Safety

${auditedMetricsAvailable
  ? 'The MAPE values above come from the untouched chronological holdout and may be used with the stated evaluation strategy.'
  : 'Do not quote the legacy dashboard MAPE as final model accuracy. Run the showcase notebook successfully and regenerate this report first.'}
`;

const output = path.resolve(root, outputArg?.slice('--output='.length) || 'staging/resume-evidence/ML_EVIDENCE.md');
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, report, 'utf8');
console.log(report);
console.log(`Wrote ${output}`);
