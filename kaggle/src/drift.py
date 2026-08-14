from __future__ import annotations

import json

import numpy as np
import pandas as pd

from .config import RELEASE_DIR


def _safe_float(value):
    if value is None or pd.isna(value) or not np.isfinite(float(value)):
        return None
    return round(float(value), 4)


def generate_data_drift_report(
    canonical: pd.DataFrame,
    recent_days: int = 30,
    reference_days: int = 180,
) -> dict:
    frame = canonical.copy()
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame["price"] = pd.to_numeric(frame["price"], errors="coerce")
    frame["arrival"] = pd.to_numeric(frame.get("arrival"), errors="coerce")
    latest = frame["date"].max()
    recent_start = latest - pd.Timedelta(days=recent_days - 1)
    reference_start = recent_start - pd.Timedelta(days=reference_days)
    rows = []

    for (grain, state), series in frame.groupby(["grain", "state_name"], observed=True):
        recent = series[series["date"].ge(recent_start)]
        reference = series[series["date"].ge(reference_start) & series["date"].lt(recent_start)]
        recent_price = recent["price"].median()
        reference_price = reference["price"].median()
        price_shift = (
            (recent_price - reference_price) / reference_price
            if pd.notna(recent_price) and pd.notna(reference_price) and reference_price != 0
            else np.nan
        )
        recent_arrival = recent["arrival"].median()
        reference_arrival = reference["arrival"].median()
        arrival_shift = (
            (recent_arrival - reference_arrival) / abs(reference_arrival)
            if pd.notna(recent_arrival) and pd.notna(reference_arrival) and reference_arrival != 0
            else np.nan
        )
        latest_series_date = series["date"].max()
        stale_days = int((latest - latest_series_date).days) if pd.notna(latest_series_date) else None
        severity = "ok"
        reasons = []
        if len(recent) < max(3, recent_days // 5):
            severity = "warning"
            reasons.append("low_recent_coverage")
        if stale_days is not None and stale_days > 14:
            severity = "warning"
            reasons.append("stale_series")
        if pd.notna(price_shift) and abs(price_shift) > 0.35:
            severity = "warning"
            reasons.append("large_price_distribution_shift")
        rows.append({
            "grain": str(grain),
            "state": str(state),
            "latest_date": None if pd.isna(latest_series_date) else latest_series_date.date().isoformat(),
            "stale_days": stale_days,
            "recent_rows": int(len(recent)),
            "reference_rows": int(len(reference)),
            "recent_median_price": _safe_float(recent_price),
            "reference_median_price": _safe_float(reference_price),
            "price_median_shift_pct": None if pd.isna(price_shift) else round(float(price_shift) * 100, 2),
            "arrival_median_shift_pct": None if pd.isna(arrival_shift) else round(float(arrival_shift) * 100, 2),
            "severity": severity,
            "reasons": reasons,
        })

    warnings = [row for row in rows if row["severity"] != "ok"]
    report = {
        "schema_version": "1.0",
        "latest_date": latest.date().isoformat(),
        "recent_window_days": int(recent_days),
        "reference_window_days": int(reference_days),
        "summary": {
            "series_checked": len(rows),
            "warning_series": len(warnings),
            "warning_ratio": round(len(warnings) / len(rows), 4) if rows else 0,
        },
        "alerts": warnings,
        "series": rows,
    }
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    (RELEASE_DIR / "data_drift_report.json").write_text(
        json.dumps(report, indent=2, allow_nan=False),
        encoding="utf-8",
    )
    return report
