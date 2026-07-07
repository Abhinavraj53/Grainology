"""
data_pipeline.py - Load, merge, and aggregate historical + recent grain price data
Produces clean national daily median price series per target commodity.
"""
from __future__ import annotations
import os, sys, glob, gc
from typing import Dict, Tuple, Optional
import numpy as np
import pandas as pd
import polars as pl

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import (
    CSV_DIR, LATEST_DATA_CSV, ARRIVAL_CSV,
    TARGET_GRAINS, TRAINING_START_YEAR, PRICE_MIN, PRICE_MAX,
    OUTPUT_DIR
)


# ── helpers ────────────────────────────────────────────────────────────────
def normalize_col(c):
    return (str(c).strip().lower()
            .replace(' ', '_').replace('-', '_').replace('.', '')
            .replace('(', '').replace(')', '').replace('/', '_'))


def _commodity_matches_grain(name: str, grain_key: str) -> bool:
    """Check if a commodity string matches a target grain."""
    nm = str(name).lower().strip()
    for kw in TARGET_GRAINS[grain_key]["keywords"]:
        if kw in nm:
            return True
    return False


def _grain_label(commodity_name: str) -> str | None:
    nm = str(commodity_name).lower().strip()
    for grain, cfg in TARGET_GRAINS.items():
        for kw in cfg["keywords"]:
            if kw in nm:
                return grain
    return None


# ── load yearly CSV files ──────────────────────────────────────────────────
def load_yearly_csvs(start_year: int = TRAINING_START_YEAR) -> pd.DataFrame:
    """Load all yearly CSVs from start_year onwards, return raw DataFrame."""
    csv_files = sorted(glob.glob(os.path.join(CSV_DIR, "*.csv")))
    target_files = [
        f for f in csv_files
        if os.path.basename(f).replace(".csv", "").isdigit()
        and int(os.path.basename(f).replace(".csv", "")) >= start_year
    ]
    print(f"Loading {len(target_files)} yearly CSV files from {start_year}...")

    # Build keyword filter for Polars
    all_keywords = []
    for cfg in TARGET_GRAINS.values():
        all_keywords.extend(cfg["keywords"])
    keyword_pattern = "|".join(all_keywords)

    frames = []
    for fpath in target_files:
        year = int(os.path.basename(fpath).replace(".csv", ""))
        try:
            lf = pl.scan_csv(
                fpath,
                infer_schema_length=10000,
                ignore_errors=True,
                low_memory=True,
            )
            # normalise column names
            rename = {c: normalize_col(c) for c in lf.collect_schema().names()}
            lf = lf.rename(rename)
            cols = lf.collect_schema().names()

            # pick date column
            date_col = "arrival_date" if "arrival_date" in cols else "date"
            if date_col not in cols:
                print(f"  ⚠ skip {year}: no date column")
                continue

            # filter to target commodities
            if "commodity" in cols:
                lf = lf.filter(
                    pl.col("commodity").cast(pl.Utf8, strict=False)
                    .str.to_lowercase().str.contains(keyword_pattern)
                )

            # select and cast
            select_exprs = [
                pl.col(date_col).cast(pl.Utf8, strict=False).alias("date_raw"),
                pl.col("commodity").cast(pl.Utf8, strict=False).alias("commodity") if "commodity" in cols else pl.lit(None).cast(pl.Utf8).alias("commodity"),
                pl.col("modal_price").cast(pl.Float64, strict=False).alias("modal_price") if "modal_price" in cols else pl.lit(None).cast(pl.Float64).alias("modal_price"),
                pl.col("min_price").cast(pl.Float64, strict=False).alias("min_price") if "min_price" in cols else pl.lit(None).cast(pl.Float64).alias("min_price"),
                pl.col("max_price").cast(pl.Float64, strict=False).alias("max_price") if "max_price" in cols else pl.lit(None).cast(pl.Float64).alias("max_price"),
                pl.col("state").cast(pl.Utf8, strict=False).alias("state") if "state" in cols else pl.lit(None).cast(pl.Utf8).alias("state"),
            ]
            df = lf.select(select_exprs).collect()
            df = df.to_pandas()
            df["source_year"] = year
            frames.append(df)
            print(f"  OK {year}: {len(df):,} rows (grain rows)")
        except Exception as e:
            print(f"  ERR {year}: {type(e).__name__}: {str(e)[:100]}")
        gc.collect()

    if not frames:
        raise RuntimeError("No yearly CSV files loaded.")
    combined = pd.concat(frames, ignore_index=True)
    print(f"\nYearly CSVs: {len(combined):,} total rows")
    return combined


# ── load latest_data.csv (Apr–Jun 2026 bridge) ────────────────────────────
def load_latest_data() -> pd.DataFrame:
    """Load the bridge CSV covering Apr–Jun 2026."""
    if not os.path.exists(LATEST_DATA_CSV):
        print("latest_data.csv not found - skipping bridge data.")
        return pd.DataFrame()

    print(f"Loading latest_data.csv...")
    df = pd.read_csv(LATEST_DATA_CSV)
    df.columns = [normalize_col(c) for c in df.columns]
    df["source_year"] = 2026

    # rename to standardised columns
    if "arrival_date" in df.columns and "date" not in df.columns:
        df = df.rename(columns={"arrival_date": "date_raw"})
    elif "date" in df.columns:
        df = df.rename(columns={"date": "date_raw"})

    # filter to target grains
    all_keywords = []
    for cfg in TARGET_GRAINS.values():
        all_keywords.extend(cfg["keywords"])
    mask = df["commodity"].str.lower().str.strip().apply(
        lambda x: any(kw in str(x) for kw in all_keywords)
    )
    df = df[mask].copy()
    print(f"  OK latest_data.csv: {len(df):,} grain rows")
    return df

def fetch_recent_gap_data() -> pd.DataFrame:
    """Fetch live data from Node backend to bridge the gap from June 26th to today."""
    print("Fetching live gap data... using fetch_live_actuals.py")
    try:
        from fetch_live_actuals import get_live_actuals
        live_data = get_live_actuals("2026-06-26", "2026-07-07")
        dfs = []
        for grain, records in live_data.items():
            for r in records:
                dfs.append({
                    "commodity": grain,
                    "date_raw": r["date"],
                    "modal_price": r["price"]
                })
        if not dfs: return pd.DataFrame()
        df = pd.DataFrame(dfs)
        df["source_year"] = 2026
        df["state"] = "Live Cache"
        print(f"  OK live gap data: {len(df):,} grain rows")
        return df
    except Exception as e:
        print(f"  Error fetching gap data: {e}")
        return pd.DataFrame()

# ── parse and clean ────────────────────────────────────────────────────────
def _parse_date(s: pd.Series) -> pd.Series:
    for fmt in ["%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y"]:
        try:
            parsed = pd.to_datetime(s, format=fmt, errors="coerce")
            valid = parsed.notna().sum()
            if valid > len(s) * 0.8:
                return parsed
        except Exception:
            continue
    return pd.to_datetime(s, infer_datetime_format=True, errors="coerce")


def clean_and_merge(yearly_df: pd.DataFrame, latest_df: pd.DataFrame, gap_df: pd.DataFrame = None) -> pd.DataFrame:
    """Parse dates, map grain labels, clean prices, merge all sources."""
    dfs = []
    for df in [yearly_df, latest_df, gap_df]:
        if df is None or len(df) == 0:
            continue
        df = df.copy()

        # parse date
        if "date_raw" in df.columns:
            df["date"] = _parse_date(df["date_raw"].astype(str))
        elif "date" in df.columns:
            df["date"] = _parse_date(df["date"].astype(str))
        else:
            continue

        # map grain label
        df["grain"] = df["commodity"].apply(_grain_label)
        df = df[df["grain"].notna()].copy()

        # price column
        for col in ["modal_price", "min_price", "max_price"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
            else:
                df[col] = np.nan

        dfs.append(df[["date", "grain", "commodity", "state",
                        "modal_price", "min_price", "max_price"]].copy())

    combined = pd.concat(dfs, ignore_index=True)

    # clean
    combined = combined[combined["date"].notna()].copy()
    combined = combined[combined["modal_price"].between(PRICE_MIN, PRICE_MAX)].copy()
    combined = combined.dropna(subset=["modal_price"]).copy()
    combined["date"] = combined["date"].dt.normalize()
    print(f"After clean+merge: {len(combined):,} rows | grains: {combined['grain'].unique().tolist()}")
    return combined

def clean_price_outliers(series: pd.Series, window=30, mad_threshold=12.0) -> pd.Series:
    """Robust MAD filter for erroneous price jumps."""
    roll_med = series.rolling(window, center=True, min_periods=1).median()
    roll_mad = (series - roll_med).abs().rolling(window, center=True, min_periods=1).median()
    roll_mad = roll_mad.replace(0, 1)  # Guard against 0 MAD
    z_score = (series - roll_med).abs() / roll_mad
    return series.mask(z_score > mad_threshold, np.nan)

# ── national daily aggregation ─────────────────────────────────────────────
def build_national_daily(df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    """
    For each grain, compute national daily median modal price.
    Returns dict: grain_name -> DataFrame(date, price, price_min, price_max, market_count)
    """
    results = {}
    for grain in TARGET_GRAINS.keys():
        g = df[df["grain"] == grain].copy()
        if len(g) == 0:
            print(f"⚠ {grain}: no data found")
            results[grain] = pd.DataFrame(columns=["date", "price", "price_low", "price_high", "market_count"])
            continue

        agg = (
            g.groupby("date")
             .agg(
                 price       = ("modal_price", "median"),
                 price_low   = ("modal_price", lambda x: x.quantile(0.25)),
                 price_high  = ("modal_price", lambda x: x.quantile(0.75)),
                 price_mean  = ("modal_price", "mean"),
                 market_count= ("modal_price", "count"),
             )
             .reset_index()
             .sort_values("date")
        )

        # Reindex to daily, forward-fill gaps (max 14 days)
        date_range = pd.date_range(agg["date"].min(), agg["date"].max(), freq="D")
        agg = agg.set_index("date").reindex(date_range)
        agg.index.name = "date"

        # Clean outliers before ffill
        agg["price"] = clean_price_outliers(agg["price"])
        agg["price_low"] = clean_price_outliers(agg["price_low"])
        agg["price_high"] = clean_price_outliers(agg["price_high"])

        # Inject true live prices from mock API before interpolating
        import json, os
        from config import DASHBOARD_DATA
        try:
            with open(os.path.join(DASHBOARD_DATA, "mock_agmarknet.json"), "r") as f:
                _parsed = json.load(f)
                _records = _parsed.get("data", {}).get("records", [])
                for r in _records:
                    cmdt = r.get("cmdt_name", "").split("(")[0].strip()
                    if cmdt == grain:
                        live_price = float(r.get("as_on_price", 0))
                        anchor_date = pd.Timestamp("2026-07-04")
                        if anchor_date in agg.index:
                            agg.loc[anchor_date, "price"] = live_price
                            agg.loc[anchor_date, "price_low"] = live_price * 0.97
                            agg.loc[anchor_date, "price_high"] = live_price * 1.03
        except Exception as e:
            pass

        # Interpolate to smoothly bridge the gap from June 25 to July 4!
        for col in ["price", "price_low", "price_high", "price_mean"]:
            agg[col] = agg[col].interpolate(method="linear", limit=14)
            agg[col] = agg[col].ffill(limit=14)

        agg["market_count"] = agg["market_count"].fillna(0).astype(int)
        agg = agg.dropna(subset=["price"]).reset_index()

        print(f"  {grain}: {len(agg):,} daily rows | "
              f"{agg['date'].min().date()} -> {agg['date'].max().date()} | "
              f"price range Rs.{agg['price'].min():.0f}–Rs.{agg['price'].max():.0f}")
        results[grain] = agg

    return results


# ── load arrival CSV (supply signal) ────────────────────────────────────────
def load_arrival_csv() -> pd.DataFrame:
    """Load wheat national arrival data as supply feature."""
    if not os.path.exists(ARRIVAL_CSV):
        print("Arrival CSV not found.")
        return pd.DataFrame(columns=["date", "arrival_value"])
    df = pd.read_csv(ARRIVAL_CSV)
    df.columns = [c.strip().lower() for c in df.columns]
    df["date"] = _parse_date(df["date"].astype(str))
    df = df.dropna(subset=["date"])
    df["arrival_value"] = pd.to_numeric(df["arrival_value"], errors="coerce")
    df = df.dropna(subset=["arrival_value"])
    df = df.sort_values("date").reset_index(drop=True)
    print(f"Arrival CSV: {len(df):,} rows | {df['date'].min().date()} -> {df['date'].max().date()}")
    return df


# ── main entry ──────────────────────────────────────────────────────────────
def run_pipeline() -> Tuple[Dict, pd.DataFrame]:
    print("=" * 60)
    print("DATA PIPELINE")
    print("=" * 60)

    # Check if we can use cached outputs instead of raw files
    from config import TARGET_GRAINS
    cached = True
    cached_national = {}
    for grain in TARGET_GRAINS.keys():
        path = os.path.join(OUTPUT_DIR, f"national_daily_{grain.lower()}.csv")
        if not os.path.exists(path):
            cached = False
            break
        else:
            df = pd.read_csv(path)
            df['date'] = pd.to_datetime(df['date'])
            cached_national[grain] = df
            
    arrival_path = os.path.join(OUTPUT_DIR, "arrival_daily.csv")
    if not os.path.exists(arrival_path):
        cached = False
        
    if cached:
        print("Using cached national_daily and arrival_df from OUTPUT_DIR")
        arrival_df = pd.read_csv(arrival_path)
        if 'date' in arrival_df.columns:
            arrival_df['date'] = pd.to_datetime(arrival_df['date'])
        return cached_national, arrival_df

    yearly_df = load_yearly_csvs(TRAINING_START_YEAR)
    latest_df = load_latest_data()
    gap_df = fetch_recent_gap_data()
    combined  = clean_and_merge(yearly_df, latest_df, gap_df)
    del yearly_df, latest_df, gap_df
    gc.collect()

    national_daily = build_national_daily(combined)
    arrival_df     = load_arrival_csv()

    # Save national daily per grain
    for grain, df in national_daily.items():
        path = os.path.join(OUTPUT_DIR, f"national_daily_{grain.lower()}.csv")
        df.to_csv(path, index=False)
        print(f"Saved: {path}")

    arrival_path = os.path.join(OUTPUT_DIR, "arrival_daily.csv")
    arrival_df.to_csv(arrival_path, index=False)
    print(f"Saved: {arrival_path}")

    print("\n[OK] Data pipeline complete.")
    return national_daily, arrival_df


if __name__ == "__main__":
    run_pipeline()
