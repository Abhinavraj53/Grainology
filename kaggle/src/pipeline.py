from __future__ import annotations

import shutil

from .canonical_dataset import build_canonical_dataset
from .config import RELEASE_DIR, STAGING_DIR
from .drift import generate_data_drift_report
from .efficiency import generate_efficiency_data
from .evaluation import generate_evaluation_report
from .manifest import finalize_release
from .predict import generate_predictions
from .reasoning import generate_reasoning
from .train import train_models


def run_pipeline():
    for directory in [STAGING_DIR, RELEASE_DIR]:
        if directory.exists():
            shutil.rmtree(directory)
        directory.mkdir(parents=True, exist_ok=True)

    canonical = build_canonical_dataset()
    registry = train_models(canonical)
    predictions, _forecast_series, _actuals, metrics = generate_predictions(canonical, registry)
    generate_efficiency_data(registry)
    generate_evaluation_report(registry)
    generate_data_drift_report(canonical)
    generate_reasoning(predictions, metrics)
    manifest = finalize_release(canonical)
    return manifest


if __name__ == "__main__":
    run_pipeline()
