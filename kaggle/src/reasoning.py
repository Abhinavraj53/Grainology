from __future__ import annotations

import json

from .config import HORIZONS, RELEASE_DIR, TARGET_GRAINS


def generate_reasoning(predictions: dict, metrics: dict) -> dict:
    reasoning = {grain: {} for grain in TARGET_GRAINS}
    for grain, states in predictions.items():
        for state, payload in states.items():
            current = payload.get("current_price") or 0
            reasoning[grain][state] = {}
            for horizon in HORIZONS:
                horizon_key = str(horizon)
                h_payload = payload.get("horizons", {}).get(horizon_key)
                if not h_payload:
                    continue
                predicted = h_payload["predicted_price"]
                method = h_payload.get("selected_method", "baseline")
                change_pct = ((predicted - current) / current * 100) if current else 0
                direction = "rise" if change_pct >= 0 else "fall"
                state_metrics = metrics.get(grain, {}).get(state, {}).get(horizon_key, {})
                sample_count = state_metrics.get("sample_count", 0)
                baseline_mape = state_metrics.get("baseline_mape")
                ml_mape = state_metrics.get("ml_mape")
                drivers = [
                    {"feature": "recent_state_price_momentum", "score": 0.35},
                    {"feature": "national_price_relationship", "score": 0.3},
                    {"feature": "seasonality", "score": 0.2},
                    {"feature": "market_count_signal", "score": 0.15},
                ]
                text = (
                    f"For {state}, {grain} is projected to {direction} by "
                    f"{abs(change_pct):.1f}% over {horizon} days. The selected method is "
                    f"{method}, based on the state-specific validation gate."
                )
                if sample_count:
                    text += f" The gate used {sample_count} validation samples."
                if ml_mape is not None and baseline_mape is not None:
                    text += f" ML validation MAPE was {ml_mape:.2f}% versus persistence baseline {baseline_mape:.2f}%."
                reasoning[grain][state][horizon_key] = {
                    "source": "rule_based",
                    "text": text,
                    "key_drivers": drivers,
                }
    (RELEASE_DIR / "reasoning.json").write_text(json.dumps(reasoning, indent=2, allow_nan=False), encoding="utf-8")
    return reasoning
