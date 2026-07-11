from __future__ import annotations

import json
import math

import numpy as np
import pandas as pd

from .config import EFFICIENCY_MAX_ROWS_PER_SERIES, HORIZONS, RELEASE_DIR, TARGET_GRAINS


def metrics_for(rows: pd.DataFrame) -> dict:
    if rows.empty:
        return {"sample_count": 0}
    error = rows["predicted_price"] - rows["actual_price"]
    pct = (error.abs() / rows["actual_price"].replace(0, np.nan)).replace([np.inf, -np.inf], np.nan)
    return {
        "sample_count": int(len(rows)),
        "mae": round(float(error.abs().mean()), 2),
        "rmse": round(float(math.sqrt((error ** 2).mean())), 2),
        "mape": round(float(pct.mean() * 100), 2),
        "wape": round(float(error.abs().sum() / rows["actual_price"].abs().sum() * 100), 2),
    }


def generate_efficiency_data(registry: dict) -> tuple[dict, dict]:
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    rows = pd.DataFrame([
        *registry.get("history_rows", []),
        *registry.get("validation_rows", []),
    ])
    historical_efficiency = {grain: {} for grain in TARGET_GRAINS}
    backtest = {grain: {} for grain in TARGET_GRAINS}

    if rows.empty:
        (RELEASE_DIR / "historical_efficiency.json").write_text(json.dumps(historical_efficiency, indent=2), encoding="utf-8")
        (RELEASE_DIR / "backtest.json").write_text(json.dumps(backtest, indent=2), encoding="utf-8")
        return historical_efficiency, backtest

    rows["error_pct"] = (rows["predicted_price"] - rows["actual_price"]).abs() / rows["actual_price"] * 100
    rows["method_rank"] = rows["method"].eq("baseline_history").astype(int)
    rows = (
        rows.sort_values(["grain", "state_name", "horizon", "target_date", "method_rank"])
        .drop_duplicates(["grain", "state_name", "horizon", "origin_date", "target_date"], keep="first")
        .sort_values(["grain", "state_name", "horizon", "target_date"])
    )

    for grain in TARGET_GRAINS:
        grain_rows = rows[rows["grain"].eq(grain)]
        for state, state_rows in grain_rows.groupby("state_name"):
            historical_efficiency[grain][state] = {}
            backtest[grain][state] = {}
            for horizon in HORIZONS:
                h_rows = state_rows[state_rows["horizon"].eq(horizon)]
                if EFFICIENCY_MAX_ROWS_PER_SERIES > 0:
                    h_rows = h_rows.tail(EFFICIENCY_MAX_ROWS_PER_SERIES)
                if h_rows.empty:
                    continue
                series = [
                    {
                        "origin_date": row.origin_date,
                        "date": row.target_date,
                        "actual_price": round(float(row.actual_price), 2),
                        "predicted_price": round(float(row.predicted_price), 2),
                        "error_pct": round(float(row.error_pct), 2),
                        "method": row.method,
                    }
                    for row in h_rows.itertuples()
                ]
                payload = {
                    "horizon_days": horizon,
                    "metrics": metrics_for(h_rows),
                    "series": series,
                }
                historical_efficiency[grain][state][str(horizon)] = payload
                backtest[grain][state][str(horizon)] = {
                    "backtestDate": h_rows["target_date"].max(),
                    "metrics": payload["metrics"],
                    "comparisons": [
                        {
                            "date": item["date"],
                            "actualPrice": item["actual_price"],
                            "predictedPrice": item["predicted_price"],
                            "difference": round(item["predicted_price"] - item["actual_price"], 2),
                            "errorPct": item["error_pct"],
                        }
                        for item in series[-15:]
                    ],
                }

    (RELEASE_DIR / "historical_efficiency.json").write_text(json.dumps(historical_efficiency, indent=2, allow_nan=False), encoding="utf-8")
    (RELEASE_DIR / "backtest.json").write_text(json.dumps(backtest, indent=2, allow_nan=False), encoding="utf-8")
    return historical_efficiency, backtest
