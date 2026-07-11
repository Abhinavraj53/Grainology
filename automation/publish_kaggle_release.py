from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from pathlib import Path

from supabase import create_client

from validate_prediction_bundle import validate_bundle


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


def publish_release(bundle_dir: Path, force: bool = False) -> str:
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
        .select("release_id,run_id,data_latest_date")
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

    release_id = str(uuid.uuid4())
    artifact_prefix = f"releases/{release_id}"
    storage = supabase.storage
    for path in bundle_dir.iterdir():
      if path.is_file():
          upload_file(storage, bucket, path, f"{artifact_prefix}/{path.name}")

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
        "manifest": manifest,
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
        "manifest": manifest,
    }).execute()

    supabase.rpc("activate_ai_prediction_release", {"p_release_id": release_id}).execute()
    return release_id


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle-dir", default="staging")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    try:
        release_id = publish_release(Path(args.bundle_dir), force=args.force)
        print(f"Published AI prediction release {release_id}")
    except Exception as exc:
        print(f"Publish failed: {exc}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
