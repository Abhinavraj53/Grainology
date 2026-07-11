const fs = require('fs');
const path = require('path');

const notebookPath = process.argv[2];
if (!notebookPath) {
  console.error('Usage: node scripts/patchExternalNotebookMae.cjs <notebook.ipynb>');
  process.exit(1);
}

const notebook = JSON.parse(fs.readFileSync(notebookPath, 'utf8'));

const asText = (source) => Array.isArray(source) ? source.join('') : String(source || '');
const asSource = (text) => text.split(/(?<=\n)/);

let changedCells = 0;
let trainPatched = false;
let predictPatched = false;

for (const cell of notebook.cells) {
  if (cell.cell_type !== 'code') continue;
  let source = asText(cell.source);
  const original = source;

  if (
    (source.includes('method_mae = {}') || source.includes('method_mae = {name: mae('))
    && source.includes('"ml_mae"')
  ) {
    if (!source.includes('baseline_mae = method_mae.get("baseline", math.inf)')) {
      if (source.includes('        baseline_mape = method_scores.get("baseline", math.inf)\n')) {
        source = source.replace(
          '        baseline_mape = method_scores.get("baseline", math.inf)\n',
          '        baseline_mape = method_scores.get("baseline", math.inf)\n        baseline_mae = method_mae.get("baseline", math.inf)\n',
        );
      }
    }

    if (!source.includes('"baseline_mae": round(float(baseline_mae), 4)')) {
      if (source.includes('            "baseline_mape": round(float(baseline_mape), 4) if np.isfinite(baseline_mape) else None,\n')) {
        source = source.replace(
          '            "baseline_mape": round(float(baseline_mape), 4) if np.isfinite(baseline_mape) else None,\n',
          '            "baseline_mape": round(float(baseline_mape), 4) if np.isfinite(baseline_mape) else None,\n            "baseline_mae": round(float(baseline_mae), 4) if np.isfinite(baseline_mae) else None,\n',
        );
      }
      if (source.includes('            "baseline_mape": round(float(method_scores.get("baseline", math.inf)), 4),\n')) {
        source = source.replace(
          '            "baseline_mape": round(float(method_scores.get("baseline", math.inf)), 4),\n',
          '            "baseline_mape": round(float(method_scores.get("baseline", math.inf)), 4),\n            "baseline_mae": round(float(method_mae.get("baseline", math.inf)), 4) if np.isfinite(method_mae.get("baseline", math.inf)) else None,\n',
        );
      }
    }

    if (!source.includes('"method_maes": {name: round(float(score), 4)')) {
      source = source.replace(
        '            "method_mapes": {name: round(float(score), 4) for name, score in method_scores.items() if np.isfinite(score)},\n',
        '            "method_mapes": {name: round(float(score), 4) for name, score in method_scores.items() if np.isfinite(score)},\n            "method_maes": {name: round(float(score), 4) for name, score in method_mae.items() if np.isfinite(score)},\n',
      );
    }
    trainPatched = true;
  }

  if (source.includes('"metrics": {') && source.includes('"mape": as_json_float(metric_payload.get("ml_mape"))')) {
    if (!source.includes('"mae": as_json_float(metric_payload.get("ml_mae"))')) {
      source = source.replace(
        '                        "mape": as_json_float(metric_payload.get("ml_mape")),\n',
        '                        "mape": as_json_float(metric_payload.get("ml_mape")),\n                        "mae": as_json_float(metric_payload.get("ml_mae")),\n',
      );
    }

    if (!source.includes('"baseline_mae": as_json_float(metric_payload.get("baseline_mae"))')) {
      source = source.replace(
        '                        "baseline_mape": as_json_float(metric_payload.get("baseline_mape")),\n',
        '                        "baseline_mape": as_json_float(metric_payload.get("baseline_mape")),\n                        "baseline_mae": as_json_float(metric_payload.get("baseline_mae")),\n',
      );
    }

    if (!source.includes('"method_maes": metric_payload.get("method_maes", {})')) {
      source = source.replace(
        '                        "method_mapes": metric_payload.get("method_mapes", {}),\n',
        '                        "method_mapes": metric_payload.get("method_mapes", {}),\n                        "method_maes": metric_payload.get("method_maes", {}),\n',
      );
    }
    predictPatched = true;
  }

  if (source !== original) {
    cell.source = asSource(source);
    changedCells += 1;
  }
}

if (!trainPatched) {
  throw new Error('Could not find training metrics cell to patch');
}
if (!predictPatched) {
  throw new Error('Could not find prediction export metrics cell to patch');
}

const backupPath = `${notebookPath}.mae-bak`;
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(notebookPath, backupPath);
}

fs.writeFileSync(notebookPath, `${JSON.stringify(notebook, null, 1)}\n`, 'utf8');
console.log(JSON.stringify({
  notebook: path.basename(notebookPath),
  changedCells,
  backupPath,
  trainPatched,
  predictPatched,
}, null, 2));
