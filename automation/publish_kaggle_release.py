from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import uuid
from pathlib import Path

from supabase import create_client

from validate_prediction_bundle import validate_bundle
from release_quality import write_release_quality_report
from release_artifacts import (
    CHUNKED_MARKET_RELEASE_FILES,
    TRAINING_ONLY_RELEASE_FILES,
    build_market_payload_chunks,
    build_serving_manifest,
    encode_json,
)


def env(name: str, fallback: str | None = None) -> str:
    value = os.environ.get(name) or fallback
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_supabase_client():
    return create_client(
        env("SUPABASE_URL"),
        env("SUPABASE_SECRET_KEY", os.environ.get("SUPABASE_SERVICE_ROLE_KEY")),
    )


def upload_file(storage, bucket: str, source: Path, destination: str) -> None:
    with source.open("rb") as handle:
        storage.from_(bucket).upload(
            destination,
            handle,
            file_options={"upsert": "true"},
        )


def upload_json(storage, bucket: str, payload, destination: str) -> None:
    encoded = encode_json(payload)
    storage.from_(bucket).upload(
        destination,
        encoded,
        file_options={"upsert": "true", "content-type": "application/json"},
    )


def safe_chunk_name(*parts: str) -> str:
    raw = "::".join(str(part) for part in parts)
    slug = "".join(ch.lower() if ch.isalnum() else "-" for ch in raw).strip("-")
    slug = "-".join(part for part in slug.split("-") if part)[:90] or "chunk"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12]
    return f"{slug}-{digest}.json"


def upload_historical_efficiency_chunks(storage, bucket: str, source: Path, artifact_prefix: str) -> None:
    payload = json.loads(source.read_text(encoding="utf-8"))
    chunks: dict[str, dict[str, dict[str, str]]] = {}
    base_prefix = f"{artifact_prefix}/historical_efficiency"

    for grain, by_state in (payload or {}).items():
        chunks.setdefault(grain, {})
        for state, by_horizon in (by_state or {}).items():
            chunks[grain].setdefault(state, {})
            if not isinstance(by_horizon, dict):
                chunk_name = safe_chunk_name(grain, state, "all")
                upload_json(storage, bucket, by_horizon, f"{base_prefix}/{chunk_name}")
                chunks[grain][state]["all"] = f"historical_efficiency/{chunk_name}"
                continue

            for horizon, horizon_payload in by_horizon.items():
                chunk_name = safe_chunk_name(grain, state, horizon)
                upload_json(storage, bucket, horizon_payload, f"{base_prefix}/{chunk_name}")
                chunks[grain][state][str(horizon)] = f"historical_efficiency/{chunk_name}"

    index = {
        "kind": "chunked_historical_efficiency",
        "schema_version": "1.0",
        "chunks": chunks,
    }
    upload_json(storage, bucket, index, f"{artifact_prefix}/historical_efficiency.index.json")
    upload_json(
        storage,
        bucket,
        {
            "chunked": True,
            "index_file": "historical_efficiency.index.json",
            "message": "Historical efficiency is stored in per grain/state/horizon chunks.",
        },
        f"{artifact_prefix}/historical_efficiency.json",
    )


def upload_market_payload_chunks(storage, bucket: str, source: Path, artifact_prefix: str) -> None:
    payload = json.loads(source.read_text(encoding="utf-8"))
    stem = source.stem
    base_prefix = f"{artifact_prefix}/{stem}"
    index: dict = {
        "kind": "chunked_market_payload",
        "schema_version": "1.0",
        "source_file": source.name,
        "chunks": {},
    }

    for chunk_number, (grain, chunk_payload) in enumerate(build_market_payload_chunks(payload), start=1):
        chunk_name = safe_chunk_name(stem, grain, chunk_number)
        relative_path = f"{stem}/{chunk_name}"
        upload_json(storage, bucket, chunk_payload, f"{base_prefix}/{chunk_name}")
        grain_index = index["chunks"].setdefault(grain, {})
        for market_key in (chunk_payload.get(grain) or {}):
            grain_index[str(market_key)] = relative_path

    upload_json(storage, bucket, index, f"{artifact_prefix}/{stem}.index.json")
    upload_json(
        storage,
        bucket,
        {
            "chunked": True,
            "index_file": f"{stem}.index.json",
            "message": f"{source.name} is stored in bounded market payload chunks.",
        },
        f"{artifact_prefix}/{source.name}",
    )


def download_json(storage, bucket: str, path: str) -> dict | None:
    try:
        raw = storage.from_(bucket).download(path)
        if isinstance(raw, bytes):
            return json.loads(raw.decode("utf-8"))
        if isinstance(raw, str):
            return json.loads(raw)
    except Exception as exc:
        print(f"Quality comparison skipped for {path}: {exc}")
    return None


def publish_release(bundle_dir: Path, force: bool = False, allow_regression: bool = False) -> str:
    validate_bundle(bundle_dir)
    manifest = json.loads((bundle_dir / "manifest.json").read_text(encoding="utf-8"))
    supabase = get_supabase_client()
    bucket = os.environ.get("AI_PREDICTION_BUCKET", "ai-predictions")

    run_id = manifest.get("run_id")
    try:
        run_id = str(uuid.UUID(str(run_id)))
    except Exception as exc:
        raise RuntimeError("manifest.run_id must be a UUID") from exc

    active = (
        supabase.table("ai_prediction_releases")
        .select("release_id,run_id,data_latest_date,artifact_prefix")
        .eq("is_active", True)
        .limit(1)
        .execute()
        .data
    )
    if active and not force:
        active_release = active[0]
        if str(run_id) == str(active_release.get("run_id")):
            print(f"No-op: Kaggle run {run_id} is already the active release")
            return str(active_release["release_id"])
        if str(manifest["data_latest_date"]) < str(active_release["data_latest_date"]):
            raise RuntimeError("Refusing to publish stale prediction bundle")

    storage = supabase.storage
    champion_metrics = None
    champion_predictions = None
    if active:
        active_prefix = active[0].get("artifact_prefix")
        if active_prefix:
            champion_metrics = download_json(storage, bucket, f"{active_prefix}/metrics.json")
            champion_predictions = download_json(storage, bucket, f"{active_prefix}/predictions.json")

    quality_report = write_release_quality_report(bundle_dir, champion_metrics, champion_predictions)
    if not quality_report["passed"] and not allow_regression:
        raise RuntimeError("Release quality gate failed: " + "; ".join(quality_report["issues"][:6]))
    if quality_report["warnings"]:
        print("Release quality warnings: " + "; ".join(quality_report["warnings"][:6]))

    release_id = str(uuid.uuid4())
    artifact_prefix = f"releases/{release_id}"
    serving_manifest, serving_checksums, excluded_training_artifacts = build_serving_manifest(
        bundle_dir, manifest
    )
    for path in bundle_dir.iterdir():
      if path.is_file():
          if path.name in TRAINING_ONLY_RELEASE_FILES or path.name in {"manifest.json", "checksums.json"}:
              continue
          if path.name == "historical_efficiency.json":
              upload_historical_efficiency_chunks(storage, bucket, path, artifact_prefix)
              continue
          if path.name in CHUNKED_MARKET_RELEASE_FILES:
              upload_market_payload_chunks(storage, bucket, path, artifact_prefix)
              continue
          upload_file(storage, bucket, path, f"{artifact_prefix}/{path.name}")
    upload_json(storage, bucket, serving_checksums, f"{artifact_prefix}/checksums.json")
    upload_json(storage, bucket, serving_manifest, f"{artifact_prefix}/manifest.json")
    if excluded_training_artifacts:
        print(
            "Training-only artifacts retained in Kaggle and excluded from Supabase serving release: "
            + ", ".join(excluded_training_artifacts)
        )

    canonical_prefix = "canonical/latest"
    for name in ["canonical_daily.parquet", "canonical_daily.csv"]:
        source = bundle_dir / name
        if source.exists():
            upload_file(storage, bucket, source, f"{canonical_prefix}/{name}")

    supabase.table("ai_prediction_runs").upsert({
        "run_id": run_id,
        "status": "validated",
        "completed_at": manifest.get("generated_at"),
        "actuals_max_date": manifest.get("data_latest_date"),
        "actuals_max_updated_at": manifest.get("actuals_max_updated_at"),
        "actuals_row_count": manifest.get("actuals_row_count"),
        "code_version": manifest.get("code_version"),
        "kaggle_kernel": os.environ.get("KAGGLE_KERNEL_ID"),
        "artifact_prefix": artifact_prefix,
        "manifest": {**serving_manifest, "publish_quality": quality_report},
    }).execute()

    supabase.table("ai_prediction_releases").insert({
        "release_id": release_id,
        "run_id": run_id,
        "schema_version": manifest["schema_version"],
        "artifact_prefix": artifact_prefix,
        "canonical_prefix": canonical_prefix,
        "data_latest_date": manifest["data_latest_date"],
        "generated_at": manifest["generated_at"],
        "is_active": False,
        "manifest": {**serving_manifest, "publish_quality": quality_report},
    }).execute()

    supabase.rpc("activate_ai_prediction_release", {"p_release_id": release_id}).execute()
    return release_id


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle-dir", default="staging")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--allow-regression", action="store_true")
    args = parser.parse_args()

    try:
        release_id = publish_release(
            Path(args.bundle_dir),
            force=args.force,
            allow_regression=args.allow_regression,
        )
        print(f"Published AI prediction release {release_id}")
    except Exception as exc:
        print(f"Publish failed: {exc}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
