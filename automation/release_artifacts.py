from __future__ import annotations

import hashlib
import json
from pathlib import Path


TRAINING_ONLY_RELEASE_FILES = {
    "market_canonical_daily.csv",
    "market_canonical_daily.parquet",
}


def encode_json(payload) -> bytes:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def build_serving_manifest(bundle_dir: Path, manifest: dict) -> tuple[dict, dict, list[str]]:
    checksums_path = bundle_dir / "checksums.json"
    checksums = json.loads(checksums_path.read_text(encoding="utf-8"))
    excluded = sorted(
        name for name in TRAINING_ONLY_RELEASE_FILES
        if (bundle_dir / name).exists()
    )

    serving_checksums = {
        name: digest
        for name, digest in checksums.items()
        if name not in TRAINING_ONLY_RELEASE_FILES
    }
    checksums_digest = hashlib.sha256(encode_json(serving_checksums)).hexdigest()

    serving_manifest = dict(manifest)
    serving_manifest["files"] = {
        name: digest
        for name, digest in (manifest.get("files") or {}).items()
        if name not in TRAINING_ONLY_RELEASE_FILES
    }
    serving_manifest["files"]["checksums.json"] = checksums_digest
    serving_manifest["training_artifacts_retained_in_kaggle"] = excluded
    return serving_manifest, serving_checksums, excluded
