"""
train_models.py - Train LightGBM + XGBoost + CatBoost + Ridge ensemble
per grain × horizon, with MAPE-weighted blending and conformal intervals.
"""
from __future__ import annotations
import os, sys, gc, json, joblib, warnings
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score
warnings.filterwarnings("ignore")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import (
    TARGET_GRAINS, FORECAST_HORIZONS, SEED,
    OUTPUT_DIR, VALIDATION_DAYS,
    LGBM_PARAMS, XGB_PARAMS, CAT_PARAMS,
    CONFORMAL_LOWER_Q, CONFORMAL_UPPER_Q,
    OPTUNA_TRIALS, OPTUNA_TIMEOUT,
)

np.random.seed(SEED)


# ── metric helpers ─────────────────────────────────────────────────────────
def mape(actual, pred):
    actual, pred = np.asarray(actual, float), np.asarray(pred, float)
    mask = np.abs(actual) > 1
    return float(np.mean(np.abs((actual[mask] - pred[mask]) / actual[mask])) * 100) if mask.sum() > 0 else np.nan

def mae(actual, pred):
    return float(mean_absolute_error(actual, pred))

def rmse(actual, pred):
    return float(np.sqrt(np.mean((np.asarray(actual, float) - np.asarray(pred, float)) ** 2)))

def r2(actual, pred):
    return float(r2_score(actual, pred)) if len(actual) > 1 else np.nan


# ── model builders ──────────────────────────────────────────────────────────
def _build_lgbm(params=None):
    try:
        from lightgbm import LGBMRegressor
        p = dict(LGBM_PARAMS)
        if params:
            p.update(params)
        return LGBMRegressor(**p)
    except ImportError:
        return None

def _build_xgb(params=None):
    try:
        from xgboost import XGBRegressor
        p = {k: v for k, v in XGB_PARAMS.items() if k != "early_stopping_rounds"}
        if params:
            p.update(params)
        return XGBRegressor(**p)
    except ImportError:
        return None

def _build_cat(params=None):
    try:
        from catboost import CatBoostRegressor
        p = dict(CAT_PARAMS)
        if params:
            p.update(params)
        return CatBoostRegressor(**p)
    except ImportError:
        return None


# ── Optuna tuning ───────────────────────────────────────────────────────────
def tune_lgbm(X_tr, y_tr, X_vl, y_vl, current_prices_vl, actual_vl, n_trials=OPTUNA_TRIALS, timeout=OPTUNA_TIMEOUT):
    """Tune LightGBM with Optuna - returns best params dict."""
    try:
        import optuna
        optuna.logging.set_verbosity(optuna.logging.WARNING)

        def objective(trial):
            from lightgbm import LGBMRegressor
            p = {
                "n_estimators": trial.suggest_int("n_estimators", 500, 5000, step=500),
                "learning_rate": trial.suggest_float("learning_rate", 0.003, 0.05, log=True),
                "num_leaves": trial.suggest_int("num_leaves", 31, 255),
                "min_child_samples": trial.suggest_int("min_child_samples", 20, 150),
                "subsample": trial.suggest_float("subsample", 0.6, 1.0),
                "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
                "reg_alpha": trial.suggest_float("reg_alpha", 0.0, 5.0),
                "reg_lambda": trial.suggest_float("reg_lambda", 0.0, 10.0),
                "objective": "huber",
                "random_state": SEED,
                "n_jobs": -1,
                "verbose": -1,
            }
            mdl = LGBMRegressor(**p)
            mdl.fit(
                X_tr.fillna(0).astype("float32"), y_tr,
                eval_set=[(X_vl.fillna(0).astype("float32"), y_vl)],
                callbacks=[__import__("lightgbm").early_stopping(100, verbose=False),
                           __import__("lightgbm").log_evaluation(-1)],
            )
            pred_vl = current_prices_vl * np.exp(np.clip(mdl.predict(X_vl.fillna(0).astype("float32")), -10, 10))
            return mape(actual_vl, pred_vl)

        study = optuna.create_study(direction="minimize")
        study.optimize(objective, n_trials=n_trials, timeout=timeout, show_progress_bar=False)
        print(f"  [Optuna] Best MAPE: {study.best_value:.3f}% after {len(study.trials)} trials")
        return study.best_params
    except Exception as e:
        print(f"  [Optuna] Skipped: {e}")
        return {}


# ── walk-forward validation ─────────────────────────────────────────────────
def walk_forward_mape(model_fn, X: pd.DataFrame, y: pd.Series, n_splits=5, gap=30) -> float:
    """Walk-forward CV returning average MAPE."""
    tscv = TimeSeriesSplit(n_splits=n_splits, gap=gap)
    mapes = []
    for tr_idx, vl_idx in tscv.split(X):
        if len(tr_idx) < 100 or len(vl_idx) < 10:
            continue
        try:
            Xtr, Xvl = X.iloc[tr_idx].fillna(0).astype("float32"), X.iloc[vl_idx].fillna(0).astype("float32")
            ytr, yvl = y.iloc[tr_idx], y.iloc[vl_idx]
            mdl = model_fn()
            mdl.fit(Xtr, ytr)
            pred = np.expm1(np.clip(mdl.predict(Xvl), -10, 15))
            actual = np.expm1(yvl.values)
            mapes.append(mape(actual, pred))
        except Exception as e:
            print(f"    CV fold error: {e}")
    return float(np.mean(mapes)) if mapes else np.nan


# ── train single-horizon ensemble for one grain ────────────────────────────
def train_grain_horizon(
    grain: str,
    horizon: int,
    X: pd.DataFrame,
    y: pd.Series,
    meta_df: pd.DataFrame,
    feat_cols: List[str],
    do_tune: bool = True,
    incremental: bool = False,
) -> dict:
    """
    Train ensemble (LightGBM + XGBoost + CatBoost + Ridge) on X->y,
    using train/val split and MAPE-weighted blending.
    Returns a bundle dict with models, weights, metrics, feature importances.
    """
    print(f"\n  [{grain} | H={horizon}d] Training on {len(X):,} rows, {len(feat_cols)} features")

    # ── Incremental Data Slicing ─────────────────────────────────────────
    existing_bundle = load_bundle(grain, horizon) if incremental else None
    existing_models = existing_bundle.get("models", {}) if existing_bundle else {}
    if incremental:
        X = X.iloc[-30:]
        y = y.iloc[-30:]
        print(f"    [Incremental] Updating models using newest {len(X)} rows")

    # ── Train / Validation split ─────────────────────────────────────────
    from sklearn.model_selection import train_test_split
    X_tr, X_vl, y_tr, y_vl, tr_mask, vl_mask = train_test_split(
        X.fillna(0).astype("float32"), y, X.index, test_size=0.1, shuffle=False
    )
    print(f"    Train: {len(X_tr):,}  Val: {len(X_vl):,} (Chronological Split)")

    if len(X_tr) < 10 or len(X_vl) < 2:
        print(f"    ⚠ Not enough data - using fallback naive model")
        return _fallback_bundle(grain, horizon, meta_df)

    current_prices_vl = meta_df.loc[X_vl.index, "price"].values
    actual_vl = meta_df.loc[X_vl.index, f"target_h{horizon}"].values

    models    = {}
    preds_vl  = {}
    mapes_vl  = {}
    importances = {}

    # ── Optuna tune LightGBM ────────────────────────────────────────────
    best_lgbm_params = {}
    if do_tune:
        print("    [Optuna] Tuning LightGBM...")
        best_lgbm_params = tune_lgbm(X_tr, y_tr, X_vl, y_vl, current_prices_vl, actual_vl)

    # ── LightGBM ────────────────────────────────────────────────────────
    lgbm_model = _build_lgbm(best_lgbm_params)
    if lgbm_model is not None:
        try:
            import lightgbm as lgb
            fit_kwargs = {
                "eval_set": [(X_vl, y_vl)],
                "callbacks": [
                    lgb.early_stopping(200, verbose=False),
                    lgb.log_evaluation(-1),
                ]
            }
            if incremental and "lightgbm" in existing_models:
                fit_kwargs["init_model"] = existing_models["lightgbm"]
                print("      -> Warm-starting LightGBM")
            lgbm_model.fit(X_tr, y_tr, **fit_kwargs)
            pred = current_prices_vl * np.exp(np.clip(lgbm_model.predict(X_vl), -10, 15))
            m = mape(actual_vl, pred)
            mapes_vl["lightgbm"] = m
            preds_vl["lightgbm"] = pred
            models["lightgbm"]   = lgbm_model
            # Feature importance
            fi = pd.Series(lgbm_model.feature_importances_, index=X_tr.columns)
            importances["lightgbm"] = fi.sort_values(ascending=False).head(20).to_dict()
            print(f"    LightGBM MAPE: {m:.3f}%")
        except Exception as e:
            print(f"    LightGBM error: {e}")

    # ── XGBoost ─────────────────────────────────────────────────────────
    xgb_model = _build_xgb()
    if xgb_model is not None:
        try:
            from xgboost import XGBRegressor
            xgb_model = XGBRegressor(**{k: v for k, v in XGB_PARAMS.items()})
            fit_kwargs = {
                "eval_set": [(X_vl, y_vl)],
                "verbose": False,
            }
            if incremental and "xgboost" in existing_models:
                fit_kwargs["xgb_model"] = existing_models["xgboost"]
                print("      -> Warm-starting XGBoost")
            xgb_model.fit(X_tr, y_tr, **fit_kwargs)
            pred = current_prices_vl * np.exp(np.clip(xgb_model.predict(X_vl), -10, 15))
            m = mape(actual_vl, pred)
            mapes_vl["xgboost"] = m
            preds_vl["xgboost"] = pred
            models["xgboost"]   = xgb_model
            fi = pd.Series(xgb_model.feature_importances_, index=X_tr.columns)
            importances["xgboost"] = fi.sort_values(ascending=False).head(20).to_dict()
            print(f"    XGBoost  MAPE: {m:.3f}%")
        except Exception as e:
            print(f"    XGBoost error: {e}")

    # ── CatBoost ─────────────────────────────────────────────────────────
    cat_model = _build_cat()
    if cat_model is not None:
        try:
            from catboost import CatBoostRegressor, Pool
            tr_pool = Pool(X_tr, label=y_tr)
            vl_pool = Pool(X_vl, label=y_vl)
            fit_kwargs = {
                "eval_set": vl_pool,
                "use_best_model": True,
                "verbose": False,
            }
            if incremental and "catboost" in existing_models:
                fit_kwargs["init_model"] = existing_models["catboost"]
                print("      -> Warm-starting CatBoost")
            cat_model.fit(tr_pool, **fit_kwargs)
            pred = current_prices_vl * np.exp(np.clip(cat_model.predict(X_vl), -10, 15))
            m = mape(actual_vl, pred)
            mapes_vl["catboost"] = m
            preds_vl["catboost"] = pred
            models["catboost"]   = cat_model
            fi = pd.Series(cat_model.get_feature_importance(), index=X_tr.columns)
            importances["catboost"] = fi.sort_values(ascending=False).head(20).to_dict()
            print(f"    CatBoost MAPE: {m:.3f}%")
        except Exception as e:
            print(f"    CatBoost error: {e}")

    # ── Ridge (stacking meta-learner / standalone) ─────────────────────
    try:
        scaler = StandardScaler()
        X_tr_s = scaler.fit_transform(X_tr.fillna(0))
        X_vl_s = scaler.transform(X_vl.fillna(0))
        if incremental and "ridge" in existing_models:
            print("      -> Keeping Ridge frozen")
            ridge, scaler = existing_models["ridge"]
            X_vl_s = scaler.transform(X_vl.fillna(0))
        else:
            ridge = Ridge(alpha=100.0, random_state=SEED)
            ridge.fit(X_tr_s, y_tr)
        pred = current_prices_vl * np.exp(np.clip(ridge.predict(X_vl_s), -10, 15))
        m = mape(actual_vl, pred)
        mapes_vl["ridge"] = m
        preds_vl["ridge"] = pred
        models["ridge"]   = (ridge, scaler)
        fi = pd.Series(np.abs(ridge.coef_), index=X_tr.columns)
        importances["ridge"] = fi.sort_values(ascending=False).head(20).to_dict()
        print(f"    Ridge    MAPE: {m:.3f}%")
    except Exception as e:
        print(f"    Ridge error: {e}")

    if not models:
        return _fallback_bundle(grain, horizon, meta_df)

    # ── MAPE-weighted ensemble ──────────────────────────────────────────
    best_mape = min(mapes_vl.values())
    prune_threshold = best_mape * 1.5   # drop models >1.5× worse
    keep = {k: v for k, v in mapes_vl.items() if v <= prune_threshold}

    if not keep:
        keep = mapes_vl  # keep all if pruning removes everything

    raw_weights = {k: 1.0 / max(v, 0.01) for k, v in keep.items()}
    total_w = sum(raw_weights.values())
    weights = {k: v / total_w for k, v in raw_weights.items()}
    print(f"    Ensemble weights: { {k: f'{v:.3f}' for k, v in weights.items()} }")

    # Ensemble validation prediction
    ens_pred_vl = sum(preds_vl[k] * w for k, w in weights.items())
    ens_mape_vl = mape(actual_vl, ens_pred_vl)
    ens_mae_vl  = mae(actual_vl, ens_pred_vl)
    ens_r2_vl   = r2(actual_vl, ens_pred_vl)
    print(f"    Ensemble MAPE: {ens_mape_vl:.3f}% | MAE: {ens_mae_vl:.2f} | R²: {ens_r2_vl:.4f}")

    # ── Conformal prediction intervals ─────────────────────────────────
    residuals = actual_vl - ens_pred_vl
    conformal_lower_delta = np.quantile(residuals, CONFORMAL_LOWER_Q)
    conformal_upper_delta = np.quantile(residuals, CONFORMAL_UPPER_Q)
    print(f"    Conformal intervals: [{conformal_lower_delta:+.1f}, {conformal_upper_delta:+.1f}]")

    # ── Aggregate feature importances ───────────────────────────────────
    agg_importance: dict[str, float] = {}
    for model_name, fi in importances.items():
        w = weights.get(model_name, 0.0)
        for feat, score in fi.items():
            agg_importance[feat] = agg_importance.get(feat, 0.0) + score * w

    top_features = sorted(agg_importance.items(), key=lambda x: x[1], reverse=True)[:20]

    # ── Baseline metric (lag-1 persistence) ────────────────────────────
    if "price_lag_1" in X_vl.columns:
        baseline_pred = X_vl["price_lag_1"].ffill().fillna(actual_vl[0])
    else:
        baseline_pred = np.full(len(actual_vl), actual_vl[0])
    baseline_mape_vl = mape(actual_vl, baseline_pred.values if hasattr(baseline_pred, "values") else baseline_pred)

    bundle = {
        "grain":    grain,
        "horizon":  horizon,
        "models":   {k: v for k, v in models.items() if k in keep},
        "weights":  weights,
        "feat_cols": feat_cols,
        "metrics": {
            "ensemble_mape": ens_mape_vl,
            "ensemble_mae":  ens_mae_vl,
            "ensemble_r2":   ens_r2_vl,
            "baseline_mape": baseline_mape_vl,
            "individual_mapes": mapes_vl,
        },
        "conformal": {
            "lower_delta": float(conformal_lower_delta),
            "upper_delta": float(conformal_upper_delta),
        },
        "top_features":  top_features,
        "importances_raw": importances,
        "val_actual":   actual_vl.tolist(),
        "val_pred":     ens_pred_vl.tolist(),
        "val_dates":    meta_df.loc[vl_mask, "date"].dt.strftime("%Y-%m-%d").tolist(),
    }
    return bundle


def _fallback_bundle(grain, horizon, meta_df):
    """Naive fallback when training data is insufficient."""
    return {
        "grain": grain, "horizon": horizon, "models": {},
        "weights": {}, "feat_cols": [], "metrics": {},
        "conformal": {"lower_delta": -100.0, "upper_delta": 100.0},
        "top_features": [], "importances_raw": {},
        "val_actual": [], "val_pred": [], "val_dates": [],
        "is_fallback": True,
    }


# ── save / load bundle ──────────────────────────────────────────────────────
def save_bundle(bundle: dict, grain: str, horizon: int):
    path = os.path.join(OUTPUT_DIR, f"model_{grain.lower()}_{horizon}d.joblib")
    joblib.dump(bundle, path)
    print(f"    Saved: {path}")
    return path

def load_bundle(grain: str, horizon: int) -> Optional[dict]:
    path = os.path.join(OUTPUT_DIR, f"model_{grain.lower()}_{horizon}d.joblib")
    if not os.path.exists(path):
        return None
    return joblib.load(path)


# ── main training loop ──────────────────────────────────────────────────────
def train_all(national_daily: dict, arrival_df: pd.DataFrame, do_tune: bool = True, target_grains=None, incremental: bool = False):
    from feature_engineering import build_features, build_horizon_dataset

    print("\n" + "=" * 60)
    print("MODEL TRAINING")
    print("=" * 60)

    all_bundles = {}

    grains_to_train = target_grains if target_grains is not None else TARGET_GRAINS
    for grain in grains_to_train.keys():
        price_df = national_daily.get(grain, pd.DataFrame())
        if len(price_df) < 200:
            print(f"\n⚠ {grain}: insufficient data ({len(price_df)} rows) - skipping")
            continue

        print(f"\n{'='*40}")
        print(f"GRAIN: {grain} ({len(price_df):,} days)")

        # Build features
        other = {g: national_daily[g] for g in TARGET_GRAINS if g != grain and g in national_daily}
        feat_df = build_features(price_df, arrival_df, grain=grain, other_grains=other)
        print(f"  Features: {feat_df.shape[1]} columns")

        grain_bundles = {}
        for horizon in FORECAST_HORIZONS:
            X, y, meta_df, feat_cols = build_horizon_dataset(feat_df, horizon)
            if len(X) < 100:
                print(f"  ⚠ H={horizon}: only {len(X)} rows - skip")
                continue

            bundle = train_grain_horizon(grain, horizon, X, y, meta_df, feat_cols, do_tune=do_tune, incremental=incremental)
            grain_bundles[horizon] = bundle
            save_bundle(bundle, grain, horizon)
            gc.collect()

        all_bundles[grain] = grain_bundles

    # Save metrics summary
    summary = []
    for grain, horizons in all_bundles.items():
        for h, b in horizons.items():
            m = b.get("metrics", {})
            summary.append({
                "grain": grain,
                "horizon": h,
                "ensemble_mape": m.get("ensemble_mape"),
                "ensemble_mae": m.get("ensemble_mae"),
                "ensemble_r2": m.get("ensemble_r2"),
                "baseline_mape": m.get("baseline_mape"),
            })
    pd.DataFrame(summary).to_csv(os.path.join(OUTPUT_DIR, "model_metrics_summary.csv"), index=False)
    print("\n[OK] Training complete.")
    return all_bundles


if __name__ == "__main__":
    from data_pipeline import run_pipeline
    national_daily, arrival_df = run_pipeline()
    train_all(national_daily, arrival_df, do_tune=True)
