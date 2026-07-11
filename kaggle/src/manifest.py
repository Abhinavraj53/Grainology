from __future__ import annotations

import hashlib
import json
import os
import shutil
import uuid
import zipfile
from datetime import datetime, timezone

import pandas as pd

from .config import CANONICAL_CSV, CANONICAL_PARQUET, CANONICAL_SCHEMA_VERSION, HORIZONS, MODEL_MODE, RELEASE_DIR, RELEASE_SCHEMA_VERSION, REQUIRED_RELEASE_FILES, STAGING_DIR, TARGET_GRAINS, WORK_ROOT


def sha256(path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_states(canonical: pd.DataFrame) -> list[str]:
    states = sorted(canonical["state_name"].dropna().unique().tolist(), key=lambda state: (state != "All States", state))
    payload = {
        "states": [
            {
                "state_name": state,
                "state_key": "all-states" if state == "All States" else state.lower().replace(" ", "-"),
            }
            for state in states
        ]
    }
    (RELEASE_DIR / "states.json").write_text(json.dumps(payload, indent=2, allow_nan=False), encoding="utf-8")
    return states


def mirror_release_for_kaggle_output() -> None:
    files = [path for path in sorted(RELEASE_DIR.iterdir()) if path.is_file()]
    zip_path = WORK_ROOT / "grainology_release.zip"
    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            shutil.copy(path, WORK_ROOT / path.name)
            archive.write(path, arcname=f"release/{path.name}")

    print(f"Mirrored {len(files)} release files to {WORK_ROOT}")
    print(f"Release archive written to {zip_path}")


def finalize_release(canonical: pd.DataFrame) -> dict:
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy(CANONICAL_PARQUET, RELEASE_DIR / "canonical_daily.parquet")
    shutil.copy(CANONICAL_CSV, RELEASE_DIR / "canonical_daily.csv")
    states = write_states(canonical)

    files = {
        path.name: sha256(path)
        for path in RELEASE_DIR.iterdir()
        if path.is_file() and path.name not in {"manifest.json", "checksums.json"}
    }
    checksums = dict(sorted(files.items()))
    (RELEASE_DIR / "checksums.json").write_text(json.dumps(checksums, indent=2), encoding="utf-8")
    files["checksums.json"] = sha256(RELEASE_DIR / "checksums.json")

    run_id = os.environ.get("KAGGLE_KERNEL_RUN_ID")
    try:
        run_id = str(uuid.UUID(str(run_id)))
    except Exception:
        run_id = str(uuid.uuid4())

    generated_at = datetime.now(timezone.utc).isoformat()
    data_latest_date = pd.to_datetime(canonical["date"]).max().date().isoformat()
    manifest = {
        "schema_version": RELEASE_SCHEMA_VERSION,
        "canonical_schema_version": CANONICAL_SCHEMA_VERSION,
        "run_id": run_id,
        "status": "success",
        "generated_at": generated_at,
        "data_latest_date": data_latest_date,
        "actuals_max_updated_at": generated_at,
        "actuals_row_count": int(len(canonical)),
        "forecast_start_date": (pd.to_datetime(data_latest_date) + pd.Timedelta(days=1)).date().isoformat(),
        "model_mode": MODEL_MODE,
        "grains": TARGET_GRAINS,
        "horizons": HORIZONS,
        "states": states,
        "aggregation_method": os.environ.get("AGGREGATION_METHOD", "median"),
        "code_version": os.environ.get("GITHUB_SHA") or os.environ.get("KAGGLE_KERNEL_RUN_ID") or "kaggle-local",
        "files": dict(sorted(files.items())),
    }
    (RELEASE_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2, allow_nan=False), encoding="utf-8")

    missing = [name for name in REQUIRED_RELEASE_FILES if not (RELEASE_DIR / name).exists()]
    if missing:
        raise ValueError(f"Release bundle missing required files: {missing}")

    mirror_release_for_kaggle_output()
    print(f"Release finalized at {RELEASE_DIR}")
    print(f"Staging source was {STAGING_DIR}")
    return manifest
