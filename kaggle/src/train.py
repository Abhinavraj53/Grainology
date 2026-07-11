from __future__ import annotations

import math
import pickle
from pathlib import Path

import numpy as np
import pandas as pd

from .config import (
    ENABLE_OPTUNA_TUNING,
    ENSEMBLE_PRUNE_RATIO,
    HORIZONS,
    MAX_TRAIN_ROWS_PER_MODEL,
    MIN_MAPE_IMPROVEMENT,
    MIN_STATE_OBSERVED_DAYS,
    MIN_VALIDATION_SAMPLES,
    MODEL_DIR,
    OPTUNA_TIMEOUT_SECONDS,
    OPTUNA_TRIALS,
    TARGET_GRAINS,
)

try:
    from catboost import CatBoostRegressor
except Exception:
    CatBoostRegressor = None

try:
    from lightgbm import LGBMRegressor
except Exception:
    LGBMRegressor = None

try:
    from xgboost import XGBRegressor
except Exception:
    XGBRegressor = None

from sklearn.ensemble import ExtraTreesRegressor, HistGradientBoostingRegressor, RandomForestRegressor

FEATURE_COLUMNS = [
    "price_lag_1",
    "price_lag_2",
    "price_lag_3",
    "price_lag_7",
    "price_lag_14",
    "price_lag_30",
    "price_lag_60",
    "price_lag_90",
    "price_lag_180",
    "price_lag_365",
    "rolling_mean_7",
    "rolling_mean_14",
    "rolling_mean_30",
    "rolling_mean_60",
    "rolling_mean_90",
    "rolling_mean_180",
    "rolling_median_7",
    "rolling_median_30",
    "rolling_median_90",
    "rolling_min_30",
    "rolling_max_30",
    "rolling_min_90",
    "rolling_max_90",
    "rolling_std_7",
    "rolling_std_14",
    "rolling_std_30",
    "rolling_std_90",
    "ewm_mean_7",
    "ewm_mean_30",
    "ewm_mean_90",
    "return_1",
    "return_3",
    "return_7",
    "return_14",
    "return_30",
    "return_90",
    "momentum_7_30",
    "momentum_30_90",
    "price_vs_mean_30",
    "price_vs_mean_90",
    "price_range_pct",
    "arrival",
    "arrival_lag_1",
    "arrival_lag_7",
    "arrival_rolling_mean_7",
    "arrival_rolling_mean_30",
    "market_count",
    "market_count_lag_7",
    "market_count_rolling_mean_30",
    "month",
    "quarter",
    "day_of_week",
    "day_of_year",
    "year_index",
    "season_sin",
    "season_cos",
    "month_sin",
    "month_cos",
    "is_monsoon",
    "is_harvest_rabi",
    "is_harvest_kharif",
    "national_price",
    "national_lag_1",
    "national_lag_7",
    "national_lag_30",
    "national_lag_90",
    "national_return_7",
    "national_return_30",
    "state_national_spread",
    "state_national_ratio",
    "state_code",
]


def mape(actual: pd.Series | np.ndarray, predicted: pd.Series | np.ndarray) -> float:
    actual = pd.to_numeric(pd.Series(actual), errors="coerce")
    predicted = pd.to_numeric(pd.Series(predicted), errors="coerce")
    mask = actual.abs() > 1e-9
    if not mask.any():
        return math.inf
    return float(((predicted[mask] - actual[mask]).abs() / actual[mask].abs()).mean() * 100)


def mae(actual: pd.Series | np.ndarray, predicted: pd.Series | np.ndarray) -> float:
    actual = pd.to_numeric(pd.Series(actual), errors="coerce")
    predicted = pd.to_numeric(pd.Series(predicted), errors="coerce")
    return float((predicted - actual).abs().mean())


def fill_features(frame: pd.DataFrame, fill_values: dict[str, float]) -> pd.DataFrame:
    out = frame.reindex(columns=FEATURE_COLUMNS).copy()
    return out.fillna(fill_values).replace([np.inf, -np.inf], 0)


def feature_engineering(canonical: pd.DataFrame) -> pd.DataFrame:
    df = canonical.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    df["price_low"] = pd.to_numeric(df.get("price_low"), errors="coerce")
    df["price_high"] = pd.to_numeric(df.get("price_high"), errors="coerce")
    df["arrival"] = pd.to_numeric(df.get("arrival"), errors="coerce").fillna(0)
    df["market_count"] = pd.to_numeric(df["market_count"], errors="coerce").fillna(0)
    df = df.dropna(subset=["date", "state_name", "grain", "price"]).sort_values(["grain", "state_name", "date"])

    national = df[df["state_name"].eq("All States")][["date", "grain", "price"]].rename(columns={"price": "national_price"})
    df = df.merge(national, on=["date", "grain"], how="left")
    df["national_price"] = df.groupby("grain")["national_price"].ffill().bfill()

    group = df.groupby(["grain", "state_name"], sort=False)
    for lag in [1, 2, 3, 7, 14, 30, 60, 90, 180, 365]:
        df[f"price_lag_{lag}"] = group["price"].shift(lag)

    for window in [7, 14, 30, 60, 90, 180]:
        shifted = group["price"].shift(1)
        df[f"rolling_mean_{window}"] = shifted.groupby([df["grain"], df["state_name"]]).transform(lambda s: s.rolling(window, min_periods=3).mean())
        if window in {7, 30, 90}:
            df[f"rolling_median_{window}"] = shifted.groupby([df["grain"], df["state_name"]]).transform(lambda s: s.rolling(window, min_periods=3).median())
        if window in {30, 90}:
            df[f"rolling_min_{window}"] = shifted.groupby([df["grain"], df["state_name"]]).transform(lambda s: s.rolling(window, min_periods=3).min())
            df[f"rolling_max_{window}"] = shifted.groupby([df["grain"], df["state_name"]]).transform(lambda s: s.rolling(window, min_periods=3).max())
        if window in {7, 14, 30, 90}:
            df[f"rolling_std_{window}"] = shifted.groupby([df["grain"], df["state_name"]]).transform(lambda s: s.rolling(window, min_periods=3).std())

    for span in [7, 30, 90]:
        df[f"ewm_mean_{span}"] = group["price"].transform(lambda s: s.shift(1).ewm(span=span, adjust=False, min_periods=3).mean())

    for period in [1, 3, 7, 14, 30, 90]:
        df[f"return_{period}"] = group["price"].pct_change(periods=period).clip(-0.5, 0.5)

    df["momentum_7_30"] = df["rolling_mean_7"] - df["rolling_mean_30"]
    df["momentum_30_90"] = df["rolling_mean_30"] - df["rolling_mean_90"]
    df["price_vs_mean_30"] = df["price"] / df["rolling_mean_30"].replace(0, np.nan)
    df["price_vs_mean_90"] = df["price"] / df["rolling_mean_90"].replace(0, np.nan)
    df["price_range_pct"] = (df["price_high"] - df["price_low"]) / df["price"].replace(0, np.nan)

    df["arrival_lag_1"] = group["arrival"].shift(1)
    df["arrival_lag_7"] = group["arrival"].shift(7)
    df["arrival_rolling_mean_7"] = group["arrival"].transform(lambda s: s.shift(1).rolling(7, min_periods=2).mean())
    df["arrival_rolling_mean_30"] = group["arrival"].transform(lambda s: s.shift(1).rolling(30, min_periods=3).mean())
    df["market_count_lag_7"] = group["market_count"].shift(7)
    df["market_count_rolling_mean_30"] = group["market_count"].transform(lambda s: s.shift(1).rolling(30, min_periods=3).mean())

    df["month"] = df["date"].dt.month
    df["quarter"] = df["date"].dt.quarter
    df["day_of_week"] = df["date"].dt.dayofweek
    df["day_of_year"] = df["date"].dt.dayofyear
    df["year_index"] = df["date"].dt.year - df["date"].dt.year.min()
    df["season_sin"] = np.sin(2 * np.pi * df["day_of_year"] / 365.25)
    df["season_cos"] = np.cos(2 * np.pi * df["day_of_year"] / 365.25)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    df["is_monsoon"] = df["month"].isin([6, 7, 8, 9]).astype(int)
    df["is_harvest_rabi"] = df["month"].isin([3, 4, 5]).astype(int)
    df["is_harvest_kharif"] = df["month"].isin([9, 10, 11]).astype(int)

    grain_group = df.groupby("grain", sort=False)
    for lag in [1, 7, 30, 90]:
        df[f"national_lag_{lag}"] = grain_group["national_price"].shift(lag)
    df["national_return_7"] = grain_group["national_price"].pct_change(periods=7).clip(-0.5, 0.5)
    df["national_return_30"] = grain_group["national_price"].pct_change(periods=30).clip(-0.5, 0.5)
    df["state_national_spread"] = df["price"] - df["national_price"]
    df["state_national_ratio"] = df["price"] / df["national_price"].replace(0, np.nan)
    df["state_code"] = df["state_name"].astype("category").cat.codes

    return df.replace([np.inf, -np.inf], np.nan)


def make_candidate_models(horizon: int, train_rows: int) -> dict[str, object]:
    models: dict[str, object] = {}

    if CatBoostRegressor is not None:
        models["catboost"] = CatBoostRegressor(
            iterations=900 if train_rows > 2000 else 500,
            depth=7,
            learning_rate=0.035,
            loss_function="RMSE",
            random_seed=42 + horizon,
            verbose=False,
            allow_writing_files=False,
            l2_leaf_reg=5,
        )

    if LGBMRegressor is not None:
        models["lightgbm"] = LGBMRegressor(
            n_estimators=900,
            learning_rate=0.035,
            num_leaves=64,
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=42 + horizon,
            objective="regression",
            n_jobs=-1,
        )

    if XGBRegressor is not None:
        models["xgboost"] = XGBRegressor(
            n_estimators=700,
            max_depth=6,
            learning_rate=0.035,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="reg:squarederror",
            random_state=42 + horizon,
            tree_method="hist",
            n_jobs=-1,
        )

    models["hist_gb"] = HistGradientBoostingRegressor(
        max_iter=500,
        learning_rate=0.035,
        l2_regularization=0.05,
        max_leaf_nodes=45,
        random_state=42 + horizon,
    )
    models["extra_trees"] = ExtraTreesRegressor(
        n_estimators=240,
        min_samples_leaf=3,
        max_features=0.85,
        random_state=42 + horizon,
        n_jobs=-1,
    )
    models["random_forest"] = RandomForestRegressor(
        n_estimators=180,
        min_samples_leaf=4,
        max_features=0.75,
        random_state=42 + horizon,
        n_jobs=-1,
    )
    return models


def tune_hist_gb(train: pd.DataFrame, valid: pd.DataFrame, feature_fill_values: dict[str, float], horizon: int) -> HistGradientBoostingRegressor | None:
    if not ENABLE_OPTUNA_TUNING or len(train) < 1000:
        return None
    try:
        import optuna
    except Exception:
        return None

    X_train = fill_features(train[FEATURE_COLUMNS], feature_fill_values)
    y_train = train["target_log_return"]
    X_valid = fill_features(valid[FEATURE_COLUMNS], feature_fill_values)
    valid_actual = valid["target_price"].to_numpy()
    valid_price = valid["price"].to_numpy()

    def objective(trial):
        model = HistGradientBoostingRegressor(
            max_iter=trial.suggest_int("max_iter", 250, 900),
            learning_rate=trial.suggest_float("learning_rate", 0.015, 0.08, log=True),
            max_leaf_nodes=trial.suggest_int("max_leaf_nodes", 20, 80),
            l2_regularization=trial.suggest_float("l2_regularization", 1e-4, 0.5, log=True),
            random_state=42 + horizon,
        )
        model.fit(X_train, y_train)
        pred = valid_price * np.exp(model.predict(X_valid))
        return mape(valid_actual, pred)

    study = optuna.create_study(direction="minimize", sampler=optuna.samplers.TPESampler(seed=42 + horizon))
    study.optimize(objective, n_trials=OPTUNA_TRIALS, timeout=OPTUNA_TIMEOUT_SECONDS, show_progress_bar=False)
    params = study.best_params
    return HistGradientBoostingRegressor(**params, random_state=42 + horizon)


def train_candidate_models(train: pd.DataFrame, valid: pd.DataFrame, horizon: int, fill_values: dict[str, float]) -> dict[str, object]:
    fit_train = train
    if MAX_TRAIN_ROWS_PER_MODEL > 0 and len(fit_train) > MAX_TRAIN_ROWS_PER_MODEL:
        fit_train = fit_train.sample(MAX_TRAIN_ROWS_PER_MODEL, random_state=42 + horizon).sort_values("date")

    models = make_candidate_models(horizon, len(fit_train))
    tuned = tune_hist_gb(fit_train, valid, fill_values, horizon)
    if tuned is not None:
        models["optuna_hist_gb"] = tuned

    X_train = fill_features(fit_train[FEATURE_COLUMNS], fill_values)
    y_train = fit_train["target_log_return"]
    fitted = {}
    for name, model in models.items():
        try:
            model.fit(X_train, y_train)
            fitted[name] = model
        except Exception as error:
            print(f"Model skipped ({name}, {horizon}d): {type(error).__name__}: {str(error)[:120]}")
    if not fitted:
        raise RuntimeError("No candidate model could be trained")
    return fitted


def predict_candidate_prices(models: dict[str, object], frame: pd.DataFrame, fill_values: dict[str, float]) -> dict[str, np.ndarray]:
    X = fill_features(frame[FEATURE_COLUMNS], fill_values)
    prices = frame["price"].to_numpy(dtype=float)
    predictions = {"baseline": prices.copy()}
    lower = prices * 0.55
    upper = prices * 1.75
    for name, model in models.items():
        try:
            pred = prices * np.exp(model.predict(X))
            predictions[name] = np.clip(pred, lower, upper)
        except Exception as error:
            print(f"Prediction skipped ({name}): {type(error).__name__}: {str(error)[:120]}")
    return predictions


def weighted_ensemble(predictions: dict[str, np.ndarray], actual: np.ndarray) -> tuple[np.ndarray, dict[str, float]]:
    model_names = [name for name in predictions if name != "baseline"]
    if not model_names:
        return predictions["baseline"], {"baseline": 1.0}

    scores = {name: mape(actual, predictions[name]) for name in model_names}
    best_score = min(scores.values()) if scores else math.inf
    keep = [name for name in model_names if np.isfinite(scores[name]) and scores[name] <= best_score * ENSEMBLE_PRUNE_RATIO]
    if not keep:
        keep = [min(scores, key=scores.get)]

    weights_raw = np.array([1.0 / max(scores[name], 0.05) for name in keep], dtype=float)
    weights_raw = weights_raw / weights_raw.sum()
    matrix = np.vstack([predictions[name] for name in keep])
    ensemble = np.average(matrix, axis=0, weights=weights_raw)
    weights = {name: round(float(weight), 6) for name, weight in zip(keep, weights_raw)}
    return ensemble, weights


def row_payload(row: pd.Series, predicted: float, method: str) -> dict:
    return {
        "origin_date": row["date"].date().isoformat(),
        "target_date": row["target_date"].date().isoformat(),
        "state_name": row["state_name"],
        "grain": row["grain"],
        "horizon": int(row["horizon"]),
        "actual_price": float(row["target_price"]),
        "predicted_price": float(predicted),
        "method": method,
    }


def train_one(features: pd.DataFrame, grain: str, horizon: int) -> dict | None:
    data = features[features["grain"].eq(grain)].copy()
    counts = data.groupby("state_name")["date"].count()
    valid_states = counts[counts >= MIN_STATE_OBSERVED_DAYS].index
    data = data[data["state_name"].isin(valid_states)].copy()
    if data.empty:
        return None

    data["horizon"] = horizon
    data["target_date"] = data["date"] + pd.to_timedelta(horizon, unit="D")
    target = data[["state_name", "date", "price"]].rename(columns={"date": "target_date", "price": "target_price"})
    data = data.merge(target, on=["state_name", "target_date"], how="inner")
    data["target_log_return"] = np.log(data["target_price"] / data["price"])
    data = data.dropna(subset=["target_price", "target_log_return"]).sort_values("date")
    if len(data) < MIN_VALIDATION_SAMPLES * 4:
        return None

    feature_fill_values = (
        data[FEATURE_COLUMNS]
        .replace([np.inf, -np.inf], np.nan)
        .median(numeric_only=True)
        .fillna(0)
        .to_dict()
    )

    history_rows = [row_payload(row, float(row["price"]), "baseline_history") for _, row in data.iterrows()]

    cutoff = data["date"].quantile(0.8)
    train = data[data["date"] < cutoff].copy()
    valid = data[data["date"] >= cutoff].copy()
    if len(valid) < MIN_VALIDATION_SAMPLES:
        return None

    models = train_candidate_models(train, valid, horizon, feature_fill_values)
    valid_predictions = predict_candidate_prices(models, valid, feature_fill_values)
    ensemble_pred, ensemble_weights = weighted_ensemble(valid_predictions, valid["target_price"].to_numpy(dtype=float))
    valid_predictions["ensemble"] = ensemble_pred

    gates = {}
    validation_rows = []
    for state, state_valid in valid.groupby("state_name"):
        idx = state_valid.index
        if len(state_valid) < MIN_VALIDATION_SAMPLES:
            gates[state] = {"selected_method": "baseline", "reason": "insufficient_validation", "sample_count": int(len(state_valid))}
            continue

        actual = state_valid["target_price"].to_numpy(dtype=float)
        method_scores = {}
        method_mae = {}
        for method, pred_all in valid_predictions.items():
            pred = pd.Series(pred_all, index=valid.index).loc[idx].to_numpy(dtype=float)
            method_scores[method] = mape(actual, pred)
            method_mae[method] = mae(actual, pred)

        baseline_mape = method_scores.get("baseline", math.inf)
        baseline_mae = method_mae.get("baseline", math.inf)
        candidate_methods = [method for method in method_scores if method != "baseline" and np.isfinite(method_scores[method])]
        best_method = min(candidate_methods, key=lambda method: method_scores[method]) if candidate_methods else "baseline"
        selected = best_method if method_scores.get(best_method, math.inf) + MIN_MAPE_IMPROVEMENT < baseline_mape else "baseline"

        gates[state] = {
            "selected_method": selected,
            "sample_count": int(len(state_valid)),
            "baseline_mape": round(float(baseline_mape), 4) if np.isfinite(baseline_mape) else None,
            "baseline_mae": round(float(baseline_mae), 4) if np.isfinite(baseline_mae) else None,
            "ml_mape": round(float(method_scores.get(selected, baseline_mape)), 4) if np.isfinite(method_scores.get(selected, baseline_mape)) else None,
            "ml_mae": round(float(method_mae.get(selected, math.nan)), 4) if np.isfinite(method_mae.get(selected, math.nan)) else None,
            "method_mapes": {name: round(float(score), 4) for name, score in method_scores.items() if np.isfinite(score)},
            "method_maes": {name: round(float(score), 4) for name, score in method_mae.items() if np.isfinite(score)},
            "ensemble_weights": ensemble_weights,
        }

        selected_pred_all = pd.Series(valid_predictions[selected], index=valid.index)
        for row_idx, row in state_valid.iterrows():
            validation_rows.append(row_payload(row, float(selected_pred_all.loc[row_idx]), selected))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODEL_DIR / f"ensemble_{grain.lower()}_{horizon}d.pkl"
    with model_path.open("wb") as handle:
        pickle.dump({"models": models, "feature_fill_values": feature_fill_values, "ensemble_weights": ensemble_weights}, handle)

    return {
        "grain": grain,
        "horizon": horizon,
        "models": models,
        "model_path": str(model_path.name),
        "feature_columns": FEATURE_COLUMNS,
        "feature_fill_values": feature_fill_values,
        "ensemble_weights": ensemble_weights,
        "gates": gates,
        "history_rows": history_rows,
        "validation_rows": validation_rows,
        "latest_training_date": data["date"].max().date().isoformat(),
    }


def train_models(canonical: pd.DataFrame) -> dict:
    features = feature_engineering(canonical)
    registry = {"features": features, "models": {}, "history_rows": [], "validation_rows": []}
    for grain in TARGET_GRAINS:
        registry["models"][grain] = {}
        for horizon in HORIZONS:
            trained = train_one(features, grain, horizon)
            if trained:
                registry["models"][grain][str(horizon)] = trained
                registry["history_rows"].extend(trained["history_rows"])
                registry["validation_rows"].extend(trained["validation_rows"])
                print(f"Trained ensemble {grain} {horizon}d ({len(trained['models'])} models)")
            else:
                print(f"Using baseline only for {grain} {horizon}d")
    return registry
