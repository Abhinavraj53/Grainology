const fs = require('fs');

const notebookPath = process.argv[2];
if (!notebookPath) {
  console.error('Usage: node scripts/validateNotebookFullEfficiency.cjs <notebook.ipynb>');
  process.exit(1);
}

const notebook = JSON.parse(fs.readFileSync(notebookPath, 'utf8'));
const text = notebook.cells
  .map((cell) => Array.isArray(cell.source) ? cell.source.join('') : String(cell.source || ''))
  .join('\n');

const count = (needle) => text.split(needle).length - 1;
const result = {
  validJson: true,
  cells: notebook.cells.length,
  noCapDefault: text.includes('EFFICIENCY_MAX_ROWS_PER_SERIES = int(os.environ.get("EFFICIENCY_MAX_ROWS_PER_SERIES", "0"))'),
  maxSize160: text.includes('MAX_EFFICIENCY_FILE_MB = float(os.environ.get("MAX_EFFICIENCY_FILE_MB", "160"))'),
  hasEfficiencyRowsRegistry: text.includes('"efficiency_rows": []'),
  hasEfficiencyRowsReturn: text.includes('"validation_rows": validation_rows, "efficiency_rows": efficiency_rows'),
  hasEfficiencyRowsExtend: text.includes('registry["efficiency_rows"].extend(trained.get("efficiency_rows", trained["validation_rows"]))'),
  hasFullReplay: count('Full-history replay for dashboard efficiency') === 1,
  hasNoCapRuntime: text.includes('if EFFICIENCY_MAX_ROWS_PER_SERIES > 0:'),
  hasEfficiencyRowsInput: text.includes('raw_rows = registry.get("efficiency_rows") or registry.get("validation_rows", [])'),
  hasReplayScope: text.includes('"full_history_selected_model_replay"'),
};

console.log(JSON.stringify(result, null, 2));
if (!Object.entries(result).every(([, value]) => value === true || typeof value === 'number')) {
  process.exit(1);
}
