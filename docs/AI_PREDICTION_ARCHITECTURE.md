# AI Prediction Architecture

Grainology now separates website cache data from permanent AI training history.

## Old Source Of Truth

The legacy dashboard route reads local files from `services/ml-pipeline/dashboard/data`.
That path remains available through `GET /api/mandi/predictions` and is the default
local fallback while release publishing is validated.

## New Source Of Truth

1. Daily Agmarknet refresh fetches `All States` and each configured state.
2. `services/aiActualsService.js` extracts the three reported price dates and
   upserts permanent rows into `agmarknet_ai_actuals`.
3. Kaggle trains the state-aware model from immutable historical files plus
   Supabase actual deltas.
4. A validated bundle is uploaded to private Supabase Storage under
   `releases/<release_id>/`.
5. `ai_prediction_releases` points to the active release.
6. `services/aiPredictionService.js` serves release JSON through backend APIs.

## Feature Flag

`AI_PREDICTIONS_SOURCE=local_files` keeps the legacy local JSON path.
`AI_PREDICTIONS_SOURCE=supabase_release` reads the active private release.

## Backend API

- `GET /api/mandi/predictions/v2/meta`
- `GET /api/mandi/predictions/v2?grain=Wheat&state=All%20States`
- `GET /api/mandi/predictions/v2/efficiency?grain=Wheat&state=Bihar&horizon=7`
- `GET /api/mandi/predictions/v2/status`

The legacy `GET /api/mandi/predictions` route is intentionally unchanged for
rollout safety.
