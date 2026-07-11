const fs = require('fs');
const path = require('path');

const notebookPath = process.argv[2];
if (!notebookPath) {
  console.error('Usage: node scripts/patchExternalNotebookFullEfficiency.cjs <notebook.ipynb>');
  process.exit(1);
}

const notebook = JSON.parse(fs.readFileSync(notebookPath, 'utf8'));

const asText = (source) => Array.isArray(source) ? source.join('') : String(source || '');
const asSource = (text) => text.split(/(?<=\n)/);

let changedCells = 0;
let configPatched = false;
let trainPatched = false;
let efficiencyPatched = false;

for (const cell of notebook.cells) {
  if (cell.cell_type !== 'code') continue;
  let source = asText(cell.source);
  const original = source;

  if (source.includes('EFFICIENCY_MAX_ROWS_PER_SERIES = int(os.environ.get("EFFICIENCY_MAX_ROWS_PER_SERIES"')) {
    source = source.replace(
      'EFFICIENCY_MAX_ROWS_PER_SERIES = int(os.environ.get("EFFICIENCY_MAX_ROWS_PER_SERIES", "365"))',
      'EFFICIENCY_MAX_ROWS_PER_SERIES = int(os.environ.get("EFFICIENCY_MAX_ROWS_PER_SERIES", "0"))  # 0 = keep full history',
    );
    source = source.replace(
      'MAX_EFFICIENCY_FILE_MB = float(os.environ.get("MAX_EFFICIENCY_FILE_MB", "20"))',
      'MAX_EFFICIENCY_FILE_MB = float(os.environ.get("MAX_EFFICIENCY_FILE_MB", "160"))',
    );
    source = source.replace(
      'MAX_EFFICIENCY_FILE_MB = float(os.environ.get("MAX_EFFICIENCY_FILE_MB", "80"))',
      'MAX_EFFICIENCY_FILE_MB = float(os.environ.get("MAX_EFFICIENCY_FILE_MB", "160"))',
    );
    configPatched = true;
  }

  if (source.includes('def train_one(') && source.includes('validation_rows.append(row_payload')) {
    if (!source.includes('efficiency_rows: list[dict] = []')) {
      source = source.replace(
        '    gates: dict[str, dict] = {}\n    validation_rows: list[dict] = []\n',
        '    gates: dict[str, dict] = {}\n    validation_rows: list[dict] = []\n    efficiency_rows: list[dict] = []\n',
      );
    }

    if (!source.includes('Full-history replay for dashboard efficiency')) {
      const insertAfter = '        for pos, (row_idx, row) in enumerate(state_valid.iterrows()):\n            validation_rows.append(row_payload(row, float(selected_pred[pos]), selected, float(lower[pos]), float(upper[pos])))\n\n';
      const replayBlock = `        for pos, (row_idx, row) in enumerate(state_valid.iterrows()):
            validation_rows.append(row_payload(row, float(selected_pred[pos]), selected, float(lower[pos]), float(upper[pos])))

    # Full-history replay for dashboard efficiency:
    # Gates and model selection are learned from validation rows, then the selected
    # method is replayed across every supervised origin/target pair. This creates
    # a dense public comparison table without pretending it is a rolling-origin
    # backtest for every historical date.
    replay_predictions = predict_candidate_prices(models, data, feature_fill_values, horizon)
    if ensemble_weights:
        ensemble_values, ensemble_weight_values = [], []
        for model_name, weight in ensemble_weights.items():
            if model_name in replay_predictions:
                ensemble_values.append(replay_predictions[model_name])
                ensemble_weight_values.append(float(weight))
        if ensemble_values and sum(ensemble_weight_values) > 0:
            replay_predictions["ensemble"] = np.average(
                np.vstack(ensemble_values), axis=0, weights=np.asarray(ensemble_weight_values, dtype=float)
            )
    replay_series = {name: pd.Series(pred, index=data.index) for name, pred in replay_predictions.items()}
    for state, state_rows in data.groupby("state_name", sort=False):
        gate = gates.get(state)
        if not gate:
            continue
        selected = gate.get("selected_method", "baseline")
        if selected not in replay_series:
            selected = "baseline"
        idx = state_rows.index
        selected_pred = replay_series[selected].loc[idx].to_numpy(dtype=float)
        radius = float(gate.get("conformal_log_radius") or np.log(1.25))
        lower = selected_pred * np.exp(-radius)
        upper = selected_pred * np.exp(radius)
        for pos, (row_idx, row) in enumerate(state_rows.iterrows()):
            item = row_payload(row, float(selected_pred[pos]), selected, float(lower[pos]), float(upper[pos]))
            item["evaluation_scope"] = "full_history_selected_model_replay"
            efficiency_rows.append(item)

`;
      if (!source.includes(insertAfter)) {
        throw new Error('Could not find validation_rows append block in train_one');
      }
      source = source.replace(insertAfter, replayBlock);
    }

    source = source.replace(
      '        "ensemble_weights": ensemble_weights, "gates": gates, "history_rows": [],\n        "validation_rows": validation_rows, "latest_training_date": data["date"].max().date().isoformat(),\n',
      '        "ensemble_weights": ensemble_weights, "gates": gates, "history_rows": [],\n        "validation_rows": validation_rows, "efficiency_rows": efficiency_rows,\n        "latest_training_date": data["date"].max().date().isoformat(),\n',
    );

    source = source.replace(
      '    registry = {"features": features, "models": {}, "history_rows": [], "validation_rows": []}\n',
      '    registry = {"features": features, "models": {}, "history_rows": [], "validation_rows": [], "efficiency_rows": []}\n',
    );

    source = source.replace(
      '                registry["validation_rows"].extend(trained["validation_rows"])\n',
      '                registry["validation_rows"].extend(trained["validation_rows"])\n                registry["efficiency_rows"].extend(trained.get("efficiency_rows", trained["validation_rows"]))\n',
    );
    trainPatched = true;
  }

  if (source.includes('def generate_efficiency_data(registry: dict)')) {
    source = source.replace(
      '    rows = pd.DataFrame(registry.get("validation_rows", []))\n',
      '    raw_rows = registry.get("efficiency_rows") or registry.get("validation_rows", [])\n    rows = pd.DataFrame(raw_rows)\n',
    );

    source = source.replace(
      '                h_rows = state_rows[state_rows["horizon"].eq(horizon)].tail(EFFICIENCY_MAX_ROWS_PER_SERIES)\n',
      '                h_rows = state_rows[state_rows["horizon"].eq(horizon)].copy()\n                if EFFICIENCY_MAX_ROWS_PER_SERIES > 0:\n                    h_rows = h_rows.tail(EFFICIENCY_MAX_ROWS_PER_SERIES)\n',
    );

    source = source.replace(
      '                    "horizon_days": horizon, "evaluation_scope": "embargoed_holdout_selected_method",\n                    "is_true_model_backtest": True, "metrics": metrics_for(h_rows), "series": series,\n',
      '                    "horizon_days": horizon, "evaluation_scope": "full_history_selected_model_replay",\n                    "is_true_model_backtest": False, "metrics": metrics_for(h_rows), "series": series,\n',
    );
    efficiencyPatched = true;
  }

  if (source !== original) {
    cell.source = asSource(source);
    changedCells += 1;
  }
}

if (!configPatched) throw new Error('Could not patch config cell');
if (!trainPatched) throw new Error('Could not patch train cell');
if (!efficiencyPatched) throw new Error('Could not patch efficiency cell');

const backupPath = `${notebookPath}.full-efficiency-bak`;
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(notebookPath, backupPath);
}

fs.writeFileSync(notebookPath, `${JSON.stringify(notebook, null, 1)}\n`, 'utf8');
console.log(JSON.stringify({
  notebook: path.basename(notebookPath),
  changedCells,
  backupPath,
  configPatched,
  trainPatched,
  efficiencyPatched,
}, null, 2));
