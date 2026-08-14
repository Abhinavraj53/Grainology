from __future__ import annotations

import json
import math

from .config import HORIZONS, RELEASE_DIR, TARGET_GRAINS


def _finite(value):
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    return numeric if math.isfinite(numeric) else None


def generate_evaluation_report(registry: dict) -> dict:
    rows = []
    for grain in TARGET_GRAINS:
        for horizon in HORIZONS:
            trained = registry.get("models", {}).get(grain, {}).get(str(horizon)) or {}
            for state, gate in (trained.get("gates") or {}).items():
                baseline_mape = _finite(gate.get("baseline_mape"))
                model_mape = _finite(gate.get("ml_mape"))
                relative_gain = _finite(gate.get("relative_mape_gain"))
                rows.append({
                    "grain": grain,
                    "state": state,
                    "horizon_days": int(horizon),
                    "selected_method": gate.get("selected_method", "baseline"),
                    "candidate_method": gate.get("candidate_method"),
                    "sample_count": int(gate.get("sample_count", 0)),
                    "baseline_mape": baseline_mape,
                    "model_mape": model_mape,
                    "relative_mape_improvement_pct": None if relative_gain is None else round(relative_gain * 100, 2),
                    "fold_wins": int(gate.get("fold_wins", 0)),
                    "fold_count": int(gate.get("fold_count", 0)),
                    "validation_strategy": gate.get("validation_strategy"),
                    "training_end_date": gate.get("training_end_date"),
                    "calibration_start_date": gate.get("calibration_start_date"),
                    "validation_start_date": gate.get("validation_start_date"),
                    "target_embargo_days": int(gate.get("target_embargo_days", horizon)),
                    "interval_sample_count": int(gate.get("interval_sample_count", 0)),
                    "interval_coverage_target": _finite(gate.get("interval_coverage_target")),
                    "holdout_interval_coverage": _finite(gate.get("holdout_interval_coverage")),
                })

    national = [row for row in rows if row["state"] == "All States" and row["model_mape"] is not None]
    weighted_samples = sum(max(0, row["sample_count"]) for row in national)
    weighted_mape = (
        sum(row["model_mape"] * max(0, row["sample_count"]) for row in national) / weighted_samples
        if weighted_samples else None
    )
    report = {
        "schema_version": "1.0",
        "evaluation_strategy": "horizon_embargo_temporal_holdout",
        "leakage_controls": [
            "lagged and rolling features use prior observations only",
            "feature imputation statistics are learned from training rows only",
            "training target dates end before calibration begins",
            "Optuna tuning uses an inner training window",
            "ensemble weights are learned on calibration rows, not final holdout rows",
            "prediction intervals are calibrated before the final holdout using split conformal log residuals",
            "method promotion requires improvement across temporal holdout folds",
        ],
        "summary": {
            "series_evaluated": len(rows),
            "national_series_evaluated": len(national),
            "national_weighted_mape": None if weighted_mape is None else round(weighted_mape, 4),
            "national_min_mape": None if not national else round(min(row["model_mape"] for row in national), 4),
            "national_max_mape": None if not national else round(max(row["model_mape"] for row in national), 4),
            "promoted_series": sum(1 for row in rows if row["selected_method"] != "baseline"),
            "baseline_series": sum(1 for row in rows if row["selected_method"] == "baseline"),
        },
        "series": rows,
    }
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    (RELEASE_DIR / "evaluation_report.json").write_text(
        json.dumps(report, indent=2, allow_nan=False),
        encoding="utf-8",
    )
    return report
