const fs = require('fs');

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error('Usage: node scripts/makeFinalNotebookWithLivePriceCheck.cjs <input.ipynb> <output.ipynb>');
  process.exit(1);
}

const notebook = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const getSource = (cell) => Array.isArray(cell.source) ? cell.source.join('') : String(cell.source || '');

const markdownCell = {
  cell_type: 'markdown',
  metadata: {},
  source: [
    '## 0A. Live Price Sanity Check Before Training\n',
    '\n',
    'This runs before historical loading and model training. If these prices do not match the live Market Wise Price and Arrival table, stop here and fix the data/cache before waiting for the full training run.\n',
  ],
};

const code = `print("\\nLive dashboard price sanity check before training")
print("If these do not match the website Market Wise Price and Arrival table, stop the run here.")

live_price_check = fetch_live_dashboard_prices_from_supabase()
if not live_price_check:
    print("No live dashboard price overrides found. Training can continue, but current_price will come from canonical data only.")
else:
    live_price_rows = []
    for grain in TARGET_GRAINS:
        payload = live_price_check.get(grain)
        live_price_rows.append({
            "grain": grain,
            "live_price": None if not payload else payload.get("price"),
            "reported_dates": None if not payload else payload.get("reported_dates"),
            "fetched_at": None if not payload else payload.get("fetched_at"),
            "cache_key": None if not payload else payload.get("cache_key"),
            "source": None if not payload else payload.get("source"),
        })
    live_price_frame = pd.DataFrame(live_price_rows)
    display(live_price_frame)
    missing_live_prices = live_price_frame[live_price_frame["live_price"].isna()]["grain"].tolist()
    if missing_live_prices:
        print("Missing live prices for:", missing_live_prices)
    else:
        print("All target grain live prices were found before training.")
`;

const codeCell = {
  cell_type: 'code',
  execution_count: null,
  metadata: {},
  outputs: [],
  source: code.split(/(?<=\n)/),
};

const alreadyInserted = notebook.cells.some((cell) => getSource(cell).includes('Live dashboard price sanity check before training'));
if (!alreadyInserted) {
  let insertAt = notebook.cells.findIndex((cell) => getSource(cell).startsWith('## 1. Discover Every Input File'));
  if (insertAt < 0) insertAt = notebook.cells.length;
  notebook.cells.splice(insertAt, 0, markdownCell, codeCell);
}

fs.writeFileSync(outputPath, JSON.stringify(notebook, null, 1), 'utf8');
console.log(`Wrote ${outputPath} (${notebook.cells.length} cells)`);
