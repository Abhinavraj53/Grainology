from __future__ import annotations

import hashlib
import json
from pathlib import Path


TRAINING_ONLY_RELEASE_FILES = {
    "market_canonical_daily.csv",
    "market_canonical_daily.parquet",
}

CHUNKED_MARKET_RELEASE_FILES = {
    "market_actuals.json",
    "market_forecast_series.json",
}

TRANSFORMED_SERVING_FILES = CHUNKED_MARKET_RELEASE_FILES | {
    "historical_efficiency.json",
}

DEFAULT_MARKET_CHUNK_BYTES = 4 * 1024 * 1024


def encode_json(payload) -> bytes:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def build_market_payload_chunks(
    payload: dict,
    max_bytes: int = DEFAULT_MARKET_CHUNK_BYTES,
) -> list[tuple[str, dict]]:
    """Split a grain/market mapping into independently downloadable JSON payloads."""
    if max_bytes <= 0:
        raise ValueError("max_bytes must be positive")

    chunks: list[tuple[str, dict]] = []
    for grain, by_market in (payload or {}).items():
        if not isinstance(by_market, dict):
            candidate = {grain: by_market}
            if len(encode_json(candidate)) > max_bytes:
                raise ValueError(f"{grain} payload cannot fit in one market chunk")
            chunks.append((str(grain), candidate))
            continue

        current: dict = {}
        current_size = len(encode_json({grain: {}}))
        for market_key, market_payload in by_market.items():
            item_size = len(encode_json({market_key: market_payload})) - 2
            separator_size = 1 if current else 0
            if current and current_size + separator_size + item_size > max_bytes:
                chunks.append((str(grain), {grain: current}))
                current = {market_key: market_payload}
                current_size = len(encode_json({grain: current}))
            else:
                current[market_key] = market_payload
                current_size += separator_size + item_size

            if current_size > max_bytes:
                raise ValueError(
                    f"{grain}/{market_key} payload exceeds the market chunk size limit"
                )

        if current:
            chunks.append((str(grain), {grain: current}))

    return chunks


def build_serving_manifest(bundle_dir: Path, manifest: dict) -> tuple[dict, dict, list[str]]:
    checksums_path = bundle_dir / "checksums.json"
    checksums = json.loads(checksums_path.read_text(encoding="utf-8"))
    excluded = sorted(
        name for name in TRAINING_ONLY_RELEASE_FILES
        if (bundle_dir / name).exists()
    )

    omitted_checksums = TRAINING_ONLY_RELEASE_FILES | TRANSFORMED_SERVING_FILES
    serving_checksums = {
        name: digest
        for name, digest in checksums.items()
        if name not in omitted_checksums
    }
    checksums_digest = hashlib.sha256(encode_json(serving_checksums)).hexdigest()

    serving_manifest = dict(manifest)
    serving_manifest["files"] = {
        name: digest
        for name, digest in (manifest.get("files") or {}).items()
        if name not in omitted_checksums
    }
    serving_manifest["files"]["checksums.json"] = checksums_digest
    serving_manifest["training_artifacts_retained_in_kaggle"] = excluded
    serving_manifest["chunked_serving_artifacts"] = sorted(TRANSFORMED_SERVING_FILES)
    return serving_manifest, serving_checksums, excluded
