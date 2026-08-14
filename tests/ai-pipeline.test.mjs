import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  applyFarmGatePrices,
  carryingCostForDistance,
  findMarket,
  haversineKm,
} from '../services/aiPredictionService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

test('haversineKm computes a realistic market distance', () => {
  const distance = haversineKm(25.5941, 85.1376, 25.6093, 85.1235);
  assert.ok(distance > 1 && distance < 4);
});

test('carrying cost uses base, distance, and handling assumptions', () => {
  const cost = carryingCostForDistance(10);
  assert.deepEqual(cost, {
    transport_base_rs_per_quintal: 20,
    transport_rs_per_quintal_km: 1.8,
    handling_rs_per_quintal: 15,
    total_carrying_cost_rs_per_quintal: 53,
  });
});

test('farm-gate adjustment applies to prices and uncertainty bounds', () => {
  const adjusted = applyFarmGatePrices({
    current_price: 2500,
    horizons: {
      7: {
        predicted_price: 2600,
        confidence_lower: 2450,
        confidence_upper: 2750,
        prediction_interval: { lower: 2425, upper: 2775, coverage_target: 0.9 },
      },
    },
  }, carryingCostForDistance(10));

  assert.equal(adjusted.farm_gate_current_price, 2447);
  assert.equal(adjusted.horizons[7].farm_gate_predicted_price, 2547);
  assert.equal(adjusted.horizons[7].farm_gate_confidence_lower, 2397);
  assert.equal(adjusted.horizons[7].farm_gate_confidence_upper, 2697);
  assert.deepEqual(adjusted.horizons[7].farm_gate_prediction_interval, {
    lower: 2372,
    upper: 2722,
    coverage_target: 0.9,
  });
});

test('nested prediction intervals are normalized for the website contract', () => {
  const adjusted = applyFarmGatePrices({
    current_price: 2500,
    horizons: {
      30: {
        predicted_price: 2620,
        prediction_interval: { lower: 2400, upper: 2810, coverage_target: 0.9 },
      },
    },
  }, carryingCostForDistance(0));

  assert.equal(adjusted.horizons[30].confidence_lower, 2400);
  assert.equal(adjusted.horizons[30].confidence_upper, 2810);
  assert.equal(adjusted.horizons[30].farm_gate_confidence_lower, 2365);
  assert.equal(adjusted.horizons[30].farm_gate_confidence_upper, 2775);
});

test('findMarket accepts snake-case IDs and chooses nearest coordinates', () => {
  const markets = [
    { market_id: 'patna', market_name: 'Patna', state: 'Bihar', lat: 25.61, lng: 85.14 },
    { market_id: 'gaya', market_name: 'Gaya', state: 'Bihar', lat: 24.79, lng: 85.0 },
  ];

  assert.equal(findMarket(markets, { market_id: 'gaya', state: 'Bihar' }).market.market_name, 'Gaya');
  const nearest = findMarket(markets, { state: 'Bihar', lat: 25.60, lng: 85.13 });
  assert.equal(nearest.market.market_name, 'Patna');
  assert.equal(nearest.match_mode, 'nearest_location');
});

test('generated mandi notebook is standalone and contains the upgraded contract', () => {
  const basePath = path.join(projectRoot, 'kaggle', 'grainology_model_base.ipynb');
  const notebookPath = path.join(projectRoot, 'kaggle', 'grainology_mandi_forecaster.ipynb');
  assert.ok(fs.existsSync(basePath), 'user-maintained notebook base must be versioned');
  const notebook = JSON.parse(fs.readFileSync(notebookPath, 'utf8'));
  const source = notebook.cells.map((cell) => (cell.source || []).join('')).join('\n');

  assert.match(source, /horizon_embargo_temporal_holdout/);
  assert.match(source, /EVALUATION_HOLDOUT_DAYS/);
  assert.match(source, /ENSEMBLE_CALIBRATION_DAYS/);
  assert.match(source, /price_bias_factor/);
  assert.match(source, /early_stopping_rounds": None/);
  assert.match(source, /evaluation_report\.json/);
  assert.match(source, /data_drift_report\.json/);
  assert.match(source, /apply_live_dashboard_price_overrides/);
  assert.match(source, /market_predictions\.json/);
  assert.match(source, /market_forecast_series\.json/);
  assert.match(source, /ENABLE_MANDI_LEVEL_FULL_TRAINING/);
  assert.match(source, /MAX_MARKET_SERIES = int\(os\.environ\.get\("MAX_MARKET_SERIES", "0"\)\)/);
  assert.match(source, /if MAX_MARKET_SERIES > 0:/);
  assert.match(source, /group\["national_price"\]\.shift\(lag\)/);
  assert.match(source, /FOURIER_PERIODS = \[7, 30, 90, 365\]/);
  assert.match(source, /msp_gap_ratio/);
  assert.match(source, /arrival_trend_30/);
  assert.doesNotMatch(source, /\["national_price"\]\.ffill\(\)\.bfill\(\)/);
  assert.doesNotMatch(source, /from \.train import/);
  assert.doesNotMatch(source, /from \.config import/);
  assert.doesNotMatch(source, /train_test_split/);
  assert.doesNotMatch(source, /â†’|â‚¹|â€”|Ã—/);
});
