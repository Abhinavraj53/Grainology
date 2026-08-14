import fs from 'fs';
import path from 'path';

const root = process.cwd();
const srcDir = path.join(root, 'kaggle', 'src');
const basePath = path.join(root, 'kaggle', 'grainology_model_base.ipynb');
const output = path.join(root, 'kaggle', 'grainology_state_forecaster.ipynb');

const lines = (source) => source.split(/(?<=\n)/);
const normalizeText = (source) => String(source)
  .replaceAll('â€“â‚¹', '- Rs ')
  .replaceAll('â†’', '->')
  .replaceAll('â‚¹', 'Rs ')
  .replaceAll('â€”', '-')
  .replaceAll('â€“', '-')
  .replaceAll('Ã—', 'x');
const code = (source) => ({ cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source: lines(normalizeText(source)) });
const markdown = (source) => ({ cell_type: 'markdown', metadata: {}, source: lines(normalizeText(source)) });
const cellSource = (cell) => Array.isArray(cell?.source) ? cell.source.join('') : String(cell?.source || '');

const stripInternalImports = (source) => {
  const sourceLines = source.split(/\r?\n/);
  const out = [];
  let skippingRelativeImportBlock = false;

  for (const line of sourceLines) {
    const trimmed = line.trim();
    if (skippingRelativeImportBlock) {
      if (trimmed === ')' || trimmed.endsWith(')')) skippingRelativeImportBlock = false;
      continue;
    }
    if (/^from \.\w+ import \($/.test(trimmed)) {
      skippingRelativeImportBlock = true;
      continue;
    }
    if (/^from \.\w+ import /.test(trimmed)) continue;
    out.push(line);
  }

  return `${out.join('\n').trimEnd()}\n`;
};

const readStandaloneCell = (fileName) => stripInternalImports(
  fs.readFileSync(path.join(srcDir, fileName), 'utf8')
);

if (!fs.existsSync(basePath)) {
  throw new Error(`Missing notebook base: ${basePath}`);
}

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
let cells = base.cells.map((cell) => {
  const source = cellSource(cell);
  return cell.cell_type === 'code' ? code(source) : markdown(source);
});

// The user-maintained notebook is the source of the rich data audit, live-price
// parity checks, visual diagnostics, and release workflow. Generated upgrade
// cells are replaced deterministically on every build.
cells = cells.filter((cell) => {
  const source = cellSource(cell);
  return !source.includes('## Mandi-Level Forecast Extension')
    && !source.includes('ENABLE_MANDI_LEVEL_RELEASE = env_bool')
    && !source.includes('## Source: evaluation')
    && !source.includes('## Source: drift')
    && !source.includes('evaluation_report = generate_evaluation_report');
});

const findCell = (pattern, start = 0) => cells.findIndex((cell, index) => index >= start && cellSource(cell).includes(pattern));

const replaceCodeAfterHeading = (heading, source) => {
  const headingIndex = findCell(heading);
  if (headingIndex < 0) throw new Error(`Notebook base is missing heading: ${heading}`);
  const codeIndex = cells.findIndex((cell, index) => index > headingIndex && cell.cell_type === 'code');
  if (codeIndex < 0) throw new Error(`Notebook base is missing code after: ${heading}`);
  cells[codeIndex] = code(source);
};

const replaceCellText = (pattern, transform) => {
  const index = findCell(pattern);
  if (index < 0) throw new Error(`Notebook base is missing cell containing: ${pattern}`);
  const next = transform(cellSource(cells[index]));
  cells[index] = cells[index].cell_type === 'code' ? code(next) : markdown(next);
};

replaceCellText('# Grainology State-wise AI Forecaster', () => `# Grainology State and Mandi Price Forecaster

This standalone Kaggle notebook is built from the working Grainology notebook and preserves its live-price sanity checks, Supabase merge, transparent visual diagnostics, and website release contract.

The model path is upgraded with:

1. Horizon-embargoed chronological train, calibration, and final holdout windows
2. Train-only feature imputation and calibration-only ensemble selection
3. Temporal-fold promotion gates against persistence
4. Split-conformal prediction intervals with measured holdout coverage
5. State-aware and mandi-aware forecasts for 7, 30, and 90 days
6. Evaluation and data-drift reports included in every release

The website-facing state files remain backward compatible. Optional mandi files are added by the generated mandi notebook.
`);

replaceCellText('## Runtime Notes', () => `## Runtime Notes

Safe model-improvement knobs can be set as Kaggle environment variables:

- \`ENABLE_OPTUNA_TUNING=true\`
- \`OPTUNA_TRIALS=25\`
- \`OPTUNA_TIMEOUT_SECONDS=180\`
- \`MAX_TRAIN_ROWS_PER_MODEL=250000\`
- \`TEMPORAL_VALIDATION_FOLDS=3\`
- \`MIN_TEMPORAL_FOLD_WIN_RATIO=0.50\`
- \`EVALUATION_HOLDOUT_DAYS=365\`
- \`ENSEMBLE_CALIBRATION_DAYS=365\`
- \`MAX_BIAS_CORRECTION_PCT=8\`
- \`CONFORMAL_ALPHA=0.10\`

Reported MAPE and MAE come from an untouched chronological holdout. Do not compare them with the older random-split dashboard score. The release contract remains compatible with the Grainology website.
`);

replaceCellText('## Source: config', (heading) => heading);
const configHeadingIndex = findCell('## Source: config');
const configIndex = cells.findIndex((cell, index) => index > configHeadingIndex && cell.cell_type === 'code');
let configSource = cellSource(cells[configIndex])
  .replace('MODEL_MODE = "dashboard_ensemble_state_aware_v3"', 'MODEL_MODE = "temporal_ensemble_state_mandi_v4"')
  .replace('VALIDATION_STRATEGY = os.environ.get("VALIDATION_STRATEGY", "dashboard_random").strip().lower()', 'VALIDATION_STRATEGY = "horizon_embargo_temporal_holdout"')
  .replace('TRAINING_SCOPE = os.environ.get("TRAINING_SCOPE", "national").strip().lower()', 'TRAINING_SCOPE = os.environ.get("TRAINING_SCOPE", "all").strip().lower()')
  .replace(
    '# Dashboard training-parity controls. The default mirrors grain_dashboard\'s\n# random validation blend that produced sub-2% MAPE in its metrics summary.\n# Set VALIDATION_STRATEGY=temporal_embargo to restore strict chronological gates.',
    '# Compatibility controls retained for the existing prediction schema.\n# Model selection and reported metrics always use chronological holdout windows.',
  )
  .replace(
    '# Dashboard training-parity controls. The default mirrors grain_dashboard\'s random validation blend that produced sub-2% MAPE in its metrics summary. Set VALIDATION_STRATEGY=temporal_embargo to restore strict chronological gates.',
    '# Compatibility controls retained for the existing prediction schema. Model selection and reported metrics always use chronological holdout windows.',
  );

if (!configSource.includes('EVALUATION_HOLDOUT_RATIO =')) {
  const strictSettings = `\n# Leakage-safe evaluation and calibrated uncertainty controls.\nTEMPORAL_VALIDATION_FOLDS = int(os.environ.get("TEMPORAL_VALIDATION_FOLDS", "3"))\nMIN_TEMPORAL_FOLD_WIN_RATIO = float(os.environ.get("MIN_TEMPORAL_FOLD_WIN_RATIO", "0.50"))\nEVALUATION_HOLDOUT_RATIO = float(os.environ.get("EVALUATION_HOLDOUT_RATIO", "0.20"))\nENSEMBLE_CALIBRATION_RATIO = float(os.environ.get("ENSEMBLE_CALIBRATION_RATIO", "0.35"))\nEVALUATION_HOLDOUT_DAYS = int(os.environ.get("EVALUATION_HOLDOUT_DAYS", "365"))\nENSEMBLE_CALIBRATION_DAYS = int(os.environ.get("ENSEMBLE_CALIBRATION_DAYS", "365"))\nMAX_BIAS_CORRECTION_PCT = float(os.environ.get("MAX_BIAS_CORRECTION_PCT", "8"))\nREFIT_SELECTED_MODELS_ON_FULL_DATA = env_bool("REFIT_SELECTED_MODELS_ON_FULL_DATA", True)\n`;
  configSource = configSource.replace(
    'CONFORMAL_ALPHA = float(os.environ.get("CONFORMAL_ALPHA", "0.10"))',
    `CONFORMAL_ALPHA = float(os.environ.get("CONFORMAL_ALPHA", "0.10"))${strictSettings}`
  );
}
cells[configIndex] = code(configSource);

// Preserve the working notebook's complete feature engineering, categorical
// models, Optuna search, and diagnostics. Replace only train_one with the
// audited chronological selection/evaluation implementation.
const trainHeadingIndex = findCell('## Source: train');
const trainIndex = cells.findIndex((cell, index) => index > trainHeadingIndex && cell.cell_type === 'code');
let trainSource = cellSource(cells[trainIndex]).replace(
  'if TRAINING_SCOPE == "national" and NATIONAL_DAILY_FILL:',
  'if NATIONAL_DAILY_FILL:',
);
trainSource = trainSource.replace(
  'min(VALIDATION_FOLDS, len(ordered))',
  'min(TEMPORAL_VALIDATION_FOLDS, len(ordered))',
);
const trainOneStart = trainSource.indexOf('def train_one(');
const trainModelsStart = trainSource.indexOf('def train_models(');
if (trainOneStart < 0 || trainModelsStart <= trainOneStart) {
  throw new Error('Notebook base train cell is missing train_one/train_models boundaries');
}
trainSource = `${trainSource.slice(0, trainOneStart)}${readStandaloneCell('temporal_train_one.py')}\n${trainSource.slice(trainModelsStart)}`;
trainSource = trainSource.replace(
  'registry["efficiency_rows"].extend(trained.get("efficiency_rows", trained["validation_rows"]))\n                registry["efficiency_rows"].extend(trained.get("efficiency_rows", trained["validation_rows"]))',
  'registry["efficiency_rows"].extend(trained.get("efficiency_rows", trained["validation_rows"]))',
);
cells[trainIndex] = code(trainSource);

// Apply the calibration factor learned before the untouched holdout to the
// same serving path used for state, national-parity, and mandi forecasts.
const predictHeadingIndex = findCell('## Source: predict');
const predictIndex = cells.findIndex((cell, index) => index > predictHeadingIndex && cell.cell_type === 'code');
let predictSource = cellSource(cells[predictIndex]);
const predictMethodStart = predictSource.indexOf('def predict_method_price(');
const liveNormalizerStart = predictSource.indexOf('def normalize_live_dashboard_grain(');
if (predictMethodStart < 0 || liveNormalizerStart <= predictMethodStart) {
  throw new Error('Notebook base predict cell is missing predict_method_price boundaries');
}
predictSource = `${predictSource.slice(0, predictMethodStart)}${readStandaloneCell('calibrated_predict_method.py')}\n${predictSource.slice(liveNormalizerStart)}`;
cells[predictIndex] = code(predictSource);

const reasoningHeadingIndex = findCell('## Source: reasoning');
if (reasoningHeadingIndex < 0) throw new Error('Notebook base is missing reasoning source section');
cells.splice(
  reasoningHeadingIndex,
  0,
  markdown('## Source: evaluation\n'),
  code(readStandaloneCell('evaluation.py')),
  markdown('## Source: drift\n'),
  code(readStandaloneCell('drift.py')),
);

replaceCellText('## 8. Train Models', () => `## 8. Train Leakage-Safe Ensemble Models

Each grain and horizon uses chronological train, ensemble-calibration, and final-holdout windows. Candidate models are promoted only when they beat persistence across temporal folds. Production models are refit only after evaluation is frozen.
`);

const efficiencyRunIndex = findCell('efficiency, backtest = generate_efficiency_data(registry)');
if (efficiencyRunIndex < 0) throw new Error('Notebook base is missing efficiency execution cell');
cells.splice(efficiencyRunIndex + 1, 0, code(`evaluation_report = generate_evaluation_report(registry)
data_drift_report = generate_data_drift_report(canonical)
print("Evaluation strategy:", evaluation_report.get("evaluation_strategy"))
print("National holdout MAPE range:", evaluation_report.get("summary", {}).get("national_min_mape"), "to", evaluation_report.get("summary", {}).get("national_max_mape"))
print("Data drift warnings:", data_drift_report.get("summary", {}).get("warning_series"), "/", data_drift_report.get("summary", {}).get("series_checked"))
display(pd.DataFrame(evaluation_report.get("national_metrics", [])))
`));

// Surface evaluation and mandi availability in the manifest without changing
// the existing required release filenames.
const manifestHeadingIndex = findCell('## Source: manifest');
const manifestIndex = cells.findIndex((cell, index) => index > manifestHeadingIndex && cell.cell_type === 'code');
let manifestSource = cellSource(cells[manifestIndex]);
manifestSource = manifestSource.replace(
  '"quality_gates": quality, "files": dict(sorted(files.items())),',
  '"quality_gates": quality, "evaluation_strategy": "horizon_embargo_temporal_holdout", "market_model_mode": os.environ.get("MARKET_MODEL_MODE", "not_generated"), "market_level_available": (RELEASE_DIR / "market_predictions.json").exists(), "files": dict(sorted(files.items())),',
);
cells[manifestIndex] = code(manifestSource);

const notebook = {
  cells,
  metadata: {
    kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
    language_info: { name: 'python', pygments_lexer: 'ipython3' },
    grainology: {
      base_notebook: 'grainology_model_base.ipynb',
      evaluation_strategy: 'horizon_embargo_temporal_holdout',
      live_price_parity_check: true,
    },
  },
  nbformat: 4,
  nbformat_minor: 5,
};

fs.writeFileSync(output, JSON.stringify(notebook, null, 2));
console.log(`Wrote ${output} from ${basePath} (${cells.length} cells)`);
