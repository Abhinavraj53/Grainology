"""
fix_all_prices.py
-----------------
Uses EXACT prices from the agmarknet website screenshot (03-Jul-2026 data).
Wheat:  01-Jul=2515.99, 02-Jul=2520.25, 03-Jul=2521.05
Maize:  01-Jul=1930.47, 02-Jul=1978.01, 03-Jul=1971.09
Paddy:  01-Jul=2464.52, 02-Jul=2597.39, 03-Jul=2623.66
"""
import json, os

BASE = os.path.join(os.path.dirname(__file__), "dashboard", "data")

# ─── Real prices from agmarknet screenshot ────────────────────────────────────
REAL_PRICES = {
    "Wheat": [
        {"date": "2026-07-01", "price": 2515.99, "price_low": 2390.19, "price_high": 2641.79, "is_highlight": True},
        {"date": "2026-07-02", "price": 2520.25, "price_low": 2394.24, "price_high": 2646.26, "is_highlight": True},
        {"date": "2026-07-03", "price": 2521.05, "price_low": 2394.99, "price_high": 2647.10, "is_highlight": True},
    ],
    "Maize": [
        {"date": "2026-07-01", "price": 1930.47, "price_low": 1833.95, "price_high": 2026.99, "is_highlight": True},
        {"date": "2026-07-02", "price": 1978.01, "price_low": 1879.11, "price_high": 2076.91, "is_highlight": True},
        {"date": "2026-07-03", "price": 1971.09, "price_low": 1872.54, "price_high": 2069.64, "is_highlight": True},
    ],
    "Paddy": [
        {"date": "2026-07-01", "price": 2464.52, "price_low": 2341.29, "price_high": 2587.75, "is_highlight": True},
        {"date": "2026-07-02", "price": 2597.39, "price_low": 2467.52, "price_high": 2727.26, "is_highlight": True},
        {"date": "2026-07-03", "price": 2623.66, "price_low": 2492.48, "price_high": 2754.84, "is_highlight": True},
    ],
}

# New current prices (03-Jul-2026 as_on values)
CURRENT_PRICES = {
    "Wheat":   2521.05,
    "Maize":   1971.09,
    "Paddy":   2623.66,
    "Mustard": 6999.0,   # unchanged – not in screenshot
}

# ─── Load all JSONs into memory first ───────────────────────────────────────
with open(os.path.join(BASE, "actuals.json")) as f:
    actuals = json.load(f)
with open(os.path.join(BASE, "predictions.json")) as f:
    preds = json.load(f)
with open(os.path.join(BASE, "forecast_series.json")) as f:
    fs = json.load(f)

# ─── 1. Patch actuals.json ────────────────────────────────────────────────────
for grain, new_rows in REAL_PRICES.items():
    if grain not in actuals:
        continue
    ctx = actuals[grain]["context"]
    ctx = [r for r in ctx if r["date"] not in {"2026-07-01","2026-07-02","2026-07-03","2026-07-04"}]
    ctx.extend(new_rows)
    ctx.sort(key=lambda r: r["date"])
    actuals[grain]["context"] = ctx
    actuals[grain]["highlight_count"] = sum(1 for r in ctx if r.get("is_highlight"))
    actuals[grain]["latest_date"] = "2026-07-03"
    print(f"  {grain}: updated actuals, last price {new_rows[-1]['price']} on {new_rows[-1]['date']}")

with open(os.path.join(BASE, "actuals.json"), "w") as f:
    json.dump(actuals, f, indent=2)
print("Saved actuals.json")

# ─── 2. Scale predictions.json and forecast_series.json together ──────────────
for grain, new_current in CURRENT_PRICES.items():
    if grain not in preds or grain not in fs:
        continue
    g = preds[grain]
    series = fs[grain]
    
    old_current = g["current_price"]
    if abs(old_current - new_current) < 0.01:
        print(f"  {grain}: price unchanged ({new_current})")
        continue
        
    scale = new_current / old_current if old_current > 0 else 1.0
    
    # Scale predictions
    g["current_price"] = new_current
    g["current_price_low"]  = round(new_current * 0.97, 2)
    g["current_price_high"] = round(new_current * 1.03, 2)
    g["last_data_date"] = "2026-07-03"
    for h_str, hd in g["horizons"].items():
        hd["predicted_price"] = round(hd["predicted_price"] * scale, 2)
        hd["lower_bound"]     = round(hd["lower_bound"] * scale, 2)
        hd["upper_bound"]     = round(hd["upper_bound"] * scale, 2)
        hd["change_pct"]      = round((hd["predicted_price"] - new_current) / new_current * 100, 2)
        hd["direction"]       = "up" if hd["change_pct"] >= 0 else "down"
    
    # Scale forecast series
    for pt in series:
        pt["price"] = round(pt["price"] * scale, 2)
        pt["lower"] = round(pt["lower"] * scale, 2)
        pt["upper"] = round(pt["upper"] * scale, 2)
    if series:
        series[0]["date"] = "2026-07-03"
        
    print(f"  {grain}: rescaled uniformly by {scale:.4f} ({old_current} -> {new_current})")

with open(os.path.join(BASE, "predictions.json"), "w") as f:
    json.dump(preds, f, indent=2)
print("Saved predictions.json")

with open(os.path.join(BASE, "forecast_series.json"), "w") as f:
    json.dump(fs, f, indent=2)
print("Saved forecast_series.json")

print("\n[OK] All prices mathematically synced from agmarknet screenshot data.")
