def predict_method_price(
    trained: dict | None,
    method: str,
    row: pd.Series,
    current_price: float,
    horizon: int,
) -> tuple[float, float | None]:
    if not trained or method == "baseline":
        return current_price, None
    feature_frame = row[trained["feature_columns"]].to_frame().T
    if feature_frame.isna().all(axis=None):
        return current_price, None
    features = fill_features(feature_frame, trained.get("feature_fill_values", {}))
    low_ratio, high_ratio = HORIZON_PRICE_CLIP_BOUNDS.get(int(horizon), (0.55, 1.75))
    state_name = str(row.get("state_name", ""))
    gate = (trained.get("gates") or {}).get(state_name, {})
    bias_factor = float(gate.get("price_bias_factor") or 1.0)
    max_bias = max(0.0, float(MAX_BIAS_CORRECTION_PCT)) / 100.0
    bias_factor = float(np.clip(bias_factor, 1.0 - max_bias, 1.0 + max_bias))

    def calibrated_price(value: float) -> float:
        return float(np.clip(value * bias_factor, current_price * low_ratio, current_price * high_ratio))

    def model_price(model_name: str) -> float | None:
        model = (trained.get("models") or {}).get(model_name)
        if model is None:
            return None
        value = current_price * float(np.exp(np.clip(_predict_model(model, features)[0], -10, 15)))
        return float(np.clip(value, current_price * low_ratio, current_price * high_ratio))

    if method == "ensemble":
        values, weights = [], []
        for model_name, weight in (trained.get("ensemble_weights") or {}).items():
            value = model_price(model_name)
            if value is not None:
                values.append(value)
                weights.append(float(weight))
        if values and sum(weights) > 0:
            price = calibrated_price(float(np.average(values, weights=weights)))
            return price, price
        method = next(iter(trained.get("models") or {}), "baseline")
    price = model_price(method)
    if price is None:
        return current_price, None
    price = calibrated_price(price)
    return price, price
