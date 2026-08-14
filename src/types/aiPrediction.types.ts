export type PredictionSource = 'local_files' | 'supabase_release';

export interface PredictionMeta {
  release_id: string;
  generated_at: string | null;
  data_latest_date: string | null;
  schema_version: string | null;
  source: PredictionSource | string;
  grains: string[];
  states: string[];
  markets?: MarketInfo[];
  market_prediction_available?: boolean;
  evaluation?: Record<string, number | string | null> | null;
  evaluation_strategy?: string | null;
  data_drift?: Record<string, number | string | null> | null;
  publish_quality?: { passed?: boolean; warning_count?: number } | null;
}

export interface HorizonMetrics {
  mape?: number;
  mae?: number;
  rmse?: number;
  wape?: number;
  r2?: number;
  directional_accuracy?: number;
  sample_count?: number;
  ensemble_mape?: number;
  ensemble_mae?: number;
}

export interface HorizonPrediction {
  predicted_price: number;
  farm_gate_predicted_price?: number;
  carrying_cost_rs_per_quintal?: number;
  target_date?: string;
  confidence_lower?: number;
  confidence_upper?: number;
  farm_gate_confidence_lower?: number;
  farm_gate_confidence_upper?: number;
  confidence_level?: string;
  selected_method?: 'ml' | 'baseline' | string;
  metrics?: HorizonMetrics;
}

export interface StatePrediction {
  current_price?: number;
  farm_gate_current_price?: number;
  carrying_cost_rs_per_quintal?: number;
  last_actual_date?: string;
  last_data_date?: string;
  forecast_start_date?: string;
  forecast_as_of?: string;
  status?: string;
  horizons: Record<string, HorizonPrediction>;
}

export interface MarketInfo {
  market_key?: string;
  market_id?: string | number | null;
  market_name?: string | null;
  district?: string | null;
  state?: string | null;
  lat?: number | null;
  lng?: number | null;
  row_count?: number | null;
  grain_count?: number | null;
  latest_date?: string | null;
}

export interface MarketContext {
  mode?: 'market' | 'state_fallback' | string;
  market_key?: string | null;
  market_id?: string | number | null;
  market_name?: string | null;
  district?: string | null;
  state?: string | null;
  lat?: number | null;
  lng?: number | null;
  distance_km?: number | null;
  match_mode?: string | null;
  transport_base_rs_per_quintal?: number | null;
  transport_rs_per_quintal_km?: number | null;
  handling_rs_per_quintal?: number | null;
  total_carrying_cost_rs_per_quintal?: number | null;
  note?: string | null;
}

export interface ActualPoint {
  date: string;
  price: number;
  is_observed?: boolean;
}

export interface ForecastPoint {
  date: string;
  price: number;
  is_anchor?: boolean;
  anchor_horizon?: number;
}

export interface EfficiencyPoint {
  date?: string;
  origin_date?: string;
  actual_price?: number;
  predicted_price?: number;
  actualPrice?: number;
  predictedPrice?: number;
  error_pct?: number;
  method?: string;
}

export interface EfficiencyMetrics {
  mape?: number;
  mae?: number;
  rmse?: number;
  wape?: number;
  directional_accuracy?: number;
  sample_count?: number;
}

export interface PredictionReasoning {
  text?: string;
  headline?: string;
  bullets?: string[];
  source?: string;
  key_drivers?: Array<{ feature: string; score: number }>;
}

export interface PredictionResponse {
  meta: PredictionMeta;
  grain: string;
  state: string;
  prediction: StatePrediction;
  actuals?: { context?: ActualPoint[] } | ActualPoint[];
  forecast_series?: ForecastPoint[];
  reasoning?: PredictionReasoning | Record<string, PredictionReasoning>;
  market_context?: MarketContext | null;
}

export interface EfficiencyResponse {
  meta: PredictionMeta;
  grain: string;
  state: string;
  horizon: number;
  efficiency: {
    metrics?: EfficiencyMetrics;
    series?: EfficiencyPoint[];
  } | EfficiencyPoint[];
}
