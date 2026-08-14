from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
from pathlib import Path

REQUIRED_FILES = {
    "manifest.json",
    "predictions.json",
    "actuals.json",
    "forecast_series.json",
    "historical_efficiency.json",
    "reasoning.json",
    "states.json",
    "metrics.json",
}

SECRET_PATTERNS = [
    re.compile(r"sb_secret_[A-Za-z0-9_-]+"),
    re.compile(r"service_role", re.IGNORECASE),
    re.compile(r"postgres(?:ql)?://", re.IGNORECASE),
    re.compile(r"authorization\s*:", re.IGNORECASE),
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def walk_numbers(value, location="root"):
    if isinstance(value, dict):
        for key, child in value.items():
            yield from walk_numbers(child, f"{location}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk_numbers(child, f"{location}[{index}]")
    elif isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        yield location


def scan_for_secrets(path: Path):
    text = path.read_text(encoding="utf-8", errors="ignore")
    for pattern in SECRET_PATTERNS:
        if pattern.search(text):
            raise ValueError(f"Potential secret pattern found in {path.name}: {pattern.pattern}")


def validate_bundle(bundle_dir: Path) -> None:
    missing = sorted(name for name in REQUIRED_FILES if not (bundle_dir / name).exists())
    if missing:
        raise ValueError(f"Missing required bundle files: {', '.join(missing)}")

    for path in bundle_dir.iterdir():
        if path.is_file():
            scan_for_secrets(path)

    manifest = load_json(bundle_dir / "manifest.json")
    predictions = load_json(bundle_dir / "predictions.json")
    states_payload = load_json(bundle_dir / "states.json")

    states = states_payload.get("states", states_payload if isinstance(states_payload, list) else [])
    state_names = {
        state.get("state_name") if isinstance(state, dict) else state
        for state in states
    }
    state_names.discard(None)

    for field in ["schema_version", "run_id", "generated_at", "data_latest_date", "grains", "horizons"]:
        if field not in manifest:
            raise ValueError(f"manifest.json missing {field}")

    if sorted(int(horizon) for horizon in manifest["horizons"]) != [7, 30, 90]:
        raise ValueError("manifest horizons must be exactly 7, 30, and 90")

    for file_name, expected_hash in manifest.get("files", {}).items():
        path = bundle_dir / file_name
        if not path.exists():
            raise ValueError(f"Manifest references missing file: {file_name}")
        if expected_hash and sha256(path) != expected_hash:
            raise ValueError(f"Checksum mismatch for {file_name}")

    for grain, by_state in predictions.items():
        for state, payload in by_state.items():
            if state_names and state not in state_names:
                raise ValueError(f"Prediction state {state!r} for {grain} missing from states.json")
            horizons = payload.get("horizons", {})
            missing_horizons = [h for h in ["7", "30", "90"] if h not in {str(k) for k in horizons.keys()}]
            if missing_horizons:
                raise ValueError(f"{grain}/{state} missing horizons: {missing_horizons}")

    for json_file in bundle_dir.glob("*.json"):
        invalid_locations = list(walk_numbers(load_json(json_file)))
        if invalid_locations:
            raise ValueError(f"{json_file.name} contains NaN/Infinity at {invalid_locations[:3]}")

    evaluation_path = bundle_dir / "evaluation_report.json"
    if evaluation_path.exists():
        evaluation = load_json(evaluation_path)
        if evaluation.get("evaluation_strategy") != "horizon_embargo_temporal_holdout":
            raise ValueError("evaluation_report.json must use horizon_embargo_temporal_holdout")
        for row in evaluation.get("series", []):
            horizon = int(row.get("horizon_days", 0))
            if int(row.get("target_embargo_days", 0)) < horizon:
                raise ValueError(f"Evaluation embargo is shorter than horizon for {row.get('grain')}/{horizon}d")
            train_end = row.get("training_end_date")
            calibration_start = row.get("calibration_start_date")
            validation_start = row.get("validation_start_date")
            if train_end and calibration_start and train_end >= calibration_start:
                raise ValueError("Evaluation training period overlaps calibration period")
            if calibration_start and validation_start and calibration_start > validation_start:
                raise ValueError("Evaluation calibration period begins after validation period")

    markets_path = bundle_dir / "markets.json"
    market_predictions_path = bundle_dir / "market_predictions.json"
    if markets_path.exists() or market_predictions_path.exists():
        if not markets_path.exists() or not market_predictions_path.exists():
            raise ValueError("Mandi release must include both markets.json and market_predictions.json")
        markets_payload = load_json(markets_path)
        markets = markets_payload.get("markets", markets_payload if isinstance(markets_payload, list) else [])
        keys = [item.get("market_key") for item in markets if isinstance(item, dict)]
        if any(not key for key in keys) or len(keys) != len(set(keys)):
            raise ValueError("markets.json contains missing or duplicate market_key values")
        for market in markets:
            lat, lng = market.get("lat"), market.get("lng")
            if lat is not None and not -90 <= float(lat) <= 90:
                raise ValueError(f"Invalid market latitude for {market.get('market_key')}")
            if lng is not None and not -180 <= float(lng) <= 180:
                raise ValueError(f"Invalid market longitude for {market.get('market_key')}")
        known = set(keys)
        for grain, by_market in load_json(market_predictions_path).items():
            for market_key, payload in (by_market or {}).items():
                if market_key not in known:
                    raise ValueError(f"Market prediction {grain}/{market_key} missing from markets.json")
                prediction = payload.get("prediction", payload)
                horizons = {str(key) for key in (prediction.get("horizons") or {})}
                if horizons != {"7", "30", "90"}:
                    raise ValueError(f"Market prediction {grain}/{market_key} must contain 7/30/90 horizons")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle_dir", nargs="?", default="staging")
    parser.add_argument("--fixture", dest="fixture", help="Compatibility alias for bundle_dir")
    args = parser.parse_args()
    validate_bundle(Path(args.fixture or args.bundle_dir))
    print("Prediction bundle validation passed")


if __name__ == "__main__":
    main()
