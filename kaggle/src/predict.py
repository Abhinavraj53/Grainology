from __future__ import annotations

import json
from datetime import timedelta

import numpy as np
import pandas as pd

from .config import FORECAST_HISTORY_DAYS, HORIZONS, RELEASE_DIR, TARGET_GRAINS
from .train import fill_features


def as_json_float(value: object) -> float | None:
    if pd.isna(value):
        return None
    return float(round(float(value), 4))


def interpolate_series(last_date, current_price: float, horizon_points: dict[int, float]) -> list[dict]:
    points = {0: current_price, **horizon_points}
    xs = np.array(sorted(points.keys()), dtype=float)
    ys = np.array([points[int(x)] for x in xs], dtype=float)
    max_horizon = int(xs.max()) if len(xs) else 0
    series = []
    for day in range(1, max_horizon + 1):
        price = float(np.interp(day, xs, ys))
        series.append({
            "date": (last_date + timedelta(days=day)).isoformat(),
            "price": round(price, 2),
            "is_anchor": day in horizon_points,
            "anchor_horizon": day if day in horizon_points else None,
        })
    return series


def predict_method_price(trained: dict, method: str, row: pd.Series, current_price: float) -> tuple[float, float | None]:
    if not trained or method == "baseline":
        return current_price, None

    feature_frame = row[trained["feature_columns"]].to_frame().T
    if feature_frame.isna().all(axis=None):
        return current_price, None

    models = trained.get("models") or {}
    fill_values = trained.get("feature_fill_values", {})
    features = fill_features(feature_frame, fill_values)
    lower = current_price * 0.55
    upper = current_price * 1.75

    def model_price(model_name: str) -> float | None:
        model = models.get(model_name)
        if model is None:
            return None
        value = current_price * float(np.exp(model.predict(features)[0]))
        return float(np.clip(value, lower, upper))

    if method == "ensemble":
        weights = trained.get("ensemble_weights") or {}
        weighted_values = []
        weighted_weights = []
        for model_name, weight in weights.items():
            value = model_price(model_name)
            if value is None:
                continue
            weighted_values.append(value)
            weighted_weights.append(float(weight))
        if weighted_values and sum(weighted_weights) > 0:
            price = float(np.average(np.array(weighted_values), weights=np.array(weighted_weights)))
            return price, price
        method = next(iter(models), "baseline")

    price = model_price(method)
    if price is None:
        return current_price, None
    return price, price


def generate_predictions(canonical: pd.DataFrame, registry: dict) -> tuple[dict, dict, dict, dict]:
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    features = registry["features"].copy()
    features["date"] = pd.to_datetime(features["date"])

    predictions: dict = {}
    forecast_series: dict = {}
    actuals: dict = {}
    metrics: dict = {}

    latest_rows = features.sort_values("date").groupby(["grain", "state_name"], as_index=False).tail(1)

    for grain in TARGET_GRAINS:
        predictions[grain] = {}
        forecast_series[grain] = {}
        actuals[grain] = {}
        metrics[grain] = {}

        for _, row in latest_rows[latest_rows["grain"].eq(grain)].iterrows():
            state = row["state_name"]
            last_date = row["date"].date()
            current_price = float(row["price"])
            horizon_points: dict[int, float] = {}
            predictions[grain][state] = {
                "current_price": round(current_price, 2),
                "last_actual_date": last_date.isoformat(),
                "forecast_start_date": (last_date + timedelta(days=1)).isoformat(),
                "status": "fresh",
                "horizons": {},
            }
            metrics[grain][state] = {}

            for horizon in HORIZONS:
                trained = registry["models"].get(grain, {}).get(str(horizon))
                gate = trained["gates"].get(state) if trained else None
                selected_method = gate.get("selected_method", "baseline") if gate else "baseline"
                predicted_price, ml_price = predict_method_price(trained, selected_method, row, current_price)
                if ml_price is None and selected_method != "baseline":
                    selected_method = "baseline"

                horizon_points[horizon] = predicted_price
                metric_payload = gate or {"selected_method": selected_method, "sample_count": 0}
                metrics[grain][state][str(horizon)] = metric_payload
                predictions[grain][state]["horizons"][str(horizon)] = {
                    "target_date": (last_date + timedelta(days=horizon)).isoformat(),
                    "predicted_price": round(float(predicted_price), 2),
                    "selected_method": selected_method,
                    "metrics": {
                        "mape": as_json_float(metric_payload.get("ml_mape")),
                        "mae": as_json_float(metric_payload.get("ml_mae")),
                        "baseline_mape": as_json_float(metric_payload.get("baseline_mape")),
                        "baseline_mae": as_json_float(metric_payload.get("baseline_mae")),
                        "sample_count": int(metric_payload.get("sample_count", 0)),
                        "method_mapes": metric_payload.get("method_mapes", {}),
                        "method_maes": metric_payload.get("method_maes", {}),
                    },
                    "model_price": round(float(ml_price), 2) if ml_price is not None else None,
                }

            forecast_series[grain][state] = interpolate_series(last_date, current_price, horizon_points)

        grain_actuals = canonical[canonical["grain"].eq(grain)].copy()
        grain_actuals["date"] = pd.to_datetime(grain_actuals["date"])
        cutoff = grain_actuals["date"].max() - pd.Timedelta(days=FORECAST_HISTORY_DAYS)
        grain_actuals = grain_actuals[grain_actuals["date"].ge(cutoff)]
        for state, state_df in grain_actuals.groupby("state_name"):
            state_df = state_df.sort_values("date")
            actuals[grain][state] = {
                "context": [
                    {
                        "date": date.date().isoformat(),
                        "price": round(float(price), 2),
                        "is_observed": bool(is_observed),
                    }
                    for date, price, is_observed in zip(state_df["date"], state_df["price"], state_df["is_observed"])
                ]
            }

    (RELEASE_DIR / "predictions.json").write_text(json.dumps(predictions, indent=2, allow_nan=False), encoding="utf-8")
    (RELEASE_DIR / "forecast_series.json").write_text(json.dumps(forecast_series, indent=2, allow_nan=False), encoding="utf-8")
    (RELEASE_DIR / "actuals.json").write_text(json.dumps(actuals, indent=2, allow_nan=False), encoding="utf-8")
    (RELEASE_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2, allow_nan=False), encoding="utf-8")
    return predictions, forecast_series, actuals, metrics
