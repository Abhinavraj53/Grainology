from __future__ import annotations

import argparse
import json
import shutil
import zipfile
from pathlib import Path

from validate_prediction_bundle import validate_bundle


REQUIRED_MARKERS = {
    "manifest.json",
    "predictions.json",
    "actuals.json",
    "forecast_series.json",
    "historical_efficiency.json",
    "reasoning.json",
    "states.json",
    "metrics.json",
}


def has_release_markers(path: Path) -> bool:
    return path.is_dir() and all((path / name).exists() for name in REQUIRED_MARKERS)


def extract_zip(zip_path: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as archive:
        archive.extractall(output_dir)


def discover_candidates(root: Path) -> list[Path]:
    candidates: list[Path] = []
    if has_release_markers(root):
        candidates.append(root)

    for manifest in root.rglob("manifest.json"):
        candidate = manifest.parent
        if has_release_markers(candidate) and candidate not in candidates:
            candidates.append(candidate)

    return candidates


def prepare_release_zip(zip_path: Path, output_dir: Path, work_dir: Path) -> Path:
    if output_dir.exists():
        shutil.rmtree(output_dir)
    if work_dir.exists():
        shutil.rmtree(work_dir)

    extract_root = work_dir / "extract"
    extract_zip(zip_path, extract_root)

    # Kaggle sometimes includes a compact release zip alongside the expanded files.
    for nested_zip in list(extract_root.rglob("*.zip")):
        nested_target = work_dir / f"nested-{nested_zip.stem}"
        try:
            extract_zip(nested_zip, nested_target)
        except zipfile.BadZipFile:
            continue

    candidates = discover_candidates(work_dir)
    if not candidates:
        raise RuntimeError("No valid AI release bundle found in zip")

    valid_candidates: list[Path] = []
    errors: list[str] = []
    for candidate in candidates:
        try:
            validate_bundle(candidate)
            valid_candidates.append(candidate)
        except Exception as exc:
            errors.append(f"{candidate}: {exc}")

    if not valid_candidates:
        raise RuntimeError("No candidate release bundle passed validation:\n" + "\n".join(errors[:5]))

    def score(path: Path) -> tuple[int, int, str]:
        # Prefer an explicit release directory, then shorter paths.
        release_bonus = 0 if path.name == "release" else 1
        return (release_bonus, len(path.parts), str(path))

    selected = sorted(valid_candidates, key=score)[0]
    shutil.copytree(selected, output_dir)

    manifest = json.loads((output_dir / "manifest.json").read_text(encoding="utf-8"))
    print(
        json.dumps(
            {
                "prepared": True,
                "source_zip": str(zip_path),
                "selected_bundle": str(selected),
                "output_dir": str(output_dir),
                "run_id": manifest.get("run_id"),
                "generated_at": manifest.get("generated_at"),
                "data_latest_date": manifest.get("data_latest_date"),
                "grains": manifest.get("grains"),
                "horizons": manifest.get("horizons"),
            },
            indent=2,
        )
    )
    return output_dir


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("zip_path", type=Path)
    parser.add_argument("--output", type=Path, default=Path("staging/manual-release-zip/release"))
    parser.add_argument("--work-dir", type=Path, default=Path("staging/manual-release-zip/work"))
    args = parser.parse_args()

    prepare_release_zip(args.zip_path, args.output, args.work_dir)


if __name__ == "__main__":
    main()
