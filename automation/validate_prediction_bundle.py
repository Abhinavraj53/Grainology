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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle_dir", nargs="?", default="staging")
    parser.add_argument("--fixture", dest="fixture", help="Compatibility alias for bundle_dir")
    args = parser.parse_args()
    validate_bundle(Path(args.fixture or args.bundle_dir))
    print("Prediction bundle validation passed")


if __name__ == "__main__":
    main()
