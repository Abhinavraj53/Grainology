# Grainology Commodity Forecasting: ML Engineering Case Study

## Problem

Indian commodity prices vary by date, state, district, and mandi. Grainology needed a forecasting system that could ingest changing public-market data, retain historical context, generate 7/30/90-day predictions, explain results to non-technical users, and update the website without taking the last successful forecast offline.

The resulting system covers four target grains and supports national, state, and mandi-level prediction contracts. The saved canonical release contains more than 205,000 daily aggregate observations spanning 2001-2026; every new run records its own exact row count and date range in the manifest.

## My Engineering Scope

- Built the canonical data layer that normalizes aliases, dates, states, grains, prices, arrivals, and market coverage from CSV, Parquet, and Supabase cache sources.
- Developed a state-aware ensemble forecasting pipeline with lag, rolling, momentum, volatility, arrival, market-coverage, seasonality, and national-relative features.
- Added CatBoost, LightGBM, XGBoost, tree ensembles, histogram gradient boosting, optional Optuna tuning, and a persistence baseline.
- Designed a leakage-safe model-selection protocol using chronological train/calibration/test windows and a horizon embargo between labels and evaluation dates.
- Implemented calibrated prediction intervals, state-level fallback behavior, and mandi-level sidecar artifacts without breaking the existing website schema.
- Built nearest-mandi selection with browser geolocation and Haversine distance, plus configurable transport and handling deductions for farm-gate estimates.
- Automated Kaggle execution, artifact validation, checksum verification, Supabase Storage publication, active-release switching, and last-good release fallback.
- Added Gemini-assisted plain-language reasoning while keeping numeric predictions and metrics deterministic and model-sourced.
- Added data-drift reports, champion/challenger release gates, frontend/backend contract tests, notebook reproducibility checks, and production builds in CI.

## Leakage-Safe Evaluation

The original dashboard-oriented evaluation used broad historical comparisons and was not strong enough for defensible ML claims. The upgraded protocol separates the concerns:

1. Features at origin date use only current or prior observations; rolling statistics are shifted before aggregation.
2. National lags are computed once on the date-indexed national series before being merged into state/mandi rows.
3. Imputation medians are learned from training rows only.
4. Training labels end before calibration begins, creating an embargo at least as long as the forecast horizon.
5. Optuna uses an inner temporal tuning window.
6. Ensemble weights are learned on calibration data.
7. Method promotion is decided on a later untouched holdout and must beat persistence across temporal sub-folds.
8. Selected models are refit on the complete dataset only after evaluation is finished.

Each run writes `evaluation_report.json`, including sample counts, date boundaries, fold wins, baseline MAPE, candidate MAPE, and selected method for each grain/state/horizon.

## MLOps And Reliability

The model publishes versioned JSON/CSV/Parquet artifacts rather than coupling the website to a running notebook. `manifest.json` records schema version, dates, grains, states, mandi coverage, checksums, and code version. Publication validates the bundle and compares it with the active champion before atomically switching the active Supabase release.

If training or publication fails, the API continues serving the previous active release. This prevents a notebook outage or malformed output from blanking the dashboard. Data drift is tracked separately from model error so stale coverage and distribution shifts can be diagnosed before retraining.

## Mandi And Farm-Gate Extension

The standalone mandi notebook preserves the state release and adds:

- `markets.json` for market identity, state, district, coverage, freshness, and coordinates when available.
- `market_predictions.json` for current and 7/30/90-day mandi prices with intervals and metrics.
- `market_actuals.json` and `market_forecast_series.json` for dashboard context.
- A full mandi-aware training mode, with a market-adjusted state fallback if runtime or history is insufficient.

The backend finds the nearest coordinate-bearing mandi and returns its distance. Farm-gate price is calculated as:

```text
farm_gate_price = mandi_price - (transport_base + distance_km * transport_rate + handling_cost)
```

These costs are configuration-driven estimates and are presented as such; they are not learned target labels.

## How To Report Results Honestly

Do not quote the older random/dashboard metrics as final model performance. Run the upgraded notebook, sync the release, and take the national weighted MAPE plus horizon-specific results from `evaluation_report.json`. Also report the date-based holdout and persistence baseline. This is more credible than presenting a single best-case percentage.

Suggested benchmark format:

```text
Temporal holdout: YYYY-MM-DD to YYYY-MM-DD
7-day MAPE: X.XX% (persistence: Y.YY%)
30-day MAPE: X.XX% (persistence: Y.YY%)
90-day MAPE: X.XX% (persistence: Y.YY%)
Coverage: N states, M mandis, K validation rows
```

## Resume Bullets

- Engineered an end-to-end commodity forecasting platform over 205K+ historical price observations, serving national/state/mandi-level 7, 30, and 90-day forecasts through React and Express APIs.
- Built leakage-safe temporal validation with horizon embargoes, calibration/test separation, persistence baselines, multi-fold promotion gates, and champion/challenger release checks for six tree-based model families.
- Automated daily Agmarknet-to-Supabase-to-Kaggle retraining and versioned artifact deployment with schema validation, SHA-256 checksums, drift monitoring, and zero-downtime last-good release fallback.
- Developed geolocation-based nearest-mandi forecasts and configurable farm-gate price estimates using Haversine distance plus transport/handling costs, with calibrated uncertainty intervals and Gemini-assisted explanations.

Replace `205K+` with the latest `actuals_row_count` and add measured temporal MAPE only after a successful upgraded run.

## Interview Talking Points

- Why random train/test splits are invalid for price forecasting.
- How the horizon embargo prevents target-label overlap.
- Why a persistence baseline is difficult to beat on smooth commodity series.
- Why model selection and final reporting require separate calibration and holdout windows.
- How immutable releases and active-pointer switching keep the website available during retraining.
- Why farm-gate deductions are transparent business assumptions rather than hidden ML predictions.
- Tradeoffs between a global state/mandi-aware model and one model per mandi.

## Next Experiments

- Join historical rainfall, temperature, and extreme-weather data by state/date, then retain it only if temporal permutation ablation improves the untouched holdout.
- Add mandi coordinates from an authoritative registry and measure nearest-market coverage.
- Segment error by state, crop season, volatility regime, and market-volume quantile.
- Add probabilistic interval coverage dashboards and automated recalibration alerts.
