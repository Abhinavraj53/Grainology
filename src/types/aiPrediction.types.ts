export type PredictionSource = 'local_files' | 'supabase_release';

export interface PredictionMeta {
  release_id: string;
  generated_at: string | null;
  data_latest_date: string | null;
  schema_version: string | null;
  source: PredictionSource | string;
  grains: string[];
  states: string[];
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
  target_date?: string;
  confidence_lower?: number;
  confidence_upper?: number;
  confidence_level?: string;
  selected_method?: 'ml' | 'baseline' | string;
  metrics?: HorizonMetrics;
}

export interface StatePrediction {
  current_price?: number;
  last_actual_date?: string;
  last_data_date?: string;
  forecast_start_date?: string;
  forecast_as_of?: string;
  status?: string;
  horizons: Record<string, HorizonPrediction>;
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
