# Mandi-Level AI Prediction Contract

This upgrade keeps the existing state-wise AI release files working and adds optional mandi-level sidecar files.

## Notebook Output

The mandi notebook should still write all existing files:

- `manifest.json`
- `predictions.json`
- `actuals.json`
- `forecast_series.json`
- `historical_efficiency.json`
- `backtest.json`
- `reasoning.json`
- `states.json`
- `metrics.json`
- `canonical_daily.csv`
- `canonical_daily.parquet`
- `checksums.json`

It may additionally write:

- `markets.json`
- `market_predictions.json`
- `market_forecast_series.json`
- `market_actuals.json`
- `market_reasoning.json`
- `market_metrics.json`
- `market_canonical_daily.csv`
- `market_canonical_daily.parquet`

`market_predictions.json` shape:

```json
{
  "Wheat": {
    "bihar-patna-patna-market-abc123": {
      "market_key": "bihar-patna-patna-market-abc123",
      "market_name": "Patna",
      "district": "Patna",
      "state": "Bihar",
      "lat": 25.61,
      "lng": 85.14,
      "prediction": {
        "current_price": 2500,
        "farm_gate_current_price": 2440,
        "last_actual_date": "2026-07-11",
        "horizons": {
          "7": {
            "target_date": "2026-07-18",
            "predicted_price": 2525,
            "farm_gate_predicted_price": 2465,
            "metrics": { "mape": 2.1, "mae": 42, "sample_count": 120 }
          }
        }
      }
    }
  }
}
```

## Runtime Modes

Default mode performs one global mandi-aware training pass per grain and horizon, with each mandi represented as a market series:

```env
ENABLE_MANDI_LEVEL_RELEASE=true
ENABLE_MANDI_LEVEL_FULL_TRAINING=true
```

In this mode, the notebook:

- trains the existing state/national model exactly as before
- trains a global mandi-aware model for eligible markets
- uses horizon-embargoed temporal validation and per-mandi promotion gates
- writes mandi-level sidecar files while preserving the state-wise contract

For a quick presentation run, full mandi retraining can be disabled:

```env
ENABLE_MANDI_LEVEL_FULL_TRAINING=false
MAX_MARKET_SERIES=300
MIN_MARKET_OBSERVED_DAYS=90
```

Fast mode anchors on each mandi's latest price and applies the validated state movement. It is a fallback, not a substitute for the full mandi benchmark.

## Backend Query

Existing state-wise call remains valid:

```text
GET /api/mandi/predictions/v2?grain=Wheat&state=All%20States
```

Nearest mandi call:

```text
GET /api/mandi/predictions/v2?grain=Wheat&state=Bihar&nearest=true&lat=25.6&lng=85.1
```

Direct mandi call:

```text
GET /api/mandi/predictions/v2?grain=Wheat&market_id=123
GET /api/mandi/predictions/v2?grain=Wheat&market=Patna&state=Bihar&district=Patna
```

If mandi output is missing, the backend returns the normal state prediction plus `market_context.mode = "state_fallback"`.

## Carrying Cost

Farm-gate price is:

```text
farm_gate_price = mandi_price - carrying_cost_per_quintal
```

Default carrying cost:

```text
base transport: Rs 20/quintal
distance transport: Rs 1.8/quintal/km
handling: Rs 15/quintal
```

Override in Render/backend env:

```env
MANDI_TRANSPORT_BASE_RS_PER_QUINTAL=20
MANDI_TRANSPORT_RS_PER_QUINTAL_KM=1.8
MANDI_HANDLING_RS_PER_QUINTAL=15
```

## Important Limitation

True nearest mandi needs coordinates in `markets.json`. If the Kaggle source does not include market latitude/longitude, attach a Kaggle dataset such as `mandi_locations.csv` with:

```csv
state,district,market,lat,lng
```

Without coordinates, the website can still show mandi-level predictions by selected mandi/market name, but location-based nearest distance cannot be computed honestly.
