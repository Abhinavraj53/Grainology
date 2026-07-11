const fs = require('fs');

const [notebookPath, rawTerm = 'ml_mae'] = process.argv.slice(2);
if (!notebookPath) {
  console.error('Usage: node scripts/notebookLineContext.cjs <notebook.ipynb> [term]');
  process.exit(1);
}

const notebook = JSON.parse(fs.readFileSync(notebookPath, 'utf8'));
notebook.cells.forEach((cell, cellIndex) => {
  const text = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source || '');
  if (!text.includes(rawTerm)) return;
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    if (!line.includes(rawTerm)) return;
    const start = Math.max(0, index - 10);
    const end = Math.min(lines.length, index + 12);
    console.log(`\n--- CELL ${cellIndex}, LINE ${index + 1}, TERM ${rawTerm} ---`);
    for (let lineIndex = start; lineIndex < end; lineIndex += 1) {
      console.log(String(lineIndex + 1).padStart(4, ' '), lines[lineIndex]);
    }
  });
});
