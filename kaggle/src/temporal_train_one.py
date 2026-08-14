def _apply_fixed_ensemble(predictions: dict[str, np.ndarray], weights: dict[str, float]) -> None:
    members = [name for name in weights if name in predictions and name != "baseline"]
    if not members:
        predictions["ensemble"] = predictions["baseline"].copy()
        return
    values = np.vstack([predictions[name] for name in members])
    member_weights = np.asarray([float(weights[name]) for name in members], dtype=float)
    if not np.isfinite(member_weights).all() or member_weights.sum() <= 0:
        predictions["ensemble"] = predictions["baseline"].copy()
        return
    predictions["ensemble"] = np.average(values, axis=0, weights=member_weights)


def _bounded_bias_factor(actual: np.ndarray, predicted: np.ndarray) -> float:
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    valid = (actual > 0) & (predicted > 0) & np.isfinite(actual) & np.isfinite(predicted)
    if valid.sum() < 5:
        return 1.0
    factor = float(np.exp(np.median(np.log(actual[valid] / predicted[valid]))))
    max_bias = max(0.0, float(MAX_BIAS_CORRECTION_PCT)) / 100.0
    return float(np.clip(factor, 1.0 - max_bias, 1.0 + max_bias))


def _unfitted_copy(name: str, fitted: object) -> object:
    from sklearn.base import clone

    template = fitted[0] if name == "ridge" and isinstance(fitted, tuple) else fitted
    try:
        copied = clone(template)
    except Exception:
        params = template.get_params() if hasattr(template, "get_params") else {}
        copied = template.__class__(**params)
    if name == "xgboost" and hasattr(copied, "set_params"):
        updates = {"early_stopping_rounds": None}
        best_iteration = getattr(template, "best_iteration", None)
        if best_iteration is not None:
            updates["n_estimators"] = max(1, int(best_iteration) + 1)
        copied.set_params(**updates)
    return copied


def refit_selected_models(
    fitted_models: dict[str, object],
    data: pd.DataFrame,
    fill_values: dict[str, float],
    selected_methods: set[str],
    ensemble_weights: dict[str, float],
) -> dict[str, object]:
    if not REFIT_SELECTED_MODELS_ON_FULL_DATA:
        return fitted_models

    required = {name for name in selected_methods if name not in {"baseline", "ensemble"}}
    if "ensemble" in selected_methods:
        required.update(name for name in ensemble_weights if name != "baseline")
    if not required:
        return {}

    fit_data = data
    if MAX_TRAIN_ROWS_PER_MODEL > 0 and len(fit_data) > MAX_TRAIN_ROWS_PER_MODEL:
        fit_data = fit_data.sample(MAX_TRAIN_ROWS_PER_MODEL, random_state=2026).sort_values("date")
    X_full = fill_features(fit_data[FEATURE_COLUMNS], fill_values)
    y_full = fit_data["target_log_return"]
    refitted = {}
    for name in sorted(required):
        if name not in fitted_models:
            continue
        try:
            refitted[name] = _fit_model(name, _unfitted_copy(name, fitted_models[name]), X_full, y_full)
        except Exception as exc:
            print(f"Production refit skipped ({name}): {type(exc).__name__}: {str(exc)[:140]}")
            refitted[name] = fitted_models[name]
    return refitted


def train_one(features: pd.DataFrame, grain: str, horizon: int, transparent: bool = False) -> dict | None:
    raw = features[features["grain"].eq(grain)].copy()
    if TRAINING_SCOPE == "national":
        raw = raw[raw["state_name"].eq("All States")].copy()
    counts = raw.groupby("state_name")["date"].count()
    serving_eligible_states = set(counts[counts >= MIN_STATE_OBSERVED_DAYS].index)
    if transparent:
        print(f"\n[{grain} | {horizon}d] feature rows: {len(raw):,}; series: {counts.size}", flush=True)
        print(f"  {len(serving_eligible_states)} series pass the serving-history gate", flush=True)
    if raw.empty:
        return None

    data = align_future_targets(raw, horizon)
    if transparent:
        survival = len(data) / max(len(raw), 1) * 100
        offsets = data["target_match_error_days"].value_counts().sort_index().to_dict() if not data.empty else {}
        print(f"  tolerance-aligned supervised rows: {len(data):,} ({survival:.1f}% survival); offsets={offsets}", flush=True)
    if len(data) < MIN_VALIDATION_SAMPLES * 4:
        return None

    latest_origin_date = pd.Timestamp(data["date"].max()).normalize()
    holdout_cutoff = latest_origin_date - pd.Timedelta(days=max(90, EVALUATION_HOLDOUT_DAYS) - 1)
    if len(data[data["date"] >= holdout_cutoff]) < MIN_VALIDATION_SAMPLES:
        holdout_ratio = min(0.35, max(0.10, EVALUATION_HOLDOUT_RATIO))
        holdout_cutoff = pd.Timestamp(data["date"].quantile(1.0 - holdout_ratio)).normalize()
    development = data[data["date"] < holdout_cutoff].copy()
    calibration_cutoff = holdout_cutoff - pd.Timedelta(days=max(90, ENSEMBLE_CALIBRATION_DAYS))
    if len(development[development["date"] >= calibration_cutoff]) < MIN_VALIDATION_SAMPLES:
        calibration_ratio = min(0.45, max(0.15, ENSEMBLE_CALIBRATION_RATIO))
        calibration_cutoff = pd.Timestamp(development["date"].quantile(1.0 - calibration_ratio)).normalize()

    pre_embargo_train = data[data["date"] < calibration_cutoff]
    train = data[
        (data["date"] < calibration_cutoff)
        & (data["actual_target_date"] < calibration_cutoff)
    ].copy()
    pre_embargo_calibration = data[
        (data["date"] >= calibration_cutoff)
        & (data["date"] < holdout_cutoff)
    ]
    calibration = data[
        (data["date"] >= calibration_cutoff)
        & (data["date"] < holdout_cutoff)
        & (data["actual_target_date"] < holdout_cutoff)
    ].copy()
    holdout = data[data["date"] >= holdout_cutoff].copy()
    embargo_removed = (len(pre_embargo_train) - len(train)) + (len(pre_embargo_calibration) - len(calibration))

    if transparent:
        print(
            f"  chronological split: train={len(train):,}, calibration={len(calibration):,}, "
            f"final holdout={len(holdout):,}, embargo removed={embargo_removed:,}",
            flush=True,
        )
        print(
            f"  train ends {train['date'].max().date()} | calibration starts {calibration['date'].min().date()} "
            f"| final holdout starts {holdout['date'].min().date()}",
            flush=True,
        )

    if (
        len(train) < MIN_VALIDATION_SAMPLES * 3
        or len(calibration) < MIN_VALIDATION_SAMPLES
        or len(holdout) < MIN_VALIDATION_SAMPLES
    ):
        return None

    evaluation_fill_values = (
        train[FEATURE_COLUMNS]
        .replace([np.inf, -np.inf], np.nan)
        .median(numeric_only=True)
        .fillna(0)
        .to_dict()
    )
    fitted_models = train_candidate_models(
        train,
        calibration,
        horizon,
        evaluation_fill_values,
        transparent=transparent,
    )

    calibration_predictions = predict_candidate_prices(
        fitted_models, calibration, evaluation_fill_values, horizon
    )
    ensemble_pred, ensemble_weights = weighted_ensemble(
        calibration_predictions,
        calibration["target_price"].to_numpy(dtype=float),
    )
    calibration_predictions["ensemble"] = ensemble_pred

    holdout_predictions = predict_candidate_prices(
        fitted_models, holdout, evaluation_fill_values, horizon
    )
    _apply_fixed_ensemble(holdout_predictions, ensemble_weights)

    gates: dict[str, dict] = {}
    calibration_series = {
        name: pd.Series(prediction, index=calibration.index)
        for name, prediction in calibration_predictions.items()
    }

    for state, state_calibration in calibration.groupby("state_name", sort=False):
        idx = state_calibration.index
        actual = state_calibration["target_price"].to_numpy(dtype=float)
        current = state_calibration["price"].to_numpy(dtype=float)
        method_bias_factors = {}
        calibrated_state_predictions = {}
        for name, series in calibration_series.items():
            raw_prediction = series.loc[idx].to_numpy(dtype=float)
            factor = 1.0 if name == "baseline" else _bounded_bias_factor(actual, raw_prediction)
            method_bias_factors[name] = factor
            calibrated_state_predictions[name] = horizon_clip(
                current,
                raw_prediction * factor,
                horizon,
            )
        method_scores = {
            name: mape(actual, prediction)
            for name, prediction in calibrated_state_predictions.items()
        }
        method_maes = {
            name: mae(actual, prediction)
            for name, prediction in calibrated_state_predictions.items()
        }
        baseline_pred = calibrated_state_predictions["baseline"]
        baseline_error = np.abs(baseline_pred - actual) / np.maximum(np.abs(actual), 1e-9) * 100
        robust_gate = {}
        passing = []

        for method, score in method_scores.items():
            if method == "baseline" or not np.isfinite(score):
                continue
            candidate_pred = calibrated_state_predictions[method]
            candidate_error = np.abs(candidate_pred - actual) / np.maximum(np.abs(actual), 1e-9) * 100
            improvement = baseline_error - candidate_error
            lower_bound = _bootstrap_lower_bound(
                improvement,
                seed=abs(hash((grain, horizon, state, method))) % (2**32),
            )
            fold_wins, fold_count, fold_means = _fold_diagnostics(
                state_calibration["actual_target_date"], baseline_error, candidate_error
            )
            required_wins = max(1, math.ceil(fold_count * MIN_TEMPORAL_FOLD_WIN_RATIO))
            absolute_gain = method_scores["baseline"] - score
            relative_gain = absolute_gain / max(method_scores["baseline"], 1e-9)
            passed = (
                lower_bound > MIN_MAPE_IMPROVEMENT
                and relative_gain >= MIN_RELATIVE_MAPE_IMPROVEMENT
                and fold_wins >= required_wins
            )
            robust_gate[method] = {
                "bootstrap_lower_improvement_pp": round(float(lower_bound), 4) if np.isfinite(lower_bound) else None,
                "absolute_mape_gain_pp": round(float(absolute_gain), 4),
                "relative_mape_gain": round(float(relative_gain), 6),
                "fold_wins": int(fold_wins),
                "fold_count": int(fold_count),
                "required_fold_wins": int(required_wins),
                "fold_mean_improvements_pp": [round(float(value), 4) for value in fold_means],
                "passed": bool(passed),
            }
            if passed:
                passing.append(method)

        selected = "baseline"
        reason = "no_calibration_candidate_passed"
        if state not in serving_eligible_states:
            reason = "thin_series_history"
        elif len(state_calibration) < MIN_VALIDATION_SAMPLES:
            reason = "insufficient_calibration"
        elif passing:
            selected = min(passing, key=lambda method: method_scores[method])
            if (
                "ensemble" in passing
                and method_scores["ensemble"] <= method_scores[selected] * DASHBOARD_ENSEMBLE_PREFERENCE_MARGIN
            ):
                selected = "ensemble"
            reason = "temporal_calibration_gate_passed"

        selected_calibration = calibrated_state_predictions[selected]
        radius = _conformal_radius(actual, selected_calibration)
        gates[state] = {
            "selected_method": selected,
            "candidate_method": min(
                (method for method in method_scores if method != "baseline"),
                key=lambda method: method_scores[method],
                default="baseline",
            ),
            "reason": reason,
            "selection_sample_count": int(len(state_calibration)),
            "selection_method_mapes": {
                name: round(float(score), 4)
                for name, score in method_scores.items()
                if np.isfinite(score)
            },
            "selection_method_maes": {
                name: round(float(score), 4)
                for name, score in method_maes.items()
                if np.isfinite(score)
            },
            "method_bias_factors": {
                name: round(float(factor), 8)
                for name, factor in method_bias_factors.items()
            },
            "price_bias_factor": round(float(method_bias_factors.get(selected, 1.0)), 8),
            "bias_calibration_method": "bounded_median_log_residual",
            "ensemble_weights": ensemble_weights,
            "robust_gate": robust_gate,
            "validation_strategy": "horizon_embargo_temporal_holdout",
            "training_end_date": train["date"].max().date().isoformat(),
            "calibration_start_date": calibration["date"].min().date().isoformat(),
            "calibration_end_date": calibration["date"].max().date().isoformat(),
            "validation_start_date": holdout["date"].min().date().isoformat(),
            "target_embargo_days": int(horizon),
            "conformal_alpha": CONFORMAL_ALPHA,
            "conformal_log_radius": round(float(radius), 8),
            "interval_sample_count": int(len(state_calibration)),
            "interval_coverage_target": round(1.0 - CONFORMAL_ALPHA, 2),
        }

    validation_rows: list[dict] = []
    holdout_series = {
        name: pd.Series(prediction, index=holdout.index)
        for name, prediction in holdout_predictions.items()
    }
    holdout_evaluated_series = {
        name: series.copy()
        for name, series in holdout_series.items()
    }
    for state, state_holdout in holdout.groupby("state_name", sort=False):
        idx = state_holdout.index
        actual = state_holdout["target_price"].to_numpy(dtype=float)
        current = state_holdout["price"].to_numpy(dtype=float)
        gate = gates.setdefault(state, {
            "selected_method": "baseline",
            "reason": "missing_calibration_series",
            "selection_sample_count": 0,
            "selection_method_mapes": {},
            "selection_method_maes": {},
            "ensemble_weights": ensemble_weights,
            "robust_gate": {},
            "validation_strategy": "horizon_embargo_temporal_holdout",
            "conformal_log_radius": float(np.log(1.25)),
            "interval_sample_count": 0,
            "interval_coverage_target": round(1.0 - CONFORMAL_ALPHA, 2),
        })
        selected = gate.get("selected_method", "baseline")
        if selected not in holdout_series:
            selected = "baseline"
            gate["selected_method"] = selected
            gate["reason"] = "selected_model_unavailable_on_holdout"

        method_bias_factors = gate.get("method_bias_factors") or {}
        for name, series in holdout_series.items():
            factor = 1.0 if name == "baseline" else float(method_bias_factors.get(name, 1.0))
            adjusted = horizon_clip(current, series.loc[idx].to_numpy(dtype=float) * factor, horizon)
            holdout_evaluated_series[name].loc[idx] = adjusted
        holdout_mapes = {
            name: mape(actual, series.loc[idx].to_numpy(dtype=float))
            for name, series in holdout_evaluated_series.items()
        }
        holdout_maes = {
            name: mae(actual, series.loc[idx].to_numpy(dtype=float))
            for name, series in holdout_evaluated_series.items()
        }
        selected_pred = holdout_evaluated_series[selected].loc[idx].to_numpy(dtype=float)
        radius = float(gate.get("conformal_log_radius") or np.log(1.25))
        lower = selected_pred * np.exp(-radius)
        upper = selected_pred * np.exp(radius)
        coverage = float(np.mean((actual >= lower) & (actual <= upper))) if len(actual) else math.nan
        selected_mape = holdout_mapes.get(selected, math.inf)

        gate.update({
            "sample_count": int(len(state_holdout)),
            "baseline_mape": round(float(holdout_mapes.get("baseline", math.inf)), 4),
            "baseline_mae": round(float(holdout_maes.get("baseline", math.inf)), 4),
            "ml_mape": round(float(selected_mape), 4) if np.isfinite(selected_mape) else None,
            "ml_mae": round(float(holdout_maes.get(selected, math.nan)), 4) if np.isfinite(holdout_maes.get(selected, math.nan)) else None,
            "method_mapes": {
                name: round(float(score), 4)
                for name, score in holdout_mapes.items()
                if np.isfinite(score)
            },
            "method_maes": {
                name: round(float(score), 4)
                for name, score in holdout_maes.items()
                if np.isfinite(score)
            },
            "holdout_interval_coverage": round(coverage, 4) if np.isfinite(coverage) else None,
            "empirical_interval_coverage": round(coverage, 4) if np.isfinite(coverage) else None,
            "accuracy_target_mape": ACCURACY_TARGET_MAPE,
            "within_accuracy_target": bool(np.isfinite(selected_mape) and selected_mape <= ACCURACY_TARGET_MAPE),
        })

        for position, (_, row) in enumerate(state_holdout.iterrows()):
            item = row_payload(
                row,
                float(selected_pred[position]),
                selected,
                float(lower[position]),
                float(upper[position]),
            )
            item["evaluation_scope"] = "final_untouched_temporal_holdout"
            validation_rows.append(item)

    actual_all = holdout["target_price"].to_numpy(dtype=float)
    scale = float(
        train.sort_values(["state_name", "actual_target_date"])
        .groupby("state_name")["target_price"]
        .diff()
        .abs()
        .mean()
    )
    evaluated_holdout_predictions = {
        name: series.loc[holdout.index].to_numpy(dtype=float)
        for name, series in holdout_evaluated_series.items()
    }
    global_method_mapes = {
        name: round(mape(actual_all, prediction), 4)
        for name, prediction in evaluated_holdout_predictions.items()
    }
    global_method_mae = {
        name: round(mae(actual_all, prediction), 4)
        for name, prediction in evaluated_holdout_predictions.items()
    }
    global_method_mase = {
        name: round(mase(actual_all, prediction, scale), 4)
        for name, prediction in evaluated_holdout_predictions.items()
    }

    if transparent:
        score_preview = pd.DataFrame({
            "method": list(global_method_mapes),
            "final_holdout_MAPE_pct": list(global_method_mapes.values()),
            "final_holdout_MAE": [global_method_mae[name] for name in global_method_mapes],
            "final_holdout_MASE": [global_method_mase[name] for name in global_method_mapes],
        }).sort_values(["final_holdout_MAPE_pct", "final_holdout_MAE"])
        try:
            from IPython.display import display
            display(score_preview)
        except Exception:
            print(score_preview.to_string(index=False))

    production_fill_values = (
        data[FEATURE_COLUMNS]
        .replace([np.inf, -np.inf], np.nan)
        .median(numeric_only=True)
        .fillna(0)
        .to_dict()
    )
    selected_methods = {gate.get("selected_method", "baseline") for gate in gates.values()}
    production_models = refit_selected_models(
        fitted_models,
        data,
        production_fill_values,
        selected_methods,
        ensemble_weights,
    )

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODEL_DIR / f"ensemble_{grain.lower()}_{horizon}d.pkl"
    with model_path.open("wb") as handle:
        pickle.dump({
            "models": production_models,
            "feature_fill_values": production_fill_values,
            "ensemble_weights": ensemble_weights,
            "horizon": horizon,
            "validation_strategy": "horizon_embargo_temporal_holdout",
        }, handle)

    return {
        "grain": grain,
        "horizon": horizon,
        "models": production_models,
        "model_path": str(model_path.name),
        "feature_columns": FEATURE_COLUMNS,
        "feature_fill_values": production_fill_values,
        "ensemble_weights": ensemble_weights,
        "gates": gates,
        "history_rows": [],
        "validation_rows": validation_rows,
        "efficiency_rows": validation_rows,
        "latest_training_date": data["date"].max().date().isoformat(),
        "global_method_mapes": global_method_mapes,
        "global_method_mae": global_method_mae,
        "global_method_mase": global_method_mase,
        "evaluation_strategy": "horizon_embargo_temporal_holdout",
        "split_info": {
            "training_end_date": train["date"].max().date().isoformat(),
            "calibration_start_date": calibration["date"].min().date().isoformat(),
            "calibration_end_date": calibration["date"].max().date().isoformat(),
            "validation_start_date": holdout["date"].min().date().isoformat(),
            "train_rows": int(len(train)),
            "calibration_rows": int(len(calibration)),
            "validation_rows": int(len(holdout)),
            "serving_eligible_states": int(len(serving_eligible_states)),
            "training_states": int(counts.size),
            "supervised_rows": int(len(data)),
            "raw_feature_rows": int(len(raw)),
            "target_match_tolerance_days": TARGET_MATCH_TOLERANCE_DAYS,
            "evaluation_holdout_days": int(EVALUATION_HOLDOUT_DAYS),
            "ensemble_calibration_days": int(ENSEMBLE_CALIBRATION_DAYS),
            "max_bias_correction_pct": float(MAX_BIAS_CORRECTION_PCT),
            "embargo_removed_rows": int(embargo_removed),
            "validation_strategy": "horizon_embargo_temporal_holdout",
            "target_match_offsets": {
                str(key): int(value)
                for key, value in data["target_match_error_days"].value_counts().sort_index().items()
            },
        },
    }
