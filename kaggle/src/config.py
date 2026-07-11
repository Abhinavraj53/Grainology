from __future__ import annotations

import os
from pathlib import Path


def env_bool(name: str, default: bool = False) -> bool:
    return str(os.environ.get(name, str(default))).strip().lower() in {"1", "true", "yes", "y"}


INPUT_ROOT = Path(os.environ.get("KAGGLE_INPUT_ROOT", "/kaggle/input"))
WORK_ROOT = Path(os.environ.get("KAGGLE_WORKING_DIR", "/kaggle/working"))
STAGING_DIR = WORK_ROOT / "release_staging"
RELEASE_DIR = WORK_ROOT / "release"
MODEL_DIR = STAGING_DIR / "models"

CANONICAL_PARQUET = STAGING_DIR / "canonical_daily.parquet"
CANONICAL_CSV = STAGING_DIR / "canonical_daily.csv"

TARGET_GRAINS = ["Wheat", "Paddy", "Maize", "Mustard"]
HORIZONS = [7, 30, 90]
CANONICAL_SCHEMA_VERSION = "2.0"
RELEASE_SCHEMA_VERSION = "2.0"
MODEL_MODE = "global_state_aware"

AGGREGATION_METHOD = os.environ.get("AGGREGATION_METHOD", "median").strip().lower() or "median"
FORCE_FULL_REBUILD = env_bool("FORCE_FULL_REBUILD", False)
FORCE_RETRAIN = env_bool("FORCE_RETRAIN", False)
AI_PREDICTION_BUCKET = os.environ.get("AI_PREDICTION_BUCKET", "ai-predictions")
MIN_STATE_OBSERVED_DAYS = int(os.environ.get("MIN_STATE_OBSERVED_DAYS", "240"))
MIN_VALIDATION_SAMPLES = int(os.environ.get("MIN_VALIDATION_SAMPLES", "20"))
MIN_MAPE_IMPROVEMENT = float(os.environ.get("MIN_MAPE_IMPROVEMENT", "0.01"))
FORECAST_HISTORY_DAYS = int(os.environ.get("FORECAST_HISTORY_DAYS", "365"))
EFFICIENCY_MAX_ROWS_PER_SERIES = int(os.environ.get("EFFICIENCY_MAX_ROWS_PER_SERIES", "0"))
MAX_TRAIN_ROWS_PER_MODEL = int(os.environ.get("MAX_TRAIN_ROWS_PER_MODEL", "250000"))
ENSEMBLE_PRUNE_RATIO = float(os.environ.get("ENSEMBLE_PRUNE_RATIO", "1.08"))
ENABLE_OPTUNA_TUNING = env_bool("ENABLE_OPTUNA_TUNING", False)
OPTUNA_TRIALS = int(os.environ.get("OPTUNA_TRIALS", "25"))
OPTUNA_TIMEOUT_SECONDS = int(os.environ.get("OPTUNA_TIMEOUT_SECONDS", "180"))

REQUIRED_RELEASE_FILES = [
    "manifest.json",
    "predictions.json",
    "actuals.json",
    "forecast_series.json",
    "historical_efficiency.json",
    "backtest.json",
    "reasoning.json",
    "states.json",
    "metrics.json",
    "canonical_daily.parquet",
    "canonical_daily.csv",
    "checksums.json",
]
