import fs from 'fs';
import path from 'path';

const root = process.cwd();
const srcDir = path.join(root, 'kaggle', 'src');
const output = path.join(root, 'kaggle', 'grainology_state_forecaster.ipynb');

const lines = (source) => source.split(/(?<=\n)/);
const code = (source) => ({ cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source: lines(source) });
const markdown = (source) => ({ cell_type: 'markdown', metadata: {}, source: lines(source) });

const standaloneOrder = [
  'config.py',
  'historical_loader.py',
  'supabase_source.py',
  'canonical_dataset.py',
  'train.py',
  'predict.py',
  'efficiency.py',
  'reasoning.py',
  'manifest.py',
  'diagnostics.py',
];

const stripInternalImports = (source) => {
  const sourceLines = source.split(/\r?\n/);
  const out = [];
  let skippingRelativeImportBlock = false;

  for (const line of sourceLines) {
    const trimmed = line.trim();

    if (skippingRelativeImportBlock) {
      if (trimmed === ')' || trimmed.endsWith(')')) {
        skippingRelativeImportBlock = false;
      }
      continue;
    }

    if (/^from \.\w+ import \($/.test(trimmed)) {
      skippingRelativeImportBlock = true;
      continue;
    }

    if (/^from \.\w+ import /.test(trimmed)) {
      continue;
    }

    out.push(line);
  }

  return out.join('\n').trimEnd() + '\n';
};

const readStandaloneCell = (fileName) => {
  const filePath = path.join(srcDir, fileName);
  const source = fs.readFileSync(filePath, 'utf-8');
  return stripInternalImports(source);
};

const cells = [
  markdown(`# Grainology State-wise AI Forecaster

This is a fully standalone Kaggle notebook. It does not import local project files such as \`train.py\`.

All model code is embedded directly into notebook cells, while the final release contract stays stable for the Grainology website.

Release output:

\`\`\`text
/kaggle/working/release/
/kaggle/working/*.json, *.csv, *.parquet
/kaggle/working/grainology_release.zip
\`\`\`
`),

  code(`%pip install -q "catboost>=1.2" "lightgbm>=4.0" "xgboost>=2.0" "optuna>=3.6" "jsonschema>=4.21" "matplotlib>=3.8" "numpy>=1.26" "pandas>=2.2" "polars>=1.0" "pyarrow>=15" "requests>=2.31" "scikit-learn>=1.4" "supabase>=2.0"
`),

  markdown(`## Runtime Notes

Safe model-improvement knobs can be set as Kaggle environment variables:

- \`ENABLE_OPTUNA_TUNING=true\`
- \`OPTUNA_TRIALS=25\`
- \`MAX_TRAIN_ROWS_PER_MODEL=250000\`
- \`ENSEMBLE_PRUNE_RATIO=1.08\`
- \`MIN_MAPE_IMPROVEMENT=0.01\`

Keep \`schema_version = 2.0\`, release filenames, grains, horizons, and state-wise structure unchanged unless the website is migrated.
`),
];

for (const fileName of standaloneOrder) {
  cells.push(markdown(`## Source: ${fileName.replace('.py', '')}`));
  cells.push(code(readStandaloneCell(fileName)));
}

cells.push(
  markdown(`## 1. Build Canonical Dataset

Loads historical Kaggle datasets, merges latest Supabase/cache data when configured, normalizes states/grains, and writes the canonical daily dataset.
`),
  code(`canonical = build_canonical_dataset()
canonical_summary(canonical)
missingness_summary(canonical)
recent_data_summary(canonical, days=14)
`),
  code(`plot_history(canonical, states=["All States"], grains=["Wheat", "Paddy", "Maize", "Mustard"])
plot_recent_history(canonical, days=365, state="All States")
`),

  markdown(`## 2. Train State-aware Ensemble Models

Creates lag/rolling/arrival/seasonality/national-spread features, trains candidate models for every grain and horizon, prunes weak models, and selects the best method per state.
`),
  code(`registry = train_models(canonical)
training_summary(registry)
method_leaderboard(registry, top=80)
validation_rows_summary(registry)
`),
  code(`plot_validation_fit(registry, grain="Wheat", state="All States", horizon=7)
plot_validation_fit(registry, grain="Wheat", state="All States", horizon=30)
plot_validation_fit(registry, grain="Wheat", state="All States", horizon=90)
`),

  markdown(`## 3. Generate Forecasts, Actual Context, And Dashboard Metrics

Writes \`predictions.json\`, \`forecast_series.json\`, \`actuals.json\`, and \`metrics.json\` in the website schema.
`),
  code(`predictions, forecast_series, actuals, metrics = generate_predictions(canonical, registry)
print("Prediction grains:", list(predictions.keys()))
inspect_prediction_output("Wheat", "All States")
`),

  markdown(`## 4. Generate Historical Efficiency And Backtests

Writes state-wise predicted-vs-actual comparison rows for the dashboard chart and table.
`),
  code(`efficiency, backtest = generate_efficiency_data(registry)
efficiency_summary(efficiency)
`),
  code(`plot_efficiency_series(efficiency, grain="Wheat", state="All States", horizon=7, tail=365)
plot_efficiency_series(efficiency, grain="Wheat", state="All States", horizon=30, tail=365)
plot_efficiency_series(efficiency, grain="Wheat", state="All States", horizon=90, tail=365)
`),

  markdown(`## 5. Generate Reasoning Text

Writes the human-readable explanation layer consumed by the website.
`),
  code(`reasoning = generate_reasoning(predictions, metrics)
print("Reasoning generated for grains:", list(reasoning.keys()))
print(reasoning.get("Wheat", {}).get("All States", {}))
`),

  markdown(`## 6. Finalize Release Bundle

Validates required files, writes \`manifest.json\`, mirrors files to \`/kaggle/working\`, and creates the downloadable release archive.
`),
  code(`manifest = finalize_release(canonical)
release_file_summary()
manifest
`)
);

const notebook = {
  cells,
  metadata: {
    kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
    language_info: { name: 'python', pygments_lexer: 'ipython3' },
  },
  nbformat: 4,
  nbformat_minor: 5,
};

fs.writeFileSync(output, JSON.stringify(notebook, null, 2));
console.log(`Wrote standalone ${output} (${cells.length} cells, ${standaloneOrder.length} embedded source sections)`);
