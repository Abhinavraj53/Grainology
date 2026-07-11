const fs = require('fs');

const notebookPath = process.argv[2];
if (!notebookPath) {
  console.error('Usage: node scripts/validateNotebookMae.cjs <notebook.ipynb>');
  process.exit(1);
}

const notebook = JSON.parse(fs.readFileSync(notebookPath, 'utf8'));
const text = notebook.cells
  .map((cell) => Array.isArray(cell.source) ? cell.source.join('') : String(cell.source || ''))
  .join('\n');

const result = {
  validJson: true,
  cells: notebook.cells.length,
  hasMaeMetricExport: text.includes('"mae": as_json_float(metric_payload.get("ml_mae"))'),
  hasBaselineMaeMetricExport: text.includes('"baseline_mae": as_json_float(metric_payload.get("baseline_mae"))'),
  hasMethodMaesMetricExport: text.includes('"method_maes": metric_payload.get("method_maes", {})'),
  hasTrainingBaselineMae: text.includes('"baseline_mae": round(float(method_mae.get("baseline", math.inf)), 4)'),
  hasTrainingMethodMaes: text.includes('"method_maes": {name: round(float(score), 4) for name, score in method_mae.items()'),
};

console.log(JSON.stringify(result, null, 2));
if (!Object.entries(result).every(([, value]) => value === true || typeof value === 'number')) {
  process.exit(1);
}
