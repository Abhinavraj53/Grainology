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


LIVE_DASHBOARD_PRICE_CACHE = None


def _extract_live_dashboard_prices(records: list, metadata: dict) -> dict:
    prices = {}
    for record in records or []:
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
            "reported_dates": metadata.get("reported_dates") or [],
            "fetched_at": metadata.get("fetched_at"),
            "source": metadata.get("source"),
            "cache_key": metadata.get("cache_key"),
        }
    return prices


def fetch_live_dashboard_prices_from_website_api() -> dict:
    """Read the same backend endpoint that powers the visible website table."""
    import requests
    from datetime import datetime, timedelta
    from zoneinfo import ZoneInfo

    url = os.environ.get(
        "GRAINOLOGY_MARKETWISE_API_URL",
        "https://grainology.onrender.com/api/agmarknet/marketwise-price-arrival",
    )
    today = datetime.now(ZoneInfo("Asia/Kolkata")).date()
    base_payload = {
        "dashboard": "marketwise_price_arrival",
        "date": today.isoformat(),
        "state": 100006,
        "district": [],
        "market": [100009],
        "group": [],
        "commodity": [1, 2, 4],
        "variety": 100021,
        "grades": [4],
        "limit": 150,
        "force": False,
        "format": "json",
    }

    def _parse_reported_date(value: object):
        try:
            return datetime.strptime(str(value), "%d-%m-%Y").date()
        except Exception:
            return None

    def request_prices(payload: dict, label: str) -> tuple[dict, dict]:
        print(f"Website API live dashboard request payload ({label}):", payload)
        try:
            response = requests.post(url, json=payload, timeout=45)
            response.raise_for_status()
            data = response.json()
        except Exception as exc:
            print(f"Website API live price fetch skipped for {label}: {exc}")
            return {}, {}

        records = data.get("records") or []
        metadata = {
            "reported_dates": data.get("reported_dates") or [],
            "fetched_at": data.get("fetched_at"),
            "source": f"grainology_backend:{data.get('source') or 'unknown'}",
            "cache_key": f"website_api_marketwise_price_arrival:{label}:date={payload.get('date')}",
            "request_date": payload.get("date"),
            "record_count": len(records),
        }
        print(
            f"Website API live dashboard row ({label}):",
            {
                "reported_dates": metadata["reported_dates"],
                "fetched_at": metadata["fetched_at"],
                "source": metadata["source"],
                "record_count": len(records),
            },
        )
        return _extract_live_dashboard_prices(records, metadata), metadata

    candidates = []
    for offset in range(0, 4):
        request_date = (today - timedelta(days=offset)).isoformat()
        dated_payload = {**base_payload, "date": request_date}
        prices, metadata = request_prices(dated_payload, f"default_faq_d{offset}")
        mustard_payload = {**dated_payload, "commodity": [12]}
        mustard_prices, mustard_meta = request_prices(mustard_payload, f"mustard_faq_d{offset}")
        if "Mustard" not in mustard_prices:
            mustard_prices, mustard_meta = request_prices({**mustard_payload, "grades": []}, f"mustard_all_grades_d{offset}")
        if "Mustard" in mustard_prices:
            prices["Mustard"] = mustard_prices["Mustard"]
        reported = (metadata or mustard_meta or {}).get("reported_dates") or []
        reported_max = max([d for d in (_parse_reported_date(x) for x in reported) if d is not None], default=None)
        candidates.append({
            "request_date": request_date,
            "reported_max": reported_max,
            "count": len(prices),
            "prices": prices,
        })

    usable = [c for c in candidates if c["prices"]]
    if not usable:
        print("Website API returned no usable live dashboard prices")
        return {}

    complete = [c for c in usable if all(grain in c["prices"] for grain in TARGET_GRAINS)]
    pool = complete or usable
    newest_reported = max([c["reported_max"] for c in pool if c["reported_max"] is not None], default=None)
    if newest_reported is not None:
        pool = [c for c in pool if c["reported_max"] == newest_reported]
    pool = sorted(pool, key=lambda c: (-c["count"], c["request_date"]))
    chosen = pool[0]
    prices = chosen["prices"]
    print(
        "Selected live dashboard request date:",
        chosen["request_date"],
        "reported date:",
        chosen["reported_max"],
        "price count:",
        chosen["count"],
    )

    if prices:
        print("Website API live dashboard prices:", {k: v["price"] for k, v in sorted(prices.items())})
    else:
        print("Website API returned no usable live dashboard prices")
    return prices


def fetch_live_dashboard_prices_from_supabase_cache() -> dict:
    """Read the Market Wise cache as a fallback when the website API is unavailable.

    The model trains from canonical/agmarknet_ai_actuals, but the website's visible
    current All States prices come from agmarknet_marketwise_cache. This function
    keeps release current_price, chart hinge, forecast change %, and reasoning in
    parity with that table without changing the historical training contract.
    """
    client = get_supabase_client()
    if not client:
        return {}
    def _coerce_json(value, fallback):
        if value is None:
            return fallback
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return fallback
        return value

    try:
        response = (
            client.table("agmarknet_marketwise_cache")
            .select("cache_key, request_payload, records, reported_dates, fetched_at, expires_at")
            .like("cache_key", "marketwise_price_arrival|%state=100006%")
            .order("fetched_at", desc=True)
            .limit(20)
            .execute()
        )
        rows = response.data or []
    except Exception as exc:
        print(f"Live dashboard price override skipped: {exc}")
        return {}

    if not rows:
        try:
            response = (
                client.table("agmarknet_marketwise_cache")
                .select("cache_key, request_payload, records, reported_dates, fetched_at, expires_at")
                .order("fetched_at", desc=True)
                .limit(100)
                .execute()
            )
            rows = response.data or []
            print("Exact All States cache key not found; scanning recent marketwise cache rows")
        except Exception as exc:
            print(f"Live dashboard price fallback scan skipped: {exc}")
            return {}

    def _row_score(row: dict) -> tuple:
        cache_key = str(row.get("cache_key") or "")
        payload = _coerce_json(row.get("request_payload"), {}) or {}
        records = _coerce_json(row.get("records"), []) or []
        is_marketwise = "marketwise_price_arrival" in cache_key or payload.get("dashboard") == "marketwise_price_arrival"
        is_all_states = payload.get("state") == 100006 or "state=100006" in cache_key
        grain_count = 0
        seen = set()
        for record in records:
            grain = normalize_live_dashboard_grain(record.get("commodity") or (record.get("raw") or {}).get("cmdt_name"))
            if grain:
                seen.add(grain)
        grain_count = len(seen)
        return (1 if is_marketwise else 0, 1 if is_all_states else 0, grain_count, str(row.get("fetched_at") or ""))

    rows = sorted(rows, key=_row_score, reverse=True)
    selected_row = rows[0] if rows else None
    if not selected_row:
        print("No marketwise cache rows were available for live dashboard price overrides")
        return {}

    selected_records = _coerce_json(selected_row.get("records"), []) or []
    print(
        "Selected live dashboard cache row:",
        {
            "cache_key": selected_row.get("cache_key"),
            "reported_dates": selected_row.get("reported_dates"),
            "fetched_at": selected_row.get("fetched_at"),
            "record_count": len(selected_records),
        },
    )

    prices = _extract_live_dashboard_prices(
        selected_records,
        {
            "reported_dates": selected_row.get("reported_dates") or [],
            "fetched_at": selected_row.get("fetched_at"),
            "source": "supabase_agmarknet_marketwise_cache",
            "cache_key": selected_row.get("cache_key"),
        },
    )
    missing_grains = [grain for grain in TARGET_GRAINS if grain not in prices]
    if missing_grains:
        print("Selected live dashboard cache row did not contain:", missing_grains)
    if prices:
        print("Live dashboard price overrides:", {k: v["price"] for k, v in sorted(prices.items())})
    else:
        print("No live dashboard price overrides found in agmarknet_marketwise_cache")
    return prices


def fetch_live_dashboard_prices_from_supabase() -> dict:
    global LIVE_DASHBOARD_PRICE_CACHE
    if LIVE_DASHBOARD_PRICE_CACHE:
        print("Reusing approved live dashboard prices from notebook sanity check")
        return LIVE_DASHBOARD_PRICE_CACHE

    prices = fetch_live_dashboard_prices_from_website_api()
    if prices:
        LIVE_DASHBOARD_PRICE_CACHE = prices
        return prices
    print("Falling back to Supabase agmarknet_marketwise_cache for live dashboard prices")
    prices = fetch_live_dashboard_prices_from_supabase_cache()
    if prices:
        LIVE_DASHBOARD_PRICE_CACHE = prices
    return prices


def apply_live_dashboard_price_overrides(predictions: dict, forecast_series: dict, actuals: dict) -> None:
    live_prices = fetch_live_dashboard_prices_from_supabase()
    if not live_prices:
        if str(os.environ.get("LIVE_DASHBOARD_PRICE_STRICT", "true")).strip().lower() in {"1", "true", "yes", "y"}:
            raise RuntimeError("Live dashboard price strict check failed: no live prices were found")
        return

    strict_live_prices = str(os.environ.get("LIVE_DASHBOARD_PRICE_STRICT", "true")).strip().lower() in {"1", "true", "yes", "y"}

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

    audit_rows = []
    audit_errors = []
    for grain in TARGET_GRAINS:
        live = live_prices.get(grain)
        payload = predictions.get(grain, {}).get("All States")
        live_price = None if not live else float(live.get("price"))
        final_price = None if not payload else float(payload.get("current_price") or np.nan)
        delta = None if live_price is None or final_price is None or not np.isfinite(final_price) else round(final_price - live_price, 4)
        audit_rows.append({
            "grain": grain,
            "live_price": live_price,
            "final_prediction_current_price": final_price,
            "delta": delta,
            "source": None if not live else live.get("source"),
            "cache_key": None if not live else live.get("cache_key"),
        })
        if strict_live_prices:
            if live_price is None:
                audit_errors.append(f"{grain}: missing live dashboard price")
            elif final_price is None or not np.isfinite(final_price):
                audit_errors.append(f"{grain}: missing final prediction current_price")
            elif abs(final_price - live_price) > 0.01:
                audit_errors.append(f"{grain}: final current_price {final_price:.2f} != live price {live_price:.2f}")

    print("Final live dashboard price audit")
    try:
        display(pd.DataFrame(audit_rows))
    except Exception:
        print(audit_rows)

    if audit_errors:
        raise RuntimeError("Live dashboard price strict check failed: " + "; ".join(audit_errors))
`;

let patched = false;
for (const cell of notebook.cells) {
  const source = getSource(cell);
  if (!source.includes('def generate_predictions(canonical: pd.DataFrame, registry: dict)')) continue;

  let next = source;
  if (next.includes('def fetch_live_dashboard_prices_from_supabase')) {
    next = next.replace(
      /\n\ndef normalize_live_dashboard_grain[\s\S]*?\n\ndef generate_predictions\(canonical: pd\.DataFrame, registry: dict\)/,
      `${helper}\ndef generate_predictions(canonical: pd.DataFrame, registry: dict)`
    );
  } else {
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
