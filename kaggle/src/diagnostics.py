from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

try:
    import matplotlib.pyplot as plt
except Exception:
    plt = None

from .config import HORIZONS, RELEASE_DIR, STAGING_DIR, TARGET_GRAINS


def display_frame(frame: pd.DataFrame, rows: int = 20):
    try:
        from IPython.display import display
        display(frame.head(rows))
    except Exception:
        print(frame.head(rows).to_string(index=False))


def print_section(title: str) -> None:
    print("\n" + "=" * 90)
    print(title)
    print("=" * 90)


def canonical_summary(canonical: pd.DataFrame) -> pd.DataFrame:
    print_section("Canonical Dataset Summary")
    frame = canonical.copy()
    frame["date"] = pd.to_datetime(frame["date"])
    summary = pd.DataFrame([{
        "rows": len(frame),
        "min_date": frame["date"].min().date().isoformat(),
        "max_date": frame["date"].max().date().isoformat(),
        "grains": frame["grain"].nunique(),
        "states": frame["state_name"].nunique(),
        "observed_rows": int(frame["is_observed"].fillna(False).sum()) if "is_observed" in frame else None,
    }])
    display_frame(summary)

    by_grain = (
        frame.groupby("grain")
        .agg(rows=("price", "size"), min_date=("date", "min"), max_date=("date", "max"), states=("state_name", "nunique"), avg_price=("price", "mean"))
        .reset_index()
    )
    by_grain["min_date"] = by_grain["min_date"].dt.date.astype(str)
    by_grain["max_date"] = by_grain["max_date"].dt.date.astype(str)
    by_grain["avg_price"] = by_grain["avg_price"].round(2)
    print("\nRows by grain")
    display_frame(by_grain, rows=50)

    latest_date = frame["date"].max()
    latest_rows = frame[frame["date"].eq(latest_date)].groupby("grain").agg(rows=("price", "size"), states=("state_name", "nunique")).reset_index()
    print(f"\nLatest canonical date: {latest_date.date().isoformat()}")
    display_frame(latest_rows, rows=50)
    return by_grain


def recent_data_summary(canonical: pd.DataFrame, days: int = 14) -> pd.DataFrame:
    print_section(f"Recently Added / Latest {days} Days")
    frame = canonical.copy()
    frame["date"] = pd.to_datetime(frame["date"])
    cutoff = frame["date"].max() - pd.Timedelta(days=days - 1)
    recent = frame[frame["date"].ge(cutoff)]
    summary = (
        recent.groupby(["date", "grain"])
        .agg(rows=("price", "size"), states=("state_name", "nunique"), avg_price=("price", "mean"), observed=("is_observed", "sum"))
        .reset_index()
        .sort_values(["date", "grain"], ascending=[False, True])
    )
    summary["date"] = summary["date"].dt.date.astype(str)
    summary["avg_price"] = summary["avg_price"].round(2)
    display_frame(summary, rows=days * len(TARGET_GRAINS))
    return summary


def missingness_summary(canonical: pd.DataFrame) -> pd.DataFrame:
    print_section("Missingness / Data Quality")
    cols = ["price", "price_low", "price_high", "arrival", "market_count", "source", "is_observed"]
    available = [col for col in cols if col in canonical.columns]
    summary = pd.DataFrame({
        "column": available,
        "missing_pct": [round(float(canonical[col].isna().mean() * 100), 2) for col in available],
        "non_null": [int(canonical[col].notna().sum()) for col in available],
    })
    display_frame(summary, rows=50)
    duplicate_count = int(canonical.duplicated(["date", "state_name", "grain"]).sum())
    print(f"Duplicate date/state/grain rows: {duplicate_count}")
    return summary


def plot_history(canonical: pd.DataFrame, states: list[str] | None = None, grains: list[str] | None = None) -> None:
    print_section("Historical Price Trend")
    if plt is None:
        print("matplotlib is not available; skipping plots.")
        return
    frame = canonical.copy()
    frame["date"] = pd.to_datetime(frame["date"])
    states = states or ["All States"]
    grains = grains or TARGET_GRAINS
    plot_df = frame[frame["state_name"].isin(states) & frame["grain"].isin(grains)].sort_values("date")
    if plot_df.empty:
        print("No rows available for requested history plot.")
        return
    fig, axes = plt.subplots(len(grains), 1, figsize=(14, 3.2 * len(grains)), sharex=True)
    axes = np.atleast_1d(axes)
    for axis, grain in zip(axes, grains):
        grain_df = plot_df[plot_df["grain"].eq(grain)]
        for state, state_df in grain_df.groupby("state_name"):
            axis.plot(state_df["date"], state_df["price"], linewidth=1.4, label=state)
        axis.set_title(f"{grain} price trend")
        axis.set_ylabel("Price")
        axis.grid(alpha=0.25)
        axis.legend(loc="upper left")
    plt.tight_layout()
    plt.show()


def plot_recent_history(canonical: pd.DataFrame, days: int = 365, state: str = "All States") -> None:
    print_section(f"Recent {days}-Day Trend: {state}")
    if plt is None:
        print("matplotlib is not available; skipping plots.")
        return
    frame = canonical.copy()
    frame["date"] = pd.to_datetime(frame["date"])
    cutoff = frame["date"].max() - pd.Timedelta(days=days)
    frame = frame[frame["date"].ge(cutoff) & frame["state_name"].eq(state)]
    if frame.empty:
        print("No recent rows available.")
        return
    pivot = frame.pivot_table(index="date", columns="grain", values="price", aggfunc="median").sort_index()
    pivot.plot(figsize=(14, 5), linewidth=1.7, title=f"{state}: recent price trend")
    plt.grid(alpha=0.25)
    plt.ylabel("Price")
    plt.tight_layout()
    plt.show()


def training_summary(registry: dict) -> pd.DataFrame:
    print_section("Training / Model Selection Summary")
    rows = []
    for grain, horizons in registry.get("models", {}).items():
        for horizon, trained in horizons.items():
            gates = trained.get("gates", {})
            method_counts = pd.Series([gate.get("selected_method", "unknown") for gate in gates.values()]).value_counts().to_dict()
            mapes = [
                gate.get("ml_mape")
                for gate in gates.values()
                if gate.get("ml_mape") is not None and np.isfinite(gate.get("ml_mape"))
            ]
            rows.append({
                "grain": grain,
                "horizon": int(horizon),
                "candidate_models": ", ".join(trained.get("models", {}).keys()),
                "states": len(gates),
                "method_counts": method_counts,
                "median_selected_mape": round(float(np.median(mapes)), 3) if mapes else None,
                "mean_selected_mape": round(float(np.mean(mapes)), 3) if mapes else None,
            })
    summary = pd.DataFrame(rows).sort_values(["grain", "horizon"]) if rows else pd.DataFrame()
    display_frame(summary, rows=100)
    return summary


def method_leaderboard(registry: dict, top: int = 40) -> pd.DataFrame:
    print_section("Per-State Method Leaderboard")
    rows = []
    for grain, horizons in registry.get("models", {}).items():
        for horizon, trained in horizons.items():
            for state, gate in trained.get("gates", {}).items():
                method_mapes = gate.get("method_mapes") or {}
                best_method = min(method_mapes, key=method_mapes.get) if method_mapes else gate.get("selected_method")
                rows.append({
                    "grain": grain,
                    "horizon": int(horizon),
                    "state": state,
                    "selected_method": gate.get("selected_method"),
                    "best_method": best_method,
                    "selected_mape": gate.get("ml_mape"),
                    "baseline_mape": gate.get("baseline_mape"),
                    "sample_count": gate.get("sample_count"),
                    "all_method_mapes": method_mapes,
                })
    leaderboard = pd.DataFrame(rows)
    if leaderboard.empty:
        print("No leaderboard rows available.")
        return leaderboard
    leaderboard = leaderboard.sort_values(["grain", "horizon", "selected_mape"], na_position="last")
    display_frame(leaderboard, rows=top)
    return leaderboard


def validation_rows_summary(registry: dict) -> pd.DataFrame:
    print_section("Validation Rows Summary")
    rows = pd.DataFrame(registry.get("validation_rows", []))
    if rows.empty:
        print("No validation rows available.")
        return rows
    rows["error_pct"] = (rows["predicted_price"] - rows["actual_price"]).abs() / rows["actual_price"].replace(0, np.nan) * 100
    rows["abs_error"] = (rows["predicted_price"] - rows["actual_price"]).abs()
    summary = (
        rows.groupby(["grain", "horizon", "method"])
        .agg(rows=("actual_price", "size"), mape=("error_pct", "mean"), mae=("abs_error", "mean"))
        .reset_index()
    )
    summary["mape"] = summary["mape"].round(3)
    summary["mae"] = summary["mae"].round(2)
    display_frame(summary.sort_values(["grain", "horizon", "mape"]), rows=100)
    return rows


def plot_validation_fit(registry: dict, grain: str = "Wheat", state: str = "All States", horizon: int = 7) -> None:
    print_section(f"Validation Fit Plot: {grain} / {state} / {horizon}d")
    if plt is None:
        print("matplotlib is not available; skipping plots.")
        return
    rows = pd.DataFrame(registry.get("validation_rows", []))
    if rows.empty:
        print("No validation rows available.")
        return
    rows = rows[
        rows["grain"].eq(grain)
        & rows["state_name"].eq(state)
        & rows["horizon"].eq(horizon)
    ].copy()
    if rows.empty:
        print("No matching validation rows.")
        return
    rows["target_date"] = pd.to_datetime(rows["target_date"])
    rows = rows.sort_values("target_date")
    plt.figure(figsize=(14, 5))
    plt.plot(rows["target_date"], rows["actual_price"], label="Actual", linewidth=2)
    plt.plot(rows["target_date"], rows["predicted_price"], label="Predicted", linewidth=1.7)
    plt.title(f"{grain} {state} {horizon}d validation fit")
    plt.ylabel("Price")
    plt.grid(alpha=0.25)
    plt.legend()
    plt.tight_layout()
    plt.show()


def efficiency_summary(efficiency: dict) -> pd.DataFrame:
    print_section("Historical Efficiency / Backtest Summary")
    rows = []
    for grain, states in efficiency.items():
        for state, horizons in states.items():
            for horizon, payload in horizons.items():
                metric = payload.get("metrics", {})
                rows.append({
                    "grain": grain,
                    "state": state,
                    "horizon": int(horizon),
                    "sample_count": metric.get("sample_count"),
                    "mape": metric.get("mape"),
                    "mae": metric.get("mae"),
                    "rmse": metric.get("rmse"),
                    "wape": metric.get("wape"),
                })
    summary = pd.DataFrame(rows)
    if summary.empty:
        print("No efficiency rows available.")
        return summary
    display_frame(summary.sort_values(["grain", "horizon", "mape"], na_position="last"), rows=100)
    return summary


def plot_efficiency_series(efficiency: dict, grain: str = "Wheat", state: str = "All States", horizon: int = 7, tail: int = 365) -> None:
    print_section(f"Efficiency Series Plot: {grain} / {state} / {horizon}d")
    if plt is None:
        print("matplotlib is not available; skipping plots.")
        return
    payload = efficiency.get(grain, {}).get(state, {}).get(str(horizon), {})
    series = pd.DataFrame(payload.get("series", []))
    if series.empty:
        print("No efficiency series for this selection.")
        return
    series["date"] = pd.to_datetime(series["date"])
    series = series.sort_values("date").tail(tail)
    plt.figure(figsize=(14, 5))
    plt.plot(series["date"], series["actual_price"], label="Actual", linewidth=2)
    plt.plot(series["date"], series["predicted_price"], label="Predicted", linewidth=1.5)
    plt.title(f"{grain} {state} {horizon}d efficiency, last {tail} rows")
    plt.grid(alpha=0.25)
    plt.legend()
    plt.tight_layout()
    plt.show()


def release_file_summary() -> pd.DataFrame:
    print_section("Release File Validation")
    files = sorted(path for path in RELEASE_DIR.iterdir() if path.is_file())
    summary = pd.DataFrame([{
        "file": path.name,
        "size_mb": round(path.stat().st_size / (1024 * 1024), 3),
    } for path in files])
    display_frame(summary, rows=100)

    manifest_path = RELEASE_DIR / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        print("\nManifest core:")
        display_frame(pd.DataFrame([{
            "run_id": manifest.get("run_id"),
            "generated_at": manifest.get("generated_at"),
            "data_latest_date": manifest.get("data_latest_date"),
            "actuals_row_count": manifest.get("actuals_row_count"),
            "states": len(manifest.get("states", [])),
            "grains": ", ".join(manifest.get("grains", [])),
        }]))
    return summary


def inspect_prediction_output(grain: str = "Wheat", state: str = "All States") -> dict:
    print_section(f"Prediction Output Inspection: {grain} / {state}")
    path = RELEASE_DIR / "predictions.json"
    if not path.exists():
        print("predictions.json not found.")
        return {}
    predictions = json.loads(path.read_text(encoding="utf-8"))
    payload = predictions.get(grain, {}).get(state, {})
    print(json.dumps(payload, indent=2)[:4000])
    return payload
