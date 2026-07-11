const fs = require('fs');

const notebookPath = process.argv[2];
if (!notebookPath) {
  console.error('Usage: node scripts/inspectNotebookMetrics.cjs <notebook.ipynb>');
  process.exit(1);
}

const notebook = JSON.parse(fs.readFileSync(notebookPath, 'utf8'));
console.log(JSON.stringify({
  cells: notebook.cells.length,
  codeCells: notebook.cells.filter((cell) => cell.cell_type === 'code').length,
}, null, 2));

const patterns = [
  'ml_mae',
  'baseline_mae',
  'method_maes',
  'method_mae',
  'method_mapes',
  'baseline_mape',
  '"metrics": {',
];

notebook.cells.forEach((cell, index) => {
  const source = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source || '');
  if (patterns.some((pattern) => source.includes(pattern))) {
    console.log(`\n--- CELL ${index} ---`);
    console.log(source.slice(0, 5000));
  }
});
