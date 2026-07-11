const GEMINI_API_KEY = (
  process.env.GEMINI_API_KEY
  || process.env.GOOGLE_GEMINI_API_KEY
  || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  || ''
).trim();

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 30000);
const GEMINI_REASONING_CACHE_MS = Number(process.env.GEMINI_REASONING_CACHE_SECONDS || 900) * 1000;
const ENABLE_GOOGLE_SEARCH = String(process.env.GEMINI_ENABLE_GOOGLE_SEARCH || 'false').toLowerCase() === 'true';
const DEBUG_GEMINI_REASONING = String(process.env.GEMINI_DEBUG_REASONING || 'false').toLowerCase() === 'true';

const reasoningCache = new Map();

const asNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatInr = (value) => {
  const numeric = asNumber(value);
  if (numeric == null) return 'N/A';
  return `Rs ${numeric.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/quintal`;
};

const formatPct = (value) => {
  const numeric = asNumber(value);
  if (numeric == null) return 'N/A';
  return `${numeric.toFixed(2)}%`;
};

const compactActuals = (actuals) => {
  const rows = Array.isArray(actuals) ? actuals : actuals?.context || [];
  return rows
    .slice(-30)
    .map((row) => ({ date: row.date, price: asNumber(row.price) }))
    .filter((row) => row.date && row.price != null);
};

const compactForecast = (forecastSeries) => {
  return (Array.isArray(forecastSeries) ? forecastSeries : [])
    .filter((row) => row?.is_anchor || row?.anchor_horizon)
    .map((row) => ({ date: row.date, price: asNumber(row.price), horizon: row.anchor_horizon }))
    .filter((row) => row.date && row.price != null)
    .slice(0, 6);
};

const fallbackReasoning = ({ grain, state, horizon, prediction, actuals, forecastSeries, existingReasoning }) => {
  const horizonPayload = prediction?.horizons?.[horizon] || prediction?.horizons?.[String(horizon)] || {};
  const currentPrice = asNumber(prediction?.current_price);
  const predictedPrice = asNumber(horizonPayload.predicted_price);
  const changePct = currentPrice && predictedPrice ? ((predictedPrice - currentPrice) / currentPrice) * 100 : null;
  const metrics = horizonPayload.metrics || {};
  const recentActuals = compactActuals(actuals);
  const lastActual = recentActuals[recentActuals.length - 1];
  const previousActual = recentActuals[recentActuals.length - 8] || recentActuals[0];
  const recentMove = lastActual?.price && previousActual?.price
    ? ((lastActual.price - previousActual.price) / previousActual.price) * 100
    : null;
  const method = horizonPayload.selected_method || metrics.selected_method || 'forecast model';
  const mape = asNumber(metrics.mape ?? metrics.ensemble_mape ?? metrics.ml_mape);
  const mae = asNumber(metrics.mae ?? metrics.ensemble_mae);

  const direction = changePct == null ? 'remain near the current range' : changePct >= 0 ? 'move up' : 'soften';
  const bullets = [
    `${grain} in ${state} is expected to ${direction} over the next ${horizon} days, from ${formatInr(currentPrice)} to about ${formatInr(predictedPrice)}.`,
    changePct == null
      ? 'The forecast change is small enough that the model is treating the market as broadly range-bound.'
      : `The expected move is ${formatPct(Math.abs(changePct))} ${changePct >= 0 ? 'above' : 'below'} the latest observed price.`,
    recentMove == null
      ? 'Recent market history is limited for this selection, so the dashboard is relying more on the broader state/national pattern.'
      : `Recent prices moved ${formatPct(Math.abs(recentMove))} ${recentMove >= 0 ? 'higher' : 'lower'}, which is one of the short-term signals behind the forecast.`,
    mape == null
      ? `The selected method is ${method}; validation error is not available for this exact card.`
      : `Backtesting MAPE is ${formatPct(mape)}${mae == null ? '' : `, with an average miss of about ${formatInr(mae)}`}.`,
  ];

  if (existingReasoning?.text) {
    bullets.push(String(existingReasoning.text).replace(/\s+/g, ' ').trim());
  }

  return {
    source: 'fallback',
    headline: `${horizon}-day market view for ${grain}`,
    bullets: bullets.slice(0, 5),
    key_drivers: existingReasoning?.key_drivers || [
      { feature: 'recent_price_momentum', score: 0.8 },
      { feature: 'state_market_history', score: 0.7 },
      { feature: 'backtest_error', score: 0.6 },
    ],
  };
};

const parseGeminiJson = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  let jsonText = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  if (!jsonText.startsWith('{')) {
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start >= 0 && end > start) {
      jsonText = jsonText.slice(start, end + 1);
    }
  }

  return JSON.parse(jsonText);
};

const normalizeGeminiPayload = (parsed, source) => {
  if (!parsed || !Array.isArray(parsed.bullets)) return null;

  const keyDrivers = Array.isArray(parsed.key_drivers)
    ? parsed.key_drivers
      .map((driver, index) => {
        if (typeof driver === 'string') {
          return {
            feature: driver.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48) || `driver_${index + 1}`,
            score: Math.max(0.2, 0.9 - index * 0.1),
          };
        }
        return {
          feature: String(driver?.feature || `driver_${index + 1}`),
          score: Number.isFinite(Number(driver?.score)) ? Number(driver.score) : Math.max(0.2, 0.9 - index * 0.1),
        };
      })
      .slice(0, 6)
    : [];

  return {
    source,
    headline: parsed.headline || 'Market view',
    bullets: parsed.bullets.map((item) => String(item)).filter(Boolean).slice(0, 6),
    key_drivers: keyDrivers,
  };
};

const callGemini = async (payload) => {
  if (!GEMINI_API_KEY) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const prompt = `
You are explaining an Indian agricultural commodity price forecast to a non-technical farmer/trader.
Use simple English/Hinglish-friendly wording. Do not overclaim. If current news or weather is unavailable, say what the model data suggests instead of inventing facts.

Return only JSON:
{
  "headline": "short headline",
  "bullets": ["4 to 6 clear bullet points"],
  "key_drivers": [{"feature": "short_snake_case", "score": 0.1}]
}

Forecast context:
${JSON.stringify(payload, null, 2)}
`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.25,
      maxOutputTokens: 900,
      responseMimeType: 'application/json',
    },
  };

  const runRequest = async (includeSearch) => {
    const requestBody = includeSearch ? { ...body, tools: [{ google_search: {} }] } : { ...body };
    const controller = new AbortController();
    const requestTimeoutMs = includeSearch ? Math.min(5000, GEMINI_TIMEOUT_MS) : GEMINI_TIMEOUT_MS;
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    let modelText = '';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (DEBUG_GEMINI_REASONING) {
          const errorText = await response.text().catch(() => '');
          console.warn('[Gemini reasoning] non-ok response', {
            includeSearch,
            status: response.status,
            bodyStart: errorText.slice(0, 300),
          });
        }
        return null;
      }
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        if (DEBUG_GEMINI_REASONING) {
          console.warn('[Gemini reasoning] API JSON parse failed', {
            includeSearch,
            error: error.message,
            bodyStart: responseText.slice(0, 500),
          });
        }
        return null;
      }
      modelText = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n') || '';
      const parsed = parseGeminiJson(modelText);
      const normalized = normalizeGeminiPayload(parsed, includeSearch ? 'gemini_search' : 'gemini');
      if (DEBUG_GEMINI_REASONING && !normalized) {
        console.warn('[Gemini reasoning] parsed payload missing bullets', {
          includeSearch,
          textStart: modelText.slice(0, 300),
        });
      }
      return normalized;
    } catch (error) {
      if (DEBUG_GEMINI_REASONING) {
        console.warn('[Gemini reasoning] request failed', {
          includeSearch,
          error: error.message,
          textStart: modelText.slice(0, 300),
        });
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    if (ENABLE_GOOGLE_SEARCH) {
      const withSearch = await runRequest(true);
      if (withSearch) return withSearch;
    }
    return await runRequest(false);
  } catch {
    return null;
  }
};

export const buildAiReasoning = async ({
  grain,
  state,
  horizon,
  prediction,
  actuals,
  forecastSeries,
  existingReasoning,
  meta,
}) => {
  const cacheKey = [
    meta?.release_id || meta?.generated_at || 'release',
    grain,
    state,
    horizon,
  ].join(':');
  const cached = reasoningCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < GEMINI_REASONING_CACHE_MS) return cached.value;

  const horizonPayload = prediction?.horizons?.[horizon] || prediction?.horizons?.[String(horizon)] || {};
  const payload = {
    grain,
    state,
    horizon,
    release_latest_date: meta?.data_latest_date || null,
    generated_at: meta?.generated_at || null,
    current_price: prediction?.current_price ?? null,
    last_actual_date: prediction?.last_actual_date || prediction?.last_data_date || null,
    target_date: horizonPayload.target_date || null,
    predicted_price: horizonPayload.predicted_price ?? null,
    confidence_lower: horizonPayload.confidence_lower ?? null,
    confidence_upper: horizonPayload.confidence_upper ?? null,
    selected_method: horizonPayload.selected_method || null,
    metrics: horizonPayload.metrics || {},
    recent_actuals: compactActuals(actuals),
    forecast_anchors: compactForecast(forecastSeries),
    model_reasoning: existingReasoning?.text || null,
    model_key_drivers: existingReasoning?.key_drivers || [],
  };

  const value = await callGemini(payload)
    || fallbackReasoning({ grain, state, horizon, prediction, actuals, forecastSeries, existingReasoning });

  reasoningCache.set(cacheKey, { createdAt: Date.now(), value });
  return value;
};
