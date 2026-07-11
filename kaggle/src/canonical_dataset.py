from __future__ import annotations

import shutil
from pathlib import Path

import pandas as pd

from .config import CANONICAL_CSV, CANONICAL_PARQUET, FORCE_FULL_REBUILD, STAGING_DIR
from .historical_loader import load_historical_sources
from .supabase_source import download_previous_canonical, fetch_supabase_actuals

CANONICAL_COLUMNS = [
    "date",
    "state_name",
    "state_id",
    "state_key",
    "grain",
    "price",
    "price_low",
    "price_high",
    "arrival",
    "market_count",
    "is_observed",
    "source",
    "source_priority",
    "source_fetched_at",
]


def align_canonical(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(columns=CANONICAL_COLUMNS)
    out = df.copy()
    for column in CANONICAL_COLUMNS:
        if column not in out.columns:
            out[column] = pd.NA
    out["date"] = pd.to_datetime(out["date"], errors="coerce").dt.date.astype("string")
    out["price"] = pd.to_numeric(out["price"], errors="coerce")
    out["source_priority"] = pd.to_numeric(out["source_priority"], errors="coerce").fillna(1).astype(int)
    out["market_count"] = pd.to_numeric(out["market_count"], errors="coerce").fillna(0).astype(int)
    out["is_observed"] = out["is_observed"].fillna(True).astype(bool)
    return out[CANONICAL_COLUMNS].dropna(subset=["date", "state_name", "grain", "price"])


def load_previous_canonical() -> pd.DataFrame:
    previous = STAGING_DIR / "previous_canonical.parquet"
    if FORCE_FULL_REBUILD:
        return pd.DataFrame()
    if not previous.exists():
        download_previous_canonical(previous)
    if previous.exists():
        try:
            return align_canonical(pd.read_parquet(previous))
        except Exception:
            return align_canonical(pd.read_csv(previous))
    return pd.DataFrame()


def merge_priority(frames: list[pd.DataFrame]) -> pd.DataFrame:
    aligned = [align_canonical(frame) for frame in frames if frame is not None and not frame.empty]
    if not aligned:
        return pd.DataFrame(columns=CANONICAL_COLUMNS)
    merged = pd.concat(aligned, ignore_index=True)
    merged = merged.sort_values(["date", "state_name", "grain", "source_priority"])
    merged = merged.drop_duplicates(["date", "state_name", "grain"], keep="last")
    return merged.sort_values(["grain", "state_name", "date"]).reset_index(drop=True)


def validate_canonical(df: pd.DataFrame) -> None:
    if df.empty:
        raise ValueError("Canonical dataset is empty")
    duplicate_count = df.duplicated(["date", "state_name", "grain"]).sum()
    if duplicate_count:
        raise ValueError(f"Canonical dataset has {duplicate_count} duplicate keys")
    if df["price"].le(0).any():
        raise ValueError("Canonical dataset contains nonpositive prices")
    if "All States" not in set(df["state_name"]):
        raise ValueError("Canonical dataset does not contain All States rows")


def save_canonical(df: pd.DataFrame) -> None:
    STAGING_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(CANONICAL_PARQUET, index=False)
    df.to_csv(CANONICAL_CSV, index=False)
    shutil.copy(CANONICAL_PARQUET, Path("/kaggle/working/canonical_daily.parquet"))
    shutil.copy(CANONICAL_CSV, Path("/kaggle/working/canonical_daily.csv"))


def build_canonical_dataset() -> pd.DataFrame:
    previous = load_previous_canonical()
    latest_date = None if previous.empty else str(previous["date"].max())
    historical = pd.DataFrame() if not previous.empty and not FORCE_FULL_REBUILD else load_historical_sources()
    supabase_delta = fetch_supabase_actuals(latest_date)

    canonical = merge_priority([historical, previous, supabase_delta])
    validate_canonical(canonical)
    save_canonical(canonical)
    print(f"Canonical rows: {len(canonical):,}; latest date: {canonical['date'].max()}")
    return canonical
