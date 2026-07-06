"""
feature_engineering.py - Rich feature set for grain price forecasting
All features are strictly causal (no future data leakage).
"""
from __future__ import annotations
import os, sys
from typing import Optional, Dict, List, Tuple
import numpy as np
import pandas as pd
from scipy import stats

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import (
    TARGET_GRAINS, FORECAST_HORIZONS, SEED,
    LAG_DAYS, ROLL_WINDOWS, EWMA_SPANS, LOG_RETURN_LAGS,
    TREND_WINDOWS, FOURIER_K,
    ARRIVAL_LAGS, ARRIVAL_ROLLS,
)


# ── helper: log returns ────────────────────────────────────────────────────
def _log_ret(s: pd.Series) -> pd.Series:
    return np.log(s / s.shift(1).replace(0, np.nan))


def _trend_slope(s: pd.Series, window: int) -> pd.Series:
    """Rolling OLS slope over `window` days - causal."""
    xs = np.arange(window)
    def slope(arr):
        if np.isnan(arr).sum() > window // 2:
            return np.nan
        y = arr[~np.isnan(arr)]
        if len(y) < 3:
            return np.nan
        # Use valid indices
        x = np.arange(len(arr))[~np.isnan(arr)][-len(y):]
        return stats.linregress(x, y).slope
    return s.rolling(window, min_periods=3).apply(slope, raw=True)


# ── core feature builder ────────────────────────────────────────────────────
def build_features(
    price_df: pd.DataFrame,
    arrival_df: Optional[pd.DataFrame] = None,
    grain: str = "Wheat",
    other_grains: Optional[Dict[str, pd.DataFrame]] = None,
) -> pd.DataFrame:
    """
    Build the full feature matrix for a grain's national daily price series.
    price_df: DataFrame(date, price, price_low, price_high, market_count)
    arrival_df: DataFrame(date, arrival_value) - wheat supply proxy
    other_grains: dict grain->df for cross-commodity features
    """
    df = price_df[["date", "price", "price_low", "price_high", "market_count"]].copy()
    df = df.sort_values("date").reset_index(drop=True)
    df["date"] = pd.to_datetime(df["date"])

    grain_cfg = TARGET_GRAINS.get(grain, {})

    # ── 1. Time features ────────────────────────────────────────────────────
    df["year"]       = df["date"].dt.year
    df["month"]      = df["date"].dt.month
    df["quarter"]    = df["date"].dt.quarter
    df["day_of_year"]= df["date"].dt.dayofyear
    df["day_of_week"]= df["date"].dt.dayofweek
    df["week_of_year"]= df["date"].dt.isocalendar().week.astype(int)

    # Fourier terms for multiple cycles
    for period in [7, 30, 90, 365]:
        for k in range(1, FOURIER_K + 1):
            arg = 2 * np.pi * k * df["day_of_year"] / period
            df[f"sin_{period}d_k{k}"] = np.sin(arg)
            df[f"cos_{period}d_k{k}"] = np.cos(arg)

    # ── 2. Harvest/sowing season flags ──────────────────────────────────────
    harvest_months = grain_cfg.get("harvest_months", [3, 4, 9, 10])
    sowing_months  = grain_cfg.get("sowing_months",  [6, 7, 10, 11])
    df["is_harvest_season"] = df["month"].isin(harvest_months).astype(int)
    df["is_sowing_season"]  = df["month"].isin(sowing_months).astype(int)
    # Months relative to harvest (distance)
    min_harvest_month = min(harvest_months)
    df["months_to_harvest"] = df["month"].apply(
        lambda m: min([(m - h) % 12 for h in harvest_months])
    )

    # ── 3. MSP features ─────────────────────────────────────────────────────
    msp_table = grain_cfg.get("msp", {})
    if msp_table:
        df["msp"] = df["year"].map(msp_table)
        df["msp_gap_ratio"]  = df["price"] / df["msp"].replace(0, np.nan)
        df["price_above_msp"]= (df["price"] > df["msp"]).astype(int)
        df["msp_pct_diff"]   = (df["price"] - df["msp"]) / df["msp"].replace(0, np.nan) * 100
    else:
        df["msp"] = np.nan
        df["msp_gap_ratio"] = np.nan
        df["price_above_msp"] = 0
        df["msp_pct_diff"] = np.nan

    # ── 4. Lag features ──────────────────────────────────────────────────────
    log_price = np.log1p(df["price"])
    for lag in LAG_DAYS:
        df[f"price_lag_{lag}"]     = df["price"].shift(lag)
        df[f"log_price_lag_{lag}"] = log_price.shift(lag)

    # Log-return lags
    log_ret = _log_ret(df["price"])
    for lag in LOG_RETURN_LAGS:
        df[f"log_ret_lag_{lag}"] = log_ret.shift(lag)

    # ── 5. Rolling statistics ────────────────────────────────────────────────
    for w in ROLL_WINDOWS:
        df[f"roll_mean_{w}"]   = df["price"].shift(1).rolling(w, min_periods=max(1, w//3)).mean()
        df[f"roll_std_{w}"]    = df["price"].shift(1).rolling(w, min_periods=max(3, w//3)).std()
        df[f"roll_min_{w}"]    = df["price"].shift(1).rolling(w, min_periods=max(1, w//3)).min()
        df[f"roll_max_{w}"]    = df["price"].shift(1).rolling(w, min_periods=max(1, w//3)).max()
        df[f"roll_range_{w}"]  = df[f"roll_max_{w}"] - df[f"roll_min_{w}"]
        df[f"roll_cv_{w}"]     = df[f"roll_std_{w}"] / df[f"roll_mean_{w}"].replace(0, np.nan)
        # Price position within range (like RSI)
        denom = df[f"roll_range_{w}"].replace(0, np.nan)
        df[f"price_pct_range_{w}"] = (df["price"].shift(1) - df[f"roll_min_{w}"]) / denom

        # Volatility of log returns
        df[f"vol_log_ret_{w}"] = log_ret.shift(1).rolling(w, min_periods=max(3, w//3)).std()

    # ── 6. EWMA features ────────────────────────────────────────────────────
    for span in EWMA_SPANS:
        ewma = df["price"].shift(1).ewm(span=span, adjust=False).mean()
        df[f"ewma_{span}"]        = ewma
        df[f"ewma_ratio_{span}"]  = df["price"].shift(1) / ewma.replace(0, np.nan)

    # ── 7. Trend slope ──────────────────────────────────────────────────────
    for w in TREND_WINDOWS:
        df[f"trend_slope_{w}"] = _trend_slope(df["price"].shift(1), w)

    # Momentum: current vs. N-day EWMA (mean reversion signal)
    df["momentum_7_30"]  = df["ewma_7"]  - df["ewma_30"]  if "ewma_7" in df.columns and "ewma_30" in df.columns else np.nan
    df["momentum_30_90"] = df["ewma_30"] - df["ewma_90"]  if "ewma_30" in df.columns and "ewma_90" in df.columns else np.nan

    # Price spread (high - low) features
    df["price_spread_lag1"]      = (df["price_high"] - df["price_low"]).shift(1)
    df["price_spread_roll7"]     = df["price_spread_lag1"].rolling(7, min_periods=1).mean()

    # ── 8. Arrival / supply features (Wheat-specific, but added for all) ──
    if arrival_df is not None and len(arrival_df) > 0:
        arr = arrival_df[["date", "arrival_value"]].copy()
        arr["date"] = pd.to_datetime(arr["date"])
        arr = arr.sort_values("date").set_index("date")

        # Full daily reindex
        full_idx = pd.date_range(arr.index.min(), arr.index.max(), freq="D")
        arr = arr.reindex(full_idx).rename_axis("date")
        arr["arrival_value"] = arr["arrival_value"].ffill(limit=30)

        df = df.set_index("date")
        df = df.join(arr["arrival_value"].rename("arrival"), how="left")
        df = df.reset_index()

        log_arr = np.log1p(df["arrival"].fillna(0))
        for lag in ARRIVAL_LAGS:
            df[f"arr_lag_{lag}"]     = df["arrival"].shift(lag)
            df[f"log_arr_lag_{lag}"] = log_arr.shift(lag)
        for w in ARRIVAL_ROLLS:
            df[f"arr_roll_mean_{w}"] = df["arrival"].shift(1).rolling(w, min_periods=1).mean()
            df[f"arr_roll_std_{w}"]  = df["arrival"].shift(1).rolling(w, min_periods=max(3, w//3)).std()

        df["arrival_trend_7"]  = _trend_slope(df["arrival"].shift(1), 7)
        df["arrival_trend_30"] = _trend_slope(df["arrival"].shift(1), 30)
        df["arrival_stale"]    = df["arrival"].isna().astype(int)
    else:
        df["arrival"] = np.nan
        for lag in ARRIVAL_LAGS:
            df[f"arr_lag_{lag}"] = np.nan
        df["arrival_stale"] = 1

    # ── 9. Cross-commodity features ─────────────────────────────────────────
    cross_map = {
        "Wheat":   ["Paddy", "Maize"],
        "Paddy":    ["Wheat", "Maize"],
        "Maize":   ["Wheat", "Paddy"],
        "Mustard": ["Wheat", "Paddy"],
    }
    if other_grains:
        for other_grain in cross_map.get(grain, []):
            if other_grain in other_grains and len(other_grains[other_grain]) > 0:
                og = other_grains[other_grain][["date", "price"]].copy()
                og["date"] = pd.to_datetime(og["date"])
                og = og.set_index("date")["price"].rename(f"cross_{other_grain.lower()}")
                df = df.set_index("date")
                df = df.join(og, how="left")
                df = df.reset_index()
                col = f"cross_{other_grain.lower()}"
                df[col] = df[col].ffill(limit=7)
                # Cross lags (causal)
                for lag in [7, 14, 30]:
                    df[f"{col}_lag{lag}"] = df[col].shift(lag)
                # Spread ratio
                df[f"spread_{grain.lower()}_{other_grain.lower()}"] = (
                    df["price"].shift(1) / df[col].shift(1).replace(0, np.nan)
                )

    # ── 10. Regime features ─────────────────────────────────────────────────
    # Recent price vs. 1-year rolling mean (captures secular trends)
    df["price_vs_yr_mean"] = df["price"].shift(1) / df["price"].shift(1).rolling(365, min_periods=90).mean().replace(0, np.nan)

    # Price trend (1yr) indicator
    yr_slope = _trend_slope(df["price"].shift(1), 365)
    df["trend_slope_365"] = yr_slope

    # Market depth
    df["market_count_lag1"] = df["market_count"].shift(1)
    df["market_count_roll7"] = df["market_count"].shift(1).rolling(7, min_periods=1).mean()

    return df


# ── build horizon-specific target + feature matrix ─────────────────────────
def build_horizon_dataset(
    feat_df: pd.DataFrame,
    horizon: int,
) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, List[str]]:
    """
    Add the horizon-specific target (future price) and return (X, y).
    Target = log1p(price at t+horizon) - leakage-free.
    """
    df = feat_df.copy()
    # Target: price h days in the future
    df[f"target_h{horizon}"] = df["price"].shift(-horizon)
    # Target is stationary log-return: log(future / current)
    df[f"log_target_h{horizon}"] = np.log(df[f"target_h{horizon}"] / df["price"].replace(0, np.nan))

    # Drop rows where target is NaN (end of series) or price is NaN
    df = df.dropna(subset=[f"target_h{horizon}", "price"]).copy()

    # Get feature columns (all numeric except date, targets, raw price)
    exclude = {"date", "price", "price_low", "price_high", "price_mean",
               "market_count", "arrival", "grain", "commodity", "state"}
    exclude |= {c for c in df.columns if c.startswith("target_") or c.startswith("log_target_")}
    feat_cols = [c for c in df.columns if c not in exclude and df[c].dtype in [np.float64, np.float32, np.int64, np.int32, int, float]]

    X = df[feat_cols].copy()
    y = df[f"log_target_h{horizon}"].copy()   # predict in log space, exponentiate back

    # Replace inf/-inf
    X = X.replace([np.inf, -np.inf], np.nan)

    return X, y, df[["date", "price", f"target_h{horizon}"]], feat_cols


# ── main entry ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys, os
    from data_pipeline import run_pipeline

    national_daily, arrival_df = run_pipeline()

    print("\n" + "=" * 60)
    print("FEATURE ENGINEERING (test run on Wheat)")
    print("=" * 60)

    df_w = national_daily.get("Wheat", pd.DataFrame())
    if len(df_w) == 0:
        print("No Wheat data.")
        sys.exit(1)

    feat_df = build_features(df_w, arrival_df, grain="Wheat", other_grains={
        g: national_daily[g] for g in ["Paddy", "Maize"] if g in national_daily
    })
    print(f"Feature matrix shape: {feat_df.shape}")
    print(f"Feature columns ({len(feat_df.columns)}): {feat_df.columns.tolist()[:20]}...")

    X, y, meta, feat_cols = build_horizon_dataset(feat_df, horizon=7)
    print(f"\nHorizon-7 dataset: X={X.shape} | y={y.shape}")
    print(f"Train rows with finite target: {y.notna().sum()}")
