"""
run_pipeline.py - Master runner for the India Grain Price Forecasting pipeline.
Executes: Data -> Features -> Training -> Prediction -> Reasoning -> Dashboard JSON
"""
import os, sys, time

# Force UTF-8 output to avoid UnicodeEncodeError on Windows (cp1252 console)
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import OUTPUT_DIR, DASHBOARD_DATA, TARGET_GRAINS, FORECAST_HORIZONS


def check_dependencies():
    """Check required Python packages."""
    required = {
        "numpy": "numpy", "pandas": "pandas", "polars": "polars",
        "sklearn": "scikit-learn", "scipy": "scipy",
    }
    optional = {
        "lightgbm": "lightgbm", "xgboost": "xgboost",
        "catboost": "catboost", "optuna": "optuna",
        "google.generativeai": "google-generativeai",
    }
    missing_required = []
    for pkg, install_name in required.items():
        try:
            __import__(pkg)
        except ImportError:
            missing_required.append(install_name)

    if missing_required:
        print(f"[ERROR] Missing required packages: {missing_required}")
        print(f"   Install with: pip install {' '.join(missing_required)}")
        sys.exit(1)

    print("OK Core packages available")
    for pkg, install_name in optional.items():
        try:
            __import__(pkg)
            print(f"  OK {install_name}")
        except ImportError:
            print(f"  [WARNING] {install_name} not found (optional - some models will be skipped)")


def main(
    skip_training: bool = False,
    skip_reasoning: bool = False,
    do_tune: bool = True,
    incremental_train: bool = False,
):
    t0 = time.time()
    print("==============================================================")
    print("      INDIA GRAIN PRICE INTELLIGENCE - PIPELINE RUNNER        ")
    print("==============================================================")
    print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("==============================================================")

    check_dependencies()

    # -- Step 1: Data Pipeline ---------------------------------------------
    print("\n[STEP 1/5] Data Pipeline")
    from data_pipeline import run_pipeline
    national_daily, arrival_df = run_pipeline()
    print(f"  Elapsed: {(time.time()-t0)/60:.1f} min")

    # -- Step 2: Training --------------------------------------------------
    if incremental_train:
        print("\n[STEP 2/5] Incremental Model Training (Updating models with latest data)")
        from train_models import train_all
        all_bundles = train_all(national_daily, arrival_df, do_tune=False, incremental=True)
        print(f"  Elapsed: {(time.time()-t0)/60:.1f} min")
    elif not skip_training:
        print("\n[STEP 2/5] Model Training (this may take 20–40 min for full dataset)")
        from train_models import train_all
        all_bundles = train_all(national_daily, arrival_df, do_tune=do_tune, incremental=False)
        print(f"  Elapsed: {(time.time()-t0)/60:.1f} min")
    else:
        print("\n[STEP 2/5] Skipping training (using saved models)")
        all_bundles = {}

    # -- Step 3: Predictions ------------------------------------------------
    print("\n[STEP 3/5] Generating Predictions")
    from predict import run_predict
    predictions, actuals, forecast_series = run_predict(national_daily, arrival_df)
    print(f"  Elapsed: {(time.time()-t0)/60:.1f} min")

    # -- Step 4: Reasoning -------------------------------------------------
    if not skip_reasoning:
        print("\n[STEP 4/5] Generating AI Reasoning")
        from reasoning_engine import generate_all_reasoning
        reasoning = generate_all_reasoning(predictions, national_daily)
        print(f"  Elapsed: {(time.time()-t0)/60:.1f} min")
    else:
        print("\n[STEP 4/5] Skipping reasoning")
        reasoning = {}

    # -- Step 4b: Backtesting ----------------------------------------------------
    print("\n[STEP 4b/5] Generating Backtest Validation")
    try:
        from backtest import run_backtest
        run_backtest(national_daily, arrival_df)
    except Exception as e:
        print(f"  [WARNING] Backtest generation failed: {e}")

    # -- Step 5: Dashboard data check --------------------------------------
    print("\n[STEP 5/5] Dashboard Data Check")
    files_expected = ["predictions.json", "actuals.json", "forecast_series.json", "reasoning.json", "backtest.json"]
    all_ok = True
    for f in files_expected:
        path = os.path.join(DASHBOARD_DATA, f)
        if os.path.exists(path):
            size = os.path.getsize(path)
            print(f"  OK {f} ({size:,} bytes)")
        else:
            print(f"  ERR MISSING: {f}")
            all_ok = False

    total = (time.time() - t0) / 60
    if all_ok:
        print(f"\n[OK] Pipeline complete in {total:.1f} minutes")
    else:
        print(f"\n[WARNING] Pipeline completed with some errors in {total:.1f} minutes")
    print(f"\nOpen the dashboard:")
    print(f"   {os.path.join(os.path.dirname(__file__), 'dashboard', 'index.html')}")

    return {
        "national_daily": national_daily,
        "predictions":    predictions,
        "actuals":        actuals,
        "reasoning":      reasoning,
    }


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="India Grain Price Forecasting Pipeline")
    parser.add_argument("--skip-training",  action="store_true", help="Skip model training (use saved models)")
    parser.add_argument("--incremental-train", action="store_true", help="Update models incrementally using only new data")
    parser.add_argument("--skip-reasoning", action="store_true", help="Skip reasoning generation")
    parser.add_argument("--no-tune",        action="store_true", help="Skip Optuna hyperparameter tuning")
    args = parser.parse_args()

    main(
        skip_training  = args.skip_training,
        skip_reasoning = args.skip_reasoning,
        do_tune        = not args.no_tune,
        incremental_train = args.incremental_train,
    )
