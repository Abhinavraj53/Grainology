"""
predict.py - Generate 7/30/90-day price forecasts per grain using trained ensemble.
Outputs predictions.json for the dashboard.
"""
from __future__ import annotations
from typing import Dict, Tuple, List, Optional
import os, sys, json
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import (
    TARGET_GRAINS, FORECAST_HORIZONS, HORIZON_LABELS,
    OUTPUT_DIR, DASHBOARD_DATA, FORECAST_AS_OF,
)
from train_models import load_bundle


def _predict_ensemble(bundle: dict, X_row: pd.DataFrame, current_price: float) -> tuple[float, float, float]:
    """
    Predict with ensemble. Returns (point_forecast, lower_ci, upper_ci).
    All values in original price scale.
    """
    models  = bundle["models"]
    weights = bundle["weights"]
    conf    = bundle["conformal"]
    feat_cols = bundle["feat_cols"]

    # Align columns
    X = X_row.reindex(columns=feat_cols).fillna(0).astype("float32")

    preds = {}
    for name, model in models.items():
        try:
            if name == "ridge":
                ridge, scaler = model
                X_s = scaler.transform(X)
                preds[name] = float(current_price * np.exp(np.clip(ridge.predict(X_s)[0], -10, 10)))
            elif hasattr(model, "predict"):
                preds[name] = float(current_price * np.exp(np.clip(model.predict(X)[0], -10, 10)))
        except Exception as e:
            print(f"    predict error [{name}]: {e}")

    if not preds:
        return np.nan, np.nan, np.nan

    # MAPE-weighted blend (only models in weights)
    point = sum(preds[k] * w for k, w in weights.items() if k in preds)
    # Conformal intervals
    lower = point + conf["lower_delta"]
    upper = point + conf["upper_delta"]
    return float(point), float(lower), float(upper)


def build_latest_features(price_df: pd.DataFrame, arrival_df: pd.DataFrame,
                           grain: str, other_grains: dict) -> pd.DataFrame:
    """Rebuild feature matrix and return the LAST row (inference point)."""
    from feature_engineering import build_features
    feat_df = build_features(price_df, arrival_df, grain=grain, other_grains=other_grains)
    return feat_df


def generate_predictions(national_daily: dict, arrival_df: pd.DataFrame) -> dict:
    """
    Generate forecasts for all grains × horizons.
    Returns nested dict: grain -> horizon -> {price, lower, upper, metrics, etc.}
    """
    print("\n" + "=" * 60)
    print("GENERATING PREDICTIONS")
    print("=" * 60)

    # ── Fetch live current prices ────────────────────────────────────────────
    live_prices = {}
    try:
        import json as _json
        import urllib.request as _urlreq
        import os as _os

        _grain_map = {
            "Wheat":   "Wheat",
            "Paddy":   "Paddy(Common)",
            "Maize":   "Maize",
            "Mustard": "Mustard",
        }

        # 1. Use the explicit mock data provided by the user if it exists (e.g. Wheat = 2502.07)
        _mock_path = _os.path.join(_os.path.dirname(__file__), "dashboard", "data", "mock_agmarknet.json")
        if _os.path.exists(_mock_path):
            with open(_mock_path, "r", encoding="utf-8") as _mf:
                _mock_data = _json.load(_mf)
            _records = _mock_data.get("data", {}).get("records", [])
            for _r in _records:
                _cmdt = _r.get("cmdt_name", "")
                for _g, _api_name in _grain_map.items():
                    if _cmdt.startswith(_api_name.split("(")[0]):
                        try:
                            _p = float(_r.get("as_on_price", 0))
                            if _p > 0:
                                live_prices[_g] = _p
                        except Exception:
                            pass
            if live_prices:
                print(f"\n[LIVE PRICES from mock_agmarknet.json] {live_prices}")

        # 2. Fallback to Supabase 24hr cache via Node.js API
        if not live_prices:
            _req = _urlreq.Request(
                'http://127.0.0.1:3001/api/agmarknet/marketwise-price-arrival',
                method='POST',
                headers={'Content-Type': 'application/json'},
                data=_json.dumps({
                    "dashboard": "marketwise_price_arrival",
                    "state": 100006,  # All-India national average
                    "limit": 150
                }).encode('utf-8')
            )
            with _urlreq.urlopen(_req, timeout=15) as _resp:
                _parsed = _json.loads(_resp.read().decode())

            _records = _parsed.get("records", [])
            _records_raw = [r.get("raw", r) for r in _records]
            
            for _r in _records_raw:
                _cmdt = _r.get("cmdt_name", "")
                for _g, _api_name in _grain_map.items():
                    if _cmdt.startswith(_api_name.split("(")[0]):
                        try:
                            _price = float(_r.get("as_on_price", 0))
                            if _price > 0 and _g not in live_prices:
                                live_prices[_g] = _price
                        except Exception:
                            pass

            if not live_prices:
                for _r in _records:
                    _cmdt = _r.get("commodity", _r.get("cmdt_name", ""))
                    for _g, _api_name in _grain_map.items():
                        if _cmdt.startswith(_api_name.split("(")[0]):
                            try:
                                _price = float(_r.get("price", {}).get("as_on", {}).get("value", 0) or 0)
                                if _price > 0 and _g not in live_prices:
                                    live_prices[_g] = _price
                            except Exception:
                                pass

            if live_prices:
                print(f"\n[LIVE PRICES from Supabase Cache] {live_prices}")
            else:
                raise ValueError("No prices found in Agmarknet response")

    except Exception as _e:
        print(f"\n[LIVE PRICES] Could not fetch data ({_e}), falling back to CSV prices.")

    results = {}
    today = pd.Timestamp(FORECAST_AS_OF)

    for grain in TARGET_GRAINS.keys():
        price_df = national_daily.get(grain, pd.DataFrame())
        if len(price_df) < 30:
            print(f"  {grain}: insufficient data")
            continue

        grain_cfg = TARGET_GRAINS[grain]
        other = {g: national_daily[g] for g in TARGET_GRAINS if g != grain and g in national_daily}

        # Build latest features
        feat_df = build_latest_features(price_df, arrival_df, grain=grain, other_grains=other)

        # Most recent price — prefer live API price when available
        last_price_csv  = float(price_df["price"].iloc[-1])
        last_date_csv   = pd.Timestamp(price_df["date"].iloc[-1])

        if grain in live_prices:
            last_price = live_prices[grain]
            last_date  = pd.Timestamp(FORECAST_AS_OF)
            last_price_low  = round(last_price * 0.97, 2)
            last_price_high = round(last_price * 1.03, 2)
            print(f"\n{grain}: live price Rs.{last_price:.2f} (API, {last_date.date()}) — CSV had Rs.{last_price_csv:.0f} on {last_date_csv.date()}")
        else:
            last_price = last_price_csv
            last_date  = last_date_csv
            last_price_low  = float(price_df["price_low"].iloc[-1]) if "price_low" in price_df else last_price * 0.95
            last_price_high = float(price_df["price_high"].iloc[-1]) if "price_high" in price_df else last_price * 1.05
            print(f"\n{grain}: last known price Rs.{last_price:.0f} on {last_date.date()}")

        grain_result = {
            "name": grain,
            "icon": grain_cfg["icon"],
            "color": grain_cfg["color"],
            "unit": grain_cfg["unit"],
            "current_price": last_price,
            "current_price_low": last_price_low,
            "current_price_high": last_price_high,
            "last_data_date": str(last_date.date()),
            "forecast_as_of": FORECAST_AS_OF,
            "horizons": {},
        }

        # Build inference row (last row of feat_df)
        X_last = feat_df.iloc[[-1]].copy()

        for horizon in FORECAST_HORIZONS:
            bundle = load_bundle(grain, horizon)
            if bundle is None:
                print(f"  ⚠ No trained model for {grain} H={horizon}d")
                # Fall back to seasonal naive
                point = last_price * (1 + 0.01 * (horizon / 30))
                grain_result["horizons"][horizon] = {
                    "horizon_days": horizon,
                    "horizon_label": HORIZON_LABELS[horizon],
                    "target_date": str((last_date + pd.Timedelta(days=horizon)).date()),
                    "predicted_price": point,
                    "lower_bound": point * 0.93,
                    "upper_bound": point * 1.07,
                    "change_pct": 1.0,
                    "direction": "up",
                    "metrics": {},
                    "top_features": [],
                    "is_fallback": True,
                }
                continue

            point, lower, upper = _predict_ensemble(bundle, X_last, last_price)

            if np.isnan(point):
                point = last_price
                lower = last_price * 0.93
                upper = last_price * 1.07
                
            metrics = bundle.get("metrics", {})
            mape_val = metrics.get("ensemble_mape", 2.0)
            margin = point * (mape_val / 100.0)
            lower = point - margin
            upper = point + margin

            # Clip to reasonable bounds
            point = max(1, min(point, 999999))
            lower = max(1, lower)
            upper = min(999999, upper)

            change_pct = (point - last_price) / max(last_price, 1) * 100
            direction  = "up" if change_pct >= 0 else "down"
            target_date = last_date + pd.Timedelta(days=horizon)

            metrics = bundle.get("metrics", {})
            top_feats = bundle.get("top_features", [])

            # Convert to serialisable
            top_feats_clean = [(f, float(s)) for f, s in top_feats[:10]
                               if isinstance(f, str) and np.isfinite(float(s))]

            print(f"  H={horizon:2d}d -> Rs.{point:,.0f} ({change_pct:+.1f}%) "
                  f"[{lower:,.0f}–{upper:,.0f}] "
                  f"MAPE={metrics.get('ensemble_mape', 'N/A'):.2f}%"
                  if isinstance(metrics.get('ensemble_mape'), float) else
                  f"  H={horizon:2d}d -> Rs.{point:,.0f} ({change_pct:+.1f}%)")

            grain_result["horizons"][horizon] = {
                "horizon_days":   horizon,
                "horizon_label":  HORIZON_LABELS[horizon],
                "target_date":    str(target_date.date()),
                "predicted_price": round(point, 2),
                "lower_bound":    round(lower, 2),
                "upper_bound":    round(upper, 2),
                "change_pct":     round(change_pct, 2),
                "direction":      direction,
                "metrics": {
                    "ensemble_mape": round(metrics.get("ensemble_mape", 0), 3),
                    "ensemble_mae":  round(metrics.get("ensemble_mae",  0), 2),
                    "ensemble_r2":   round(metrics.get("ensemble_r2",   0), 4),
                    "baseline_mape": round(metrics.get("baseline_mape", 0), 3),
                },
                "top_features": top_feats_clean[:10],
                "individual_model_mapes": {
                    k: round(v, 3)
                    for k, v in metrics.get("individual_mapes", {}).items()
                },
                "confidence_level": _confidence_level(metrics, horizon),
                "confidence_percentage": round(max(0, 100 - metrics.get("ensemble_mape", 100)), 1),
                "ensemble_weights": {k: round(v, 3) for k, v in bundle.get("weights", {}).items()},
            }

        results[grain] = grain_result

    return results


def _confidence_level(metrics: dict, horizon: int) -> str:
    """Classify confidence as High/Medium/Low based purely on MAPE."""
    m = metrics.get("ensemble_mape", 100)
    # Thresholds vary by horizon
    if horizon == 7:
        if m < 3: return "High"
        if m < 6: return "Medium"
        return "Low"
    elif horizon == 30:
        if m < 5: return "High"
        if m < 8: return "Medium"
        return "Low"
    else:  # 90
        if m < 7: return "High"
        if m < 12: return "Medium"
        return "Low"


def extract_actuals(national_daily: dict, start_date: str = "2026-07-01") -> dict:
    """
    Extract daily actual prices from start_date to the latest available date.
    """
    import os, json
    from config import DASHBOARD_DATA
    try:
        with open(os.path.join(DASHBOARD_DATA, "mock_agmarknet.json"), "r") as f:
            _parsed = json.load(f)
            _records = _parsed.get("data", {}).get("records", [])
            live_prices = {}
            for r in _records:
                cmdt = r.get("cmdt_name", "").split("(")[0].strip()
                if cmdt in ["Wheat", "Paddy", "Maize", "Mustard"]:
                    live_prices[cmdt] = float(r.get("as_on_price", 0))
    except Exception as e:
        print("Failed to load mock API prices:", e)
        live_prices = {}
    from fetch_live_actuals import get_live_actuals
    live_data = get_live_actuals()

    actuals = {}
    context_start = "2026-06-01"

    print(f"\nExtracting actuals from {start_date} ...")
    for grain, df in national_daily.items():
        if len(df) == 0:
            continue
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])

        # Context window (Jun–Jul 2026)
        context = df[df["date"] >= pd.Timestamp(context_start)].copy()
        # Highlight window (Jul 1–5)
        highlight = df[df["date"] >= pd.Timestamp(start_date)].copy()

        actuals[grain] = {
            "context": [
                {
                    "date": str(row["date"].date()),
                    "price": round(float(row["price"]), 2),
                    "price_low":  round(float(row.get("price_low", row["price"])), 2),
                    "price_high": round(float(row.get("price_high", row["price"])), 2),
                    "is_highlight": row["date"] >= pd.Timestamp(start_date),
                }
                for _, row in context.iterrows()
            ],
            "highlight_count": len(highlight),
            "latest_date": str(df["date"].max().date()),
        }
        
        # Inject live data fetched from API
        if grain in live_data and live_data[grain]:
            # Overwrite overlapping dates in context, and append any new ones
            existing_dates = {item["date"]: i for i, item in enumerate(actuals[grain]["context"])}
            for ld in live_data[grain]:
                if ld["date"] in existing_dates:
                    # Update price if available
                    idx = existing_dates[ld["date"]]
                    actuals[grain]["context"][idx]["price"] = ld["price"]
                    actuals[grain]["context"][idx]["price_low"] = ld["price_low"]
                    actuals[grain]["context"][idx]["price_high"] = ld["price_high"]
                    actuals[grain]["context"][idx]["is_highlight"] = ld["is_highlight"]
                else:
                    actuals[grain]["context"].append(ld)
            
            # Force the very last context date to exactly match the true mock API price!
            if grain in live_prices:
                print(f"DEBUG: Found {grain} in live_prices. FORECAST_AS_OF={FORECAST_AS_OF}")
                for item in actuals[grain]["context"]:
                    print(f"DEBUG: Checking item date {item['date']} against {FORECAST_AS_OF}")
                    if item["date"] == FORECAST_AS_OF:
                        print(f"DEBUG: Overwriting {grain} price {item['price']} with {live_prices[grain]}")
                        item["price"] = live_prices[grain]
                        item["price_low"] = round(live_prices[grain] * 0.97, 2)
                        item["price_high"] = round(live_prices[grain] * 1.03, 2)
            
            # Recount highlights
            hl_count = sum(1 for item in actuals[grain]["context"] if item.get("is_highlight"))
            actuals[grain]["highlight_count"] = hl_count
            
        print(f"  {grain}: {len(context)} context days, {actuals[grain]['highlight_count']} highlighted (Jul)")

    return actuals


def generate_forecast_series(national_daily: dict, predictions: dict, actuals: dict = None) -> dict:
    """
    Generate a daily forecast series for chart rendering.
    Extrapolates from last known price using ensemble point forecast as anchor.
    """
    series = {}
    for grain, result in predictions.items():
        price_df = national_daily.get(grain, pd.DataFrame())
        if len(price_df) == 0:
            continue

        last_date  = pd.Timestamp(result["last_data_date"])
        last_price = result["current_price"]
        horizon_data = result.get("horizons", {})

        # Build anchor points: last known + 7d + 30d + 90d
        anchors = {0: last_price}
        for h, hd in horizon_data.items():
            if int(h) in [7, 30, 90]:
                anchors[int(h)] = hd["predicted_price"]

        # Interpolate between anchors for smooth chart line
        # days: 0, 7, 30, 90
        anchor_days = sorted(anchors.keys())
        anchor_prices = [anchors[d] for d in anchor_days]

        max_day = max(anchor_days)
        interp_days = list(range(1, max_day + 1))
        
        from scipy.interpolate import PchipInterpolator
        price_interpolator = PchipInterpolator(anchor_days, anchor_prices)
        interp_prices = price_interpolator(interp_days)

        # Confidence bands
        lower_anchors = {0: last_price}
        upper_anchors = {0: last_price}
        for h, hd in horizon_data.items():
            if int(h) in [7, 30, 90]:
                lower_anchors[int(h)] = hd["lower_bound"]
                upper_anchors[int(h)] = hd["upper_bound"]

        lower_interpolator = PchipInterpolator(anchor_days, [lower_anchors.get(d, last_price) for d in anchor_days])
        upper_interpolator = PchipInterpolator(anchor_days, [upper_anchors.get(d, last_price) for d in anchor_days])
        
        interp_lower = lower_interpolator(interp_days)
        interp_upper = upper_interpolator(interp_days)

        # Removed bias correction to ensure chart perfectly matches predictions.json

        # Removed error bounding shift to ensure perfect sync with predictions.json

        forecast_points = []
        for i, day in enumerate(interp_days):
            forecast_points.append({
                "date":  (last_date + pd.Timedelta(days=day)).strftime("%Y-%m-%d"),
                "price": round(float(interp_prices[i]), 2),
                "lower": round(float(interp_lower[i]), 2),
                "upper": round(float(interp_upper[i]), 2),
                "is_anchor": day in anchor_days,
                "anchor_horizon": day if day in anchor_days else None,
            })

        series[grain] = forecast_points

    return series


def save_predictions_json(predictions: dict, actuals: dict, forecast_series: dict):
    """Save all outputs to dashboard/data/"""
    # Main predictions
    path = os.path.join(DASHBOARD_DATA, "predictions.json")
    json_str = json.dumps(predictions, indent=2, default=str)
    json_str = json_str.replace(': Infinity', ': null').replace(': -Infinity', ': null').replace(': NaN', ': null')
    with open(path, "w", encoding="utf-8") as f:
        f.write(json_str)
    print(f"Saved: {path}")

    # Actuals
    path = os.path.join(DASHBOARD_DATA, "actuals.json")
    with open(path, "w") as f:
        json.dump(actuals, f, indent=2, default=str)
    print(f"Saved: {path}")

    # Forecast series
    path = os.path.join(DASHBOARD_DATA, "forecast_series.json")
    with open(path, "w") as f:
        json.dump(forecast_series, f, indent=2, default=str)
    print(f"Saved: {path}")


def run_predict(national_daily: dict, arrival_df: pd.DataFrame):
    print("\n[PREDICTION ENGINE] Using real Agmarknet actuals injected by data_pipeline for forward prediction.")

    # 1. Generate CURRENT predictions for the forecast cards (always from today)
    predictions = generate_predictions(national_daily, arrival_df)
    actuals     = extract_actuals(national_daily)

    # ALWAYS generate normal forward forecast series for the chart
    forecast_series = generate_forecast_series(national_daily, predictions, actuals)

    save_predictions_json(predictions, actuals, forecast_series)

    # Apply latest ensemble metrics patch (from most recent training log)
    try:
        _patch_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "patch_predictions.py")
        if os.path.exists(_patch_path):
            import runpy
            runpy.run_path(_patch_path, run_name="__main__")
            print("[OK] Ensemble metrics patch applied.")
    except Exception as _pe:
        print(f"[WARN] Patch step skipped: {_pe}")

    print("\n[OK] Prediction generation complete.")
    return predictions, actuals, forecast_series


if __name__ == "__main__":
    from data_pipeline import run_pipeline
    national_daily, arrival_df = run_pipeline()
    run_predict(national_daily, arrival_df)
