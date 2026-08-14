from __future__ import annotations

import json
import math
import os
from pathlib import Path


EXPECTED_GRAINS = {"Wheat", "Paddy", "Maize", "Mustard"}
EXPECTED_HORIZONS = {"7", "30", "90"}


def _finite(value):
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    return numeric if math.isfinite(numeric) else None


def _load(path: Path, fallback=None):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def national_metric_rows(metrics: dict) -> dict[tuple[str, str], dict]:
    rows = {}
    for grain, by_state in (metrics or {}).items():
        national = (by_state or {}).get("All States") or {}
        for horizon, payload in national.items():
            if not isinstance(payload, dict):
                continue
            model_mape = _finite(payload.get("ml_mape"))
            if model_mape is None:
                model_mape = _finite(payload.get("mape"))
            rows[(str(grain), str(horizon))] = {
                "mape": model_mape,
                "mae": _finite(payload.get("ml_mae") if payload.get("ml_mae") is not None else payload.get("mae")),
                "sample_count": int(payload.get("sample_count") or 0),
                "selected_method": payload.get("selected_method"),
                "validation_strategy": payload.get("validation_strategy"),
            }
    return rows


def current_price_rows(predictions: dict) -> dict[tuple[str, str], float]:
    rows = {}
    for grain, by_state in (predictions or {}).items():
        for state, payload in (by_state or {}).items():
            price = _finite((payload or {}).get("current_price"))
            if price is not None:
                rows[(str(grain), str(state))] = price
    return rows


def build_release_quality_report(
    bundle_dir: Path,
    champion_metrics: dict | None = None,
    champion_predictions: dict | None = None,
) -> dict:
    metrics = _load(bundle_dir / "metrics.json", {})
    predictions = _load(bundle_dir / "predictions.json", {})
    evaluation = _load(bundle_dir / "evaluation_report.json", None)
    candidate_rows = national_metric_rows(metrics)
    champion_rows = national_metric_rows(champion_metrics or {})
    issues: list[str] = []
    warnings: list[str] = []
    comparisons = []

    expected = {(grain, horizon) for grain in EXPECTED_GRAINS for horizon in EXPECTED_HORIZONS}
    missing = sorted(expected - set(candidate_rows))
    if missing:
        issues.append(f"Missing national metrics for {missing}")

    max_mape = float(os.environ.get("AI_RELEASE_MAX_NATIONAL_MAPE", "12"))
    max_regression_ratio = float(os.environ.get("AI_RELEASE_MAX_MAPE_REGRESSION_RATIO", "0.20"))
    max_regression_pp = float(os.environ.get("AI_RELEASE_MAX_MAPE_REGRESSION_PP", "0.50"))
    for key, candidate in sorted(candidate_rows.items()):
        candidate_mape = candidate.get("mape")
        if candidate_mape is None:
            issues.append(f"Missing finite MAPE for {key[0]}/{key[1]}d")
            continue
        if candidate_mape > max_mape:
            issues.append(f"{key[0]}/{key[1]}d MAPE {candidate_mape:.3f}% exceeds {max_mape:.3f}%")
        champion = champion_rows.get(key)
        champion_mape = champion.get("mape") if champion else None
        regression_pp = None if champion_mape is None else candidate_mape - champion_mape
        regression_ratio = None if champion_mape in {None, 0} else regression_pp / champion_mape
        comparisons.append({
            "grain": key[0],
            "horizon_days": int(key[1]),
            "candidate_mape": round(candidate_mape, 4),
            "champion_mape": None if champion_mape is None else round(champion_mape, 4),
            "regression_pp": None if regression_pp is None else round(regression_pp, 4),
            "regression_ratio": None if regression_ratio is None else round(regression_ratio, 6),
        })
        if (
            regression_pp is not None
            and regression_ratio is not None
            and regression_pp > max_regression_pp
            and regression_ratio > max_regression_ratio
        ):
            issues.append(
                f"{key[0]}/{key[1]}d regressed from {champion_mape:.3f}% to {candidate_mape:.3f}% MAPE"
            )

    require_safe_evaluation = os.environ.get("AI_REQUIRE_LEAKAGE_SAFE_EVALUATION", "false").lower() == "true"
    strategy = (evaluation or {}).get("evaluation_strategy")
    if strategy != "horizon_embargo_temporal_holdout":
        message = "Candidate does not include a horizon-embargoed temporal evaluation report"
        (issues if require_safe_evaluation else warnings).append(message)

    candidate_prices = current_price_rows(predictions)
    champion_prices = current_price_rows(champion_predictions or {})
    price_drift = []
    max_price_jump_ratio = float(os.environ.get("AI_RELEASE_MAX_CURRENT_PRICE_JUMP_RATIO", "0.50"))
    for key, candidate_price in sorted(candidate_prices.items()):
        champion_price = champion_prices.get(key)
        if champion_price in {None, 0}:
            continue
        change_ratio = (candidate_price - champion_price) / champion_price
        price_drift.append({
            "grain": key[0],
            "state": key[1],
            "candidate_price": round(candidate_price, 2),
            "champion_price": round(champion_price, 2),
            "change_pct": round(change_ratio * 100, 2),
        })
        if abs(change_ratio) > max_price_jump_ratio:
            warnings.append(
                f"Current price jump for {key[0]}/{key[1]} is {change_ratio * 100:.1f}%"
            )

    return {
        "schema_version": "1.0",
        "passed": not issues,
        "candidate_evaluation_strategy": strategy,
        "thresholds": {
            "max_national_mape": max_mape,
            "max_mape_regression_ratio": max_regression_ratio,
            "max_mape_regression_pp": max_regression_pp,
            "max_current_price_jump_ratio": max_price_jump_ratio,
            "require_leakage_safe_evaluation": require_safe_evaluation,
        },
        "issues": issues,
        "warnings": warnings,
        "national_metric_comparisons": comparisons,
        "current_price_drift": price_drift,
    }


def write_release_quality_report(
    bundle_dir: Path,
    champion_metrics: dict | None = None,
    champion_predictions: dict | None = None,
) -> dict:
    report = build_release_quality_report(bundle_dir, champion_metrics, champion_predictions)
    (bundle_dir / "publish_quality_report.json").write_text(
        json.dumps(report, indent=2, allow_nan=False),
        encoding="utf-8",
    )
    return report
