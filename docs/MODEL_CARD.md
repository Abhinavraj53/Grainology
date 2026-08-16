# Grainology Forecasting Model Card

## Intended Use

Grainology provides decision-support estimates for Wheat, Paddy, Maize, and Mustard prices at 7, 30, and 90-day horizons. Outputs support national, state, and mandi views. Farm-gate values are transparent deductions from mandi forecasts, not separately learned prices.

## Data

- Historical Agmarknet-compatible CSV and Parquet files
- Incremental live/cache rows stored in Supabase
- Price, arrival, market coverage, geography, variety, and grade fields when available
- Canonical daily aggregates with source priority and freshness metadata

Every release records its row count, latest date, states, grains, and checksums in `manifest.json`.

## Features And Models

- Lagged prices and returns
- Shifted rolling level, momentum, and volatility features
- Arrival and market-coverage features
- Calendar, seasonal, and Fourier features
- National-relative and state-aware features
- CatBoost, LightGBM, XGBoost, histogram gradient boosting, tree ensembles, Ridge, and persistence candidates

The production showcase profile uses fixed candidate configurations for reliable scheduled execution. The research profile enables Optuna and full global mandi-aware retraining for manual experiments.

## Evaluation

- Chronological training, calibration, and untouched holdout windows
- Horizon-length embargo between training labels and later windows
- Imputation learned from training rows only
- Persistence baseline for every served series
- Promotion only after temporal-fold improvement checks
- Split-conformal intervals calibrated before the final holdout

Final claims must come from `evaluation_report.json`, not random splits or the historical chart.

## Reliability

- Required artifact/schema validation
- SHA-256 release checksums
- Data freshness and drift reports
- Champion/challenger publication gate
- Atomic active-release switching
- Last-good release remains online if retraining fails

## Limitations

- Public-market data may be delayed, sparse, revised, or inconsistent across mandis.
- Weather, policy, quality, storage, and local demand shocks are not guaranteed to be represented.
- Mandi coordinates may be missing; nearest-mandi selection then falls back safely.
- Transport and handling costs are configurable averages and can differ from a farmer's actual costs.
- Forecasts are decision support, not guaranteed sale prices or financial advice.

## Monitoring

Track temporal MAPE/MAE against persistence, interval coverage, data freshness, state/mandi coverage, drift warnings, release failures, and fallback frequency.
