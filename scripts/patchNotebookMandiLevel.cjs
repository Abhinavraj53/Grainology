const fs = require('fs');
const path = require('path');

const source = path.resolve(process.argv[2] || 'kaggle/grainology_state_forecaster.ipynb');
const target = path.resolve(process.argv[3] || 'kaggle/grainology_mandi_forecaster.ipynb');

const toLines = (text) => text.split(/(?<=\n)/);
const markdown = (sourceText) => ({ cell_type: 'markdown', metadata: {}, source: toLines(sourceText) });
const code = (sourceText) => ({ cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source: toLines(sourceText) });

const mandiMarkdown = `## Mandi-Level Forecast Extension

This section keeps the existing state-wise website contract unchanged and adds optional mandi-level files:

- \`markets.json\`: available mandi/market series with state, district, latest date, and optional coordinates.
- \`market_predictions.json\`: mandi-wise current price and 7/30/90 day forecasts. User-specific carrying charges and farm-gate prices are added by the backend after distance is known.
- \`market_forecast_series.json\`: mandi-wise chart forecast paths.
- \`market_actuals.json\`: recent mandi-wise actual context.
- \`market_reasoning.json\`: lightweight market notes; the backend can still enrich reasoning with Gemini.

Nearest-mandi distance works only when market coordinates are available. If the source data does not include coordinates, the website safely falls back to selected/state forecast until a \`mandi_locations.csv\` input is attached.
`;

const mandiCode = `import hashlib

ENABLE_MANDI_LEVEL_RELEASE = env_bool("ENABLE_MANDI_LEVEL_RELEASE", True)
ENABLE_MANDI_LEVEL_FULL_TRAINING = env_bool("ENABLE_MANDI_LEVEL_FULL_TRAINING", True)
MAX_MARKET_SERIES = int(os.environ.get("MAX_MARKET_SERIES", "0"))
MIN_MARKET_OBSERVED_DAYS = int(os.environ.get("MIN_MARKET_OBSERVED_DAYS", "180"))
MANDI_FORECAST_HISTORY_DAYS = int(os.environ.get("MANDI_FORECAST_HISTORY_DAYS", "60"))
CONFORMAL_ALPHA = float(os.environ.get("CONFORMAL_ALPHA", "0.10"))
HORIZON_PRICE_CLIP_BOUNDS = {7: (0.70, 1.35), 30: (0.60, 1.55), 90: (0.50, 1.85)}

MARKET_LOCATION_ALIASES = {
    "state_name": ["state", "state_name", "state_name_en"],
    "district": ["district", "district_name"],
    "market": ["market", "market_name", "mandi", "mandi_name"],
    "lat": ["lat", "latitude"],
    "lng": ["lng", "lon", "longitude"],
}


def _slug(value):
    text = str(value or "").strip().lower()
    slug = "".join(ch if ch.isalnum() else "-" for ch in text)
    return "-".join(part for part in slug.split("-") if part)


def market_key_for(row):
    raw = "::".join(str(row.get(col, "") or "").strip() for col in ["state_name", "district", "market"])
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:10]
    return f"{_slug(raw)[:80]}-{digest}"


def interpolate_market_series(last_date, current_price, horizon_points, horizon_intervals):
    points = {0: float(current_price), **{int(key): float(value) for key, value in horizon_points.items()}}
    lower_points = {0: float(current_price), **{int(key): float(value[0]) for key, value in horizon_intervals.items()}}
    upper_points = {0: float(current_price), **{int(key): float(value[1]) for key, value in horizon_intervals.items()}}
    xs = np.array(sorted(points), dtype=float)
    prices = np.array([points[int(x)] for x in xs], dtype=float)
    lowers = np.array([lower_points.get(int(x), points[int(x)]) for x in xs], dtype=float)
    uppers = np.array([upper_points.get(int(x), points[int(x)]) for x in xs], dtype=float)
    output = []
    for day in range(1, int(xs.max()) + 1):
        price = float(np.interp(day, xs, prices))
        lower = min(price, float(np.interp(day, xs, lowers)))
        upper = max(price, float(np.interp(day, xs, uppers)))
        output.append({
            "date": (pd.to_datetime(last_date) + pd.Timedelta(days=day)).date().isoformat(),
            "price": round(price, 2),
            "confidence_lower": round(lower, 2),
            "confidence_upper": round(upper, 2),
            "is_anchor": day in horizon_points,
            "anchor_horizon": day if day in horizon_points else None,
        })
    return output


def _resolve_location_columns(columns):
    by_lower = {str(column).lower().strip(): column for column in columns}
    return {
        target: next((by_lower[alias] for alias in aliases if alias in by_lower), None)
        for target, aliases in MARKET_LOCATION_ALIASES.items()
    }


def load_market_locations():
    frames = []
    for input_path in INPUT_ROOT.rglob("*"):
        if not input_path.is_file() or input_path.suffix.lower() not in {".csv", ".parquet"}:
            continue
        if "location" not in input_path.name.lower() and "mandi" not in input_path.name.lower() and "market" not in input_path.name.lower():
            continue
        try:
            sample = pd.read_parquet(input_path) if input_path.suffix.lower() == ".parquet" else pd.read_csv(input_path)
        except Exception:
            continue
        resolved = _resolve_location_columns(sample.columns)
        if not resolved["market"] or not resolved["lat"] or not resolved["lng"]:
            continue
        out = pd.DataFrame({
            "state_name": sample[resolved["state_name"]] if resolved["state_name"] else pd.NA,
            "district": sample[resolved["district"]] if resolved["district"] else pd.NA,
            "market": sample[resolved["market"]],
            "lat": pd.to_numeric(sample[resolved["lat"]], errors="coerce"),
            "lng": pd.to_numeric(sample[resolved["lng"]], errors="coerce"),
        }).dropna(subset=["market", "lat", "lng"])
        if not out.empty:
            frames.append(out)
            print(f"Loaded mandi coordinates from {input_path}")
    if not frames:
        return pd.DataFrame(columns=["market_key", "lat", "lng"])
    locations = pd.concat(frames, ignore_index=True)
    locations["state_name"] = locations["state_name"].astype("string").str.strip()
    locations["district"] = locations["district"].astype("string").str.strip()
    locations["market"] = locations["market"].astype("string").str.strip()
    locations["market_key"] = locations.apply(market_key_for, axis=1)
    return locations.drop_duplicates("market_key", keep="last")[["market_key", "lat", "lng"]]


def load_market_level_sources():
    frames = []
    for input_path in discover_data_files():
        try:
            raw = pd.read_parquet(input_path) if input_path.suffix.lower() == ".parquet" else pd.read_csv(input_path)
        except Exception as exc:
            print(f"Skipping market-level load for {input_path}: {exc}")
            continue
        normalized = normalize_frame(raw, source=("latest_csv" if input_path.name.lower() == "latest_data.csv" else "historical"), source_priority=(2 if input_path.name.lower() == "latest_data.csv" else 1))
        if normalized.empty or "market" not in normalized.columns:
            continue
        normalized["district"] = normalized.get("district", pd.NA).astype("string").str.strip()
        normalized["market"] = normalized.get("market", pd.NA).astype("string").str.strip()
        normalized = normalized[normalized["market"].notna() & normalized["market"].ne("")]
        if not normalized.empty:
            frames.append(normalized)
    if not frames:
        return pd.DataFrame()

    raw_market = pd.concat(frames, ignore_index=True)
    price_agg = "mean" if AGGREGATION_METHOD == "mean" else "median"
    market_daily = raw_market.groupby(["date", "state_name", "district", "market", "grain"], as_index=False, observed=True).agg(
        price=("price", price_agg),
        price_low=("price_low", "min"),
        price_high=("price_high", "max"),
        arrival=("arrival", "sum"),
        market_count=("market_count", "sum"),
        is_observed=("is_observed", "max"),
        source=("source", "last"),
        source_priority=("source_priority", "max"),
        source_fetched_at=("source_fetched_at", "max"),
    )
    market_daily["market_key"] = market_daily.apply(market_key_for, axis=1)
    market_daily["market_label"] = market_daily[["state_name", "district", "market"]].fillna("").agg(" / ".join, axis=1).str.replace(r"\\s+/\\s+/\\s+", " / ", regex=True)

    coverage = market_daily.groupby(["market_key", "grain"], observed=True).agg(
        observed_days=("date", "nunique"),
        latest_date=("date", "max"),
        state_name=("state_name", "last"),
        district=("district", "last"),
        market=("market", "last"),
        row_count=("price", "size"),
    ).reset_index()
    eligible = coverage[coverage["observed_days"].ge(MIN_MARKET_OBSERVED_DAYS)].sort_values(["latest_date", "observed_days"], ascending=[False, False])
    selected = eligible["market_key"].drop_duplicates()
    if MAX_MARKET_SERIES > 0:
        selected = selected.head(MAX_MARKET_SERIES)
    selected_keys = selected.tolist()
    market_daily = market_daily[market_daily["market_key"].isin(selected_keys)].copy()

    locations = load_market_locations()
    if not locations.empty:
        market_daily = market_daily.merge(locations, on="market_key", how="left")
    else:
        market_daily["lat"] = pd.NA
        market_daily["lng"] = pd.NA

    print(f"Mandi-level daily rows: {len(market_daily):,}; selected mandi series: {len(selected_keys):,}")
    return market_daily


def build_market_training_canonical(market_daily):
    if market_daily.empty:
        return pd.DataFrame()
    out = market_daily.copy()
    out["original_state_name"] = out["state_name"]
    out["state_name"] = out["market_key"]
    out["state_id"] = out["market_key"]
    out["state_key"] = out["market_key"]

    all_markets = market_daily.groupby(["date", "grain"], as_index=False, observed=True).agg(
        price=("price", "median"),
        price_low=("price_low", "min"),
        price_high=("price_high", "max"),
        arrival=("arrival", "sum"),
        market_count=("market_key", "nunique"),
        is_observed=("is_observed", "max"),
        source=("source", "last"),
        source_priority=("source_priority", "max"),
        source_fetched_at=("source_fetched_at", "max"),
    )
    all_markets["state_name"] = "All States"
    all_markets["state_id"] = "all-markets"
    all_markets["state_key"] = "all-markets"
    for col in ["district", "market", "market_key", "market_label", "original_state_name", "lat", "lng"]:
        all_markets[col] = pd.NA

    return align_canonical(pd.concat([out, all_markets[out.columns]], ignore_index=True))


def market_lookup_payload(market_daily):
    if market_daily.empty:
        return []
    grouped = market_daily.groupby("market_key", observed=True).agg(
        market_name=("market", "last"),
        district=("district", "last"),
        state=("state_name", "last"),
        latest_date=("date", "max"),
        row_count=("price", "size"),
        grain_count=("grain", "nunique"),
        lat=("lat", "last"),
        lng=("lng", "last"),
    ).reset_index()
    return [
        {
            "market_key": row.market_key,
            "market_name": row.market_name,
            "district": None if pd.isna(row.district) else row.district,
            "state": row.state,
            "latest_date": str(row.latest_date),
            "row_count": int(row.row_count),
            "grain_count": int(row.grain_count),
            "lat": None if pd.isna(row.lat) else float(row.lat),
            "lng": None if pd.isna(row.lng) else float(row.lng),
        }
        for row in grouped.itertuples(index=False)
    ]


def generate_market_predictions(market_daily, market_canonical, market_registry):
    market_predictions, market_forecast_series, market_actuals, market_metrics, market_reasoning = {}, {}, {}, {}, {}
    features = market_registry["features"].copy()
    features["date"] = pd.to_datetime(features["date"])
    latest_rows = features[~features["state_name"].eq("All States")].sort_values("date").groupby(["grain", "state_name"], as_index=False).tail(1)
    lookup = {item["market_key"]: item for item in market_lookup_payload(market_daily)}

    for grain in TARGET_GRAINS:
        market_predictions[grain] = {}
        market_forecast_series[grain] = {}
        market_actuals[grain] = {}
        market_metrics[grain] = {}
        market_reasoning[grain] = {}
        for _, row in latest_rows[latest_rows["grain"].eq(grain)].iterrows():
            market_key = row["state_name"]
            info = lookup.get(market_key, {"market_key": market_key})
            last_ts = pd.to_datetime(row["date"])
            last_date = last_ts.date()
            current_price = float(row["price"])
            horizon_points = {}
            horizon_intervals = {}
            prediction = {
                "current_price": round(current_price, 2),
                "last_actual_date": last_date.isoformat(),
                "forecast_start_date": (last_ts + pd.Timedelta(days=1)).date().isoformat(),
                "status": "fresh",
                "horizons": {},
            }
            market_metrics[grain][market_key] = {}
            for horizon in HORIZONS:
                trained = market_registry["models"].get(grain, {}).get(str(horizon))
                gate = trained["gates"].get(market_key) if trained else None
                selected_method = gate.get("selected_method", "baseline") if gate else "baseline"
                predicted_price, ml_price = predict_method_price(trained, selected_method, row, current_price, horizon)
                if ml_price is None and selected_method != "baseline":
                    selected_method = "baseline"
                horizon_points[horizon] = predicted_price
                metric_payload = gate or {"selected_method": selected_method, "sample_count": 0}
                radius = float(metric_payload.get("conformal_log_radius", np.log(1.25)))
                lower = float(predicted_price * np.exp(-radius))
                upper = float(predicted_price * np.exp(radius))
                low_ratio, high_ratio = HORIZON_PRICE_CLIP_BOUNDS.get(int(horizon), (0.55, 1.75))
                lower = min(float(predicted_price), max(lower, current_price * low_ratio))
                upper = max(float(predicted_price), min(upper, current_price * high_ratio))
                horizon_intervals[horizon] = (lower, upper)
                market_metrics[grain][market_key][str(horizon)] = metric_payload
                prediction["horizons"][str(horizon)] = {
                    "target_date": (last_ts + pd.Timedelta(days=horizon)).date().isoformat(),
                    "predicted_price": round(float(predicted_price), 2),
                    "confidence_lower": round(lower, 2),
                    "confidence_upper": round(upper, 2),
                    "selected_method": selected_method,
                    "prediction_interval": {
                        "lower": round(lower, 2),
                        "upper": round(upper, 2),
                        "coverage_target": round(1.0 - CONFORMAL_ALPHA, 2),
                        "method": "split_conformal_log_residual",
                    },
                    "metrics": {
                        "mape": as_json_float(metric_payload.get("ml_mape")),
                        "mae": as_json_float(metric_payload.get("ml_mae")),
                        "baseline_mape": as_json_float(metric_payload.get("baseline_mape")),
                        "baseline_mae": as_json_float(metric_payload.get("baseline_mae")),
                        "sample_count": int(metric_payload.get("sample_count", 0)),
                        "method_mapes": metric_payload.get("method_mapes", {}),
                        "method_maes": metric_payload.get("method_maes", {}),
                    },
                    "model_price": round(float(ml_price), 2) if ml_price is not None else None,
                }

            payload = {**info, "prediction": prediction}
            market_predictions[grain][market_key] = payload
            market_forecast_series[grain][market_key] = interpolate_market_series(
                last_date, current_price, horizon_points, horizon_intervals
            )
            market_reasoning[grain][market_key] = {
                "headline": f"{grain} forecast for {info.get('market_name') or 'selected mandi'}",
                "bullets": [
                    "Mandi-level forecast is trained on the selected market's own recent price path when enough history is available.",
                    "Farm-gate prices on the website subtract estimated transport and handling charges from the mandi price.",
                    "If location coordinates are missing for this mandi, the website can still show the mandi forecast but cannot compute true nearest-distance selection.",
                ],
                "source": "mandi_release",
            }

        grain_actuals = market_canonical[market_canonical["grain"].eq(grain) & ~market_canonical["state_name"].eq("All States")].copy()
        grain_actuals["date"] = pd.to_datetime(grain_actuals["date"])
        if not grain_actuals.empty:
            cutoff = grain_actuals["date"].max() - pd.Timedelta(days=MANDI_FORECAST_HISTORY_DAYS)
            grain_actuals = grain_actuals[grain_actuals["date"].ge(cutoff)]
        for market_key, market_df in grain_actuals.groupby("state_name", observed=True):
            market_df = market_df.sort_values("date")
            market_actuals[grain][market_key] = {
                "context": [
                    {
                        "date": date.date().isoformat(),
                        "price": round(float(price), 2),
                        "is_observed": bool(is_observed),
                    }
                    for date, price, is_observed in zip(market_df["date"], market_df["price"], market_df["is_observed"])
                ]
            }

    (RELEASE_DIR / "markets.json").write_text(json.dumps({"markets": market_lookup_payload(market_daily)}, indent=2, allow_nan=False), encoding="utf-8")
    (RELEASE_DIR / "market_predictions.json").write_text(json.dumps(market_predictions, indent=2, allow_nan=False), encoding="utf-8")
    (RELEASE_DIR / "market_forecast_series.json").write_text(json.dumps(market_forecast_series, indent=2, allow_nan=False), encoding="utf-8")
    (RELEASE_DIR / "market_actuals.json").write_text(json.dumps(market_actuals, indent=2, allow_nan=False), encoding="utf-8")
    (RELEASE_DIR / "market_metrics.json").write_text(json.dumps(market_metrics, indent=2, allow_nan=False), encoding="utf-8")
    (RELEASE_DIR / "market_reasoning.json").write_text(json.dumps(market_reasoning, indent=2, allow_nan=False), encoding="utf-8")
    market_canonical.to_csv(RELEASE_DIR / "market_canonical_daily.csv", index=False)
    try:
        market_canonical.to_parquet(RELEASE_DIR / "market_canonical_daily.parquet", index=False)
    except Exception as exc:
        print("Skipping market_canonical_daily.parquet:", exc)
    return market_predictions


def generate_fast_market_predictions(market_daily, market_canonical):
    market_predictions, market_forecast_series, market_actuals, market_metrics, market_reasoning = {}, {}, {}, {}, {}
    if market_daily.empty:
        return market_predictions

    latest_rows = market_daily.sort_values("date").groupby(["grain", "market_key"], as_index=False, observed=True).tail(1)
    lookup = {item["market_key"]: item for item in market_lookup_payload(market_daily)}

    for grain in TARGET_GRAINS:
        market_predictions[grain] = {}
        market_forecast_series[grain] = {}
        market_actuals[grain] = {}
        market_metrics[grain] = {}
        market_reasoning[grain] = {}

        for _, row in latest_rows[latest_rows["grain"].eq(grain)].iterrows():
            market_key = row["market_key"]
            info = lookup.get(market_key, {"market_key": market_key})
            state = row.get("state_name")
            state_prediction = predictions.get(grain, {}).get(state) or predictions.get(grain, {}).get("All States") or {}
            state_current = float(state_prediction.get("current_price") or row["price"] or 0)
            current_price = float(row["price"])
            ratio = current_price / state_current if state_current > 0 else 1.0
            last_ts = pd.to_datetime(row["date"])
            last_date = last_ts.date()
            horizon_points = {}
            horizon_intervals = {}
            prediction = {
                "current_price": round(current_price, 2),
                "last_actual_date": last_date.isoformat(),
                "forecast_start_date": (last_ts + pd.Timedelta(days=1)).date().isoformat(),
                "status": "fresh",
                "model_mode": "market_adjusted_state_model",
                "horizons": {},
            }
            for horizon in HORIZONS:
                state_horizon = (state_prediction.get("horizons") or {}).get(str(horizon), {})
                state_predicted_price = float(state_horizon.get("predicted_price") or state_current or current_price)
                predicted_price = state_predicted_price * ratio
                horizon_points[horizon] = predicted_price
                state_interval = state_horizon.get("prediction_interval") or {}
                lower = float(state_interval.get("lower") or state_predicted_price) * ratio
                upper = float(state_interval.get("upper") or state_predicted_price) * ratio
                if lower > predicted_price:
                    lower = predicted_price
                if upper < predicted_price:
                    upper = predicted_price
                horizon_intervals[horizon] = (lower, upper)
                metrics_payload = dict(state_horizon.get("metrics") or {})
                metrics_payload["market_adjustment_ratio"] = round(float(ratio), 6)
                prediction["horizons"][str(horizon)] = {
                    "target_date": (last_ts + pd.Timedelta(days=horizon)).date().isoformat(),
                    "predicted_price": round(float(predicted_price), 2),
                    "confidence_lower": round(lower, 2),
                    "confidence_upper": round(upper, 2),
                    "selected_method": f"market_adjusted_{state_horizon.get('selected_method') or 'state_model'}",
                    "prediction_interval": {
                        "lower": round(lower, 2),
                        "upper": round(upper, 2),
                        "coverage_target": state_interval.get("coverage_target", round(1.0 - CONFORMAL_ALPHA, 2)),
                        "method": state_interval.get("method", "scaled_state_interval"),
                    },
                    "metrics": metrics_payload,
                    "model_price": round(float(predicted_price), 2),
                }
                market_metrics[grain].setdefault(market_key, {})[str(horizon)] = metrics_payload

            market_predictions[grain][market_key] = {**info, "prediction": prediction}
            market_forecast_series[grain][market_key] = interpolate_market_series(
                last_date, current_price, horizon_points, horizon_intervals
            )
            market_reasoning[grain][market_key] = {
                "headline": f"{grain} forecast for {info.get('market_name') or 'selected mandi'}",
                "bullets": [
                    "This fast mandi forecast anchors on the mandi's latest observed price.",
                    "The 7/30/90 day movement comes from the trained state/national model and is adjusted to this mandi's current price level.",
                    "This fallback is used only if full mandi-level training is disabled or cannot complete within the available runtime.",
                ],
                "source": "market_adjusted_state_model",
            }

        grain_actuals = market_canonical[market_canonical["grain"].eq(grain) & ~market_canonical["state_name"].eq("All States")].copy()
        grain_actuals["date"] = pd.to_datetime(grain_actuals["date"])
        if not grain_actuals.empty:
            cutoff = grain_actuals["date"].max() - pd.Timedelta(days=MANDI_FORECAST_HISTORY_DAYS)
            grain_actuals = grain_actuals[grain_actuals["date"].ge(cutoff)]
        for market_key, market_df in grain_actuals.groupby("state_name", observed=True):
            market_df = market_df.sort_values("date")
            market_actuals[grain][market_key] = {
                "context": [
                    {
                        "date": date.date().isoformat(),
                        "price": round(float(price), 2),
                        "is_observed": bool(is_observed),
                    }
                    for date, price, is_observed in zip(market_df["date"], market_df["price"], market_df["is_observed"])
                ]
            }

    (RELEASE_DIR / "markets.json").write_text(json.dumps({"markets": market_lookup_payload(market_daily)}, indent=2, allow_nan=False), encoding="utf-8")
    (RELEASE_DIR / "market_predictions.json").write_text(json.dumps(market_predictions, indent=2, allow_nan=False), encoding="utf-8")
    (RELEASE_DIR / "market_forecast_series.json").write_text(json.dumps(market_forecast_series, indent=2, allow_nan=False), encoding="utf-8")
    (RELEASE_DIR / "market_actuals.json").write_text(json.dumps(market_actuals, indent=2, allow_nan=False), encoding="utf-8")
    (RELEASE_DIR / "market_metrics.json").write_text(json.dumps(market_metrics, indent=2, allow_nan=False), encoding="utf-8")
    (RELEASE_DIR / "market_reasoning.json").write_text(json.dumps(market_reasoning, indent=2, allow_nan=False), encoding="utf-8")
    market_canonical.to_csv(RELEASE_DIR / "market_canonical_daily.csv", index=False)
    try:
        market_canonical.to_parquet(RELEASE_DIR / "market_canonical_daily.parquet", index=False)
    except Exception as exc:
        print("Skipping market_canonical_daily.parquet:", exc)
    return market_predictions


if ENABLE_MANDI_LEVEL_RELEASE:
    print("\\nBuilding mandi-level forecast release files...")
    market_daily = load_market_level_sources()
    if market_daily.empty:
        print("No mandi-level source rows found. Writing empty mandi sidecar files.")
        (RELEASE_DIR / "markets.json").write_text(json.dumps({"markets": []}, indent=2), encoding="utf-8")
        for file_name in ["market_predictions.json", "market_forecast_series.json", "market_actuals.json", "market_metrics.json", "market_reasoning.json"]:
            (RELEASE_DIR / file_name).write_text(json.dumps({}, indent=2), encoding="utf-8")
    else:
        market_canonical = build_market_training_canonical(market_daily)
        print(f"Market training canonical rows: {len(market_canonical):,}")
        display(pd.DataFrame(market_lookup_payload(market_daily)).head(20))
        if ENABLE_MANDI_LEVEL_FULL_TRAINING:
            print("Full global mandi-aware retraining is enabled.")
            previous_min_observed_days = MIN_STATE_OBSERVED_DAYS
            previous_training_scope = TRAINING_SCOPE
            MIN_STATE_OBSERVED_DAYS = MIN_MARKET_OBSERVED_DAYS
            TRAINING_SCOPE = "all"
            try:
                market_registry = train_models(market_canonical)
                market_predictions = generate_market_predictions(market_daily, market_canonical, market_registry)
                os.environ["MARKET_MODEL_MODE"] = "global_mandi_aware"
            except Exception as exc:
                print("Full mandi training failed; using market-adjusted state fallback:", exc)
                market_predictions = generate_fast_market_predictions(market_daily, market_canonical)
                os.environ["MARKET_MODEL_MODE"] = "market_adjusted_state_fallback"
            finally:
                MIN_STATE_OBSERVED_DAYS = previous_min_observed_days
                TRAINING_SCOPE = previous_training_scope
        else:
            print("Using fast mandi mode: current mandi price + trained state/national forecast ratios.")
            market_predictions = generate_fast_market_predictions(market_daily, market_canonical)
            os.environ["MARKET_MODEL_MODE"] = "market_adjusted_state_model"
        print(f"Mandi-level predictions written for {sum(len(v) for v in market_predictions.values()):,} grain/mandi slots.")
else:
    print("Mandi-level release disabled with ENABLE_MANDI_LEVEL_RELEASE=false")
`;

const nb = JSON.parse(fs.readFileSync(source, 'utf8'));
nb.cells = nb.cells.filter((cell) => {
  const src = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');
  return !src.includes('## Mandi-Level Forecast Extension') && !src.includes('ENABLE_MANDI_LEVEL_RELEASE = env_bool');
});

const finalIndex = nb.cells.findIndex((cell) => {
  const src = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');
  return src.includes('finalize_release(canonical)') || src.includes('Finalize and Quality-Gate');
});

const insertAt = finalIndex >= 0 ? finalIndex : nb.cells.length;
nb.cells.splice(insertAt, 0, markdown(mandiMarkdown), code(mandiCode));
nb.metadata = nb.metadata || {};
nb.metadata.grainology = {
  ...(nb.metadata.grainology || {}),
  mandi_level_extension: true,
  optional_mandi_files: [
    'markets.json',
    'market_predictions.json',
    'market_forecast_series.json',
    'market_actuals.json',
    'market_reasoning.json',
    'market_metrics.json',
  ],
};

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(nb, null, 2));
console.log(`Wrote ${target} from ${source} with mandi-level extension`);
