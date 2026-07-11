from __future__ import annotations

from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd

from .config import AGGREGATION_METHOD, INPUT_ROOT, TARGET_GRAINS

COLUMN_ALIASES = {
    "date": ["date", "arrival_date", "price_date", "reported_date"],
    "state_name": ["state", "state_name", "state_name_en"],
    "district": ["district", "district_name"],
    "market": ["market", "market_name"],
    "grain": ["commodity", "cmdt_name", "commodity_name", "grain"],
    "variety": ["variety", "variety_name"],
    "grade": ["grade"],
    "price": ["modal_price", "modalprice", "price", "modal_price_rs_quintal"],
    "price_low": ["min_price", "minprice", "price_low"],
    "price_high": ["max_price", "maxprice", "price_high"],
    "arrival": ["arrival", "arrival_qty", "arrival_metric_tonnes", "arrival_mt"],
}


def normalize_grain(value: object) -> str | None:
    text = str(value or "").strip().lower()
    if not text:
        return None
    if "mustard oil" in text or "oil" in text and "mustard" in text:
        return None
    if "wheat" in text:
        return "Wheat"
    if "paddy" in text:
        return "Paddy"
    if "maize" in text or "corn" in text:
        return "Maize"
    if "mustard" in text or "sarson" in text or "rapeseed" in text or "rape seed" in text:
        return "Mustard"
    return None


def discover_data_files(root: Path = INPUT_ROOT) -> list[Path]:
    parquet_files = sorted(path for path in root.rglob("*.parquet") if path.is_file())
    csv_files = sorted(path for path in root.rglob("*.csv") if path.is_file())
    yearly_parquets = [path for path in parquet_files if path.stem.isdigit()]
    latest_csvs = [path for path in csv_files if path.name.lower() == "latest_data.csv"]
    yearly_csvs = [path for path in csv_files if path.stem.isdigit()]
    if yearly_parquets:
        return yearly_parquets + latest_csvs
    if yearly_csvs:
        return yearly_csvs + latest_csvs
    if parquet_files:
        return parquet_files + latest_csvs
    return csv_files


def resolve_columns(columns: Iterable[str]) -> dict[str, str | None]:
    by_lower = {column.lower().strip(): column for column in columns}
    resolved: dict[str, str | None] = {}
    for target, aliases in COLUMN_ALIASES.items():
        resolved[target] = next((by_lower[alias] for alias in aliases if alias in by_lower), None)
    return resolved


def normalize_frame(df: pd.DataFrame, source: str, source_priority: int) -> pd.DataFrame:
    resolved = resolve_columns(df.columns)
    required = ["date", "state_name", "grain", "price"]
    if any(resolved[column] is None for column in required):
        return pd.DataFrame()

    out = pd.DataFrame()
    for column, source_column in resolved.items():
        if source_column is None:
            out[column] = np.nan
        else:
            out[column] = df[source_column]

    out["date"] = pd.to_datetime(out["date"], errors="coerce", dayfirst=True).dt.date.astype("string")
    out["state_name"] = out["state_name"].astype("string").str.strip()
    out["grain"] = out["grain"].map(normalize_grain)
    for column in ["price", "price_low", "price_high", "arrival"]:
        out[column] = pd.to_numeric(out[column], errors="coerce")

    out = out[
        out["date"].notna()
        & out["state_name"].notna()
        & out["grain"].isin(TARGET_GRAINS)
        & out["price"].between(100, 20000)
    ].copy()

    out["market_count"] = 1
    out["state_id"] = pd.NA
    out["state_key"] = out["state_name"].str.lower().str.replace(r"[^a-z0-9]+", "-", regex=True).str.strip("-")
    out["is_observed"] = True
    out["source"] = source
    out["source_priority"] = source_priority
    out["source_fetched_at"] = pd.NaT
    return out


def aggregate_daily(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    price_agg = "mean" if AGGREGATION_METHOD == "mean" else "median"
    grouped = df.groupby(["date", "state_name", "grain"], as_index=False).agg(
        state_id=("state_id", "first"),
        state_key=("state_key", "first"),
        price=("price", price_agg),
        price_low=("price_low", "min"),
        price_high=("price_high", "max"),
        arrival=("arrival", "sum"),
        market_count=("market_count", "sum"),
        is_observed=("is_observed", "max"),
        source=("source", "last"),
        source_priority=("source_priority", "max"),
        source_fetched_at=("source_fetched_at", "max"),
    )

    all_states = df.groupby(["date", "grain"], as_index=False).agg(
        price=("price", price_agg),
        price_low=("price_low", "min"),
        price_high=("price_high", "max"),
        arrival=("arrival", "sum"),
        market_count=("market_count", "sum"),
        is_observed=("is_observed", "max"),
        source=("source", "last"),
        source_priority=("source_priority", "max"),
        source_fetched_at=("source_fetched_at", "max"),
    )
    all_states["state_name"] = "All States"
    all_states["state_id"] = "100006"
    all_states["state_key"] = "all-states"

    return pd.concat([grouped, all_states[grouped.columns]], ignore_index=True)


def load_path(path: Path, source_priority: int) -> pd.DataFrame:
    try:
        if path.suffix.lower() == ".parquet":
            df = pd.read_parquet(path)
        else:
            df = pd.read_csv(path)
    except Exception as exc:
        print(f"Skipping {path}: {exc}")
        return pd.DataFrame()
    source = "latest_csv" if path.name.lower() == "latest_data.csv" else "historical"
    return normalize_frame(df, source=source, source_priority=source_priority)


def load_historical_sources() -> pd.DataFrame:
    files = discover_data_files()
    if not files:
        print(f"No historical files found under {INPUT_ROOT}")
        return pd.DataFrame()

    frames = []
    for path in files:
        priority = 2 if path.name.lower() == "latest_data.csv" else 1
        frame = load_path(path, priority)
        if not frame.empty:
            frames.append(frame)

    if not frames:
        return pd.DataFrame()

    raw = pd.concat(frames, ignore_index=True)
    daily = aggregate_daily(raw)
    print(f"Loaded {len(daily):,} canonical historical rows from {len(files)} files")
    return daily
