const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputPath = process.argv[3] || inputPath.replace(/\.ipynb$/i, '_live_dashboard_fixed.ipynb');

if (!inputPath) {
  console.error('Usage: node scripts/patchNotebookLiveDashboardPrices.cjs <input.ipynb> [output.ipynb]');
  process.exit(1);
}

const notebook = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const getSource = (cell) => Array.isArray(cell.source) ? cell.source.join('') : String(cell.source || '');
const setSource = (cell, source) => {
  cell.source = source.split(/(?<=\n)/);
};

const helper = `

def normalize_live_dashboard_grain(value: object) -> str | None:
    text = str(value or "").strip().lower()
    if "wheat" in text:
        return "Wheat"
    if "paddy" in text:
        return "Paddy"
    if "maize" in text or "corn" in text:
        return "Maize"
    if "mustard" in text or "rapeseed" in text or "rape seed" in text:
        return "Mustard"
    return None


def fetch_live_dashboard_prices_from_supabase() -> dict:
    """Read the same Market Wise cache used by the website table.

    The model trains from canonical/agmarknet_ai_actuals, but the website's visible
    current All States prices come from agmarknet_marketwise_cache. This function
    keeps release current_price, chart hinge, forecast change %, and reasoning in
    parity with that table without changing the historical training contract.
    """
    client = get_supabase_client()
    if not client:
        return {}
    try:
        response = (
            client.table("agmarknet_marketwise_cache")
            .select("cache_key, request_payload, records, reported_dates, fetched_at, expires_at")
            .like("cache_key", "marketwise_price_arrival|%state=None%")
            .order("fetched_at", desc=True)
            .limit(20)
            .execute()
        )
        rows = response.data or []
    except Exception as exc:
        print(f"Live dashboard price override skipped: {exc}")
        return {}

    prices = {}
    for row in rows:
        records = row.get("records") or []
        for record in records:
            grain = normalize_live_dashboard_grain(
                record.get("commodity")
                or (record.get("raw") or {}).get("cmdt_name")
            )
            if not grain or grain in prices:
                continue
            price_block = record.get("price") or {}
            as_on = price_block.get("as_on") if isinstance(price_block, dict) else {}
            raw = record.get("raw") or {}
            price = as_on.get("value") if isinstance(as_on, dict) else None
            if price is None:
                price = raw.get("as_on_price")
            try:
                price = float(price)
            except Exception:
                continue
            if not np.isfinite(price) or price <= 0:
                continue
            prices[grain] = {
                "price": round(price, 2),
                "reported_dates": row.get("reported_dates") or [],
                "fetched_at": row.get("fetched_at"),
                "source": "supabase_agmarknet_marketwise_cache",
            }
    if prices:
        print("Live dashboard price overrides:", {k: v["price"] for k, v in sorted(prices.items())})
    else:
        print("No live dashboard price overrides found in agmarknet_marketwise_cache")
    return prices


def apply_live_dashboard_price_overrides(predictions: dict, forecast_series: dict, actuals: dict) -> None:
    live_prices = fetch_live_dashboard_prices_from_supabase()
    if not live_prices:
        return

    for grain, live in live_prices.items():
        state = "All States"
        payload = predictions.get(grain, {}).get(state)
        if not payload:
            continue

        old_current = float(payload.get("current_price") or 0)
        new_current = float(live["price"])
        if old_current <= 0 or not np.isfinite(old_current) or not np.isfinite(new_current):
            continue

        ratio = new_current / old_current
        payload["current_price"] = round(new_current, 2)
        payload["live_current_price"] = round(new_current, 2)
        payload["live_current_price_source"] = live.get("source")
        payload["live_current_price_dates"] = live.get("reported_dates") or []
        payload["live_current_price_fetched_at"] = live.get("fetched_at")
        payload["current_price_override_ratio"] = round(float(ratio), 8)

        for horizon_key, h_payload in (payload.get("horizons") or {}).items():
            for key in ["predicted_price", "model_price"]:
                if h_payload.get(key) is not None:
                    h_payload[key] = round(float(h_payload[key]) * ratio, 2)
            interval = h_payload.get("prediction_interval") or {}
            if interval.get("lower") is not None:
                interval["lower"] = round(float(interval["lower"]) * ratio, 2)
            if interval.get("upper") is not None:
                interval["upper"] = round(float(interval["upper"]) * ratio, 2)
            h_payload["live_current_price_aligned"] = True

        for point in forecast_series.get(grain, {}).get(state, []):
            for key in ["price", "prediction_lower", "prediction_upper", "lowerBound", "upperBound"]:
                if point.get(key) is not None:
                    point[key] = round(float(point[key]) * ratio, 2)

        context = actuals.get(grain, {}).get(state, {}).get("context") or []
        if context:
            context[-1]["price"] = round(new_current, 2)
            context[-1]["live_price_override"] = True
            context[-1]["live_price_source"] = live.get("source")

        print(f"Aligned {grain} / {state}: current_price {old_current:.2f} -> {new_current:.2f} (ratio {ratio:.6f})")
`;

let patched = false;
for (const cell of notebook.cells) {
  const source = getSource(cell);
  if (!source.includes('def generate_predictions(canonical: pd.DataFrame, registry: dict)')) continue;

  let next = source;
  if (!next.includes('def fetch_live_dashboard_prices_from_supabase')) {
    next = next.replace('\ndef generate_predictions(canonical: pd.DataFrame, registry: dict)', `${helper}\ndef generate_predictions(canonical: pd.DataFrame, registry: dict)`);
  }
  if (!next.includes('apply_live_dashboard_price_overrides(predictions, forecast_series, actuals)')) {
    next = next.replace(
      '    (RELEASE_DIR / "predictions.json").write_text(json.dumps(predictions, indent=2, allow_nan=False), encoding="utf-8")',
      '    apply_live_dashboard_price_overrides(predictions, forecast_series, actuals)\n    (RELEASE_DIR / "predictions.json").write_text(json.dumps(predictions, indent=2, allow_nan=False), encoding="utf-8")'
    );
  }
  setSource(cell, next);
  patched = true;
  break;
}

if (!patched) {
  console.error('Could not find generate_predictions cell to patch.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(notebook, null, 1), 'utf8');
console.log(`Wrote patched notebook: ${outputPath}`);
