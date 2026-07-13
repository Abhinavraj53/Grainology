import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Brush,
} from 'recharts';
import { Brain, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { api } from '../lib/api';
import type { PredictionMeta } from '../types/aiPrediction.types';

const GRAIN_COLORS: Record<string, string> = {
  Wheat: '#F59E0B', // Amber
  Paddy: '#10B981', // Emerald
  Maize: '#F97316', // Orange
  Mustard: '#A78BFA', // Purple
};
const AI_REFRESH_MS = 15 * 60 * 1000;
const AI_UNAVAILABLE_DELAY_MS = 12000;
const FORECAST_HISTORY_DAYS = 60;
const EFFICIENCY_DEFAULT_WINDOW_DAYS = 36500;
const EFFICIENCY_TABLE_PAGE_SIZE = 10;
const MAX_EFFICIENCY_CHART_POINTS = 5000;
const AUTH_SYNC_EVENT = 'grainology-auth-changed';

const hasAiAccess = () => (
  typeof window !== 'undefined'
  && Boolean(window.localStorage.getItem('auth_token'))
);

const getMetric = (metrics: any, ...keys: string[]) => {
  for (const key of keys) {
    const value = metrics?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
};

const formatCurrency = (value: any, maximumFractionDigits = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'N/A';
  return `₹${numeric.toLocaleString('en-IN', { maximumFractionDigits })}`;
};

const formatPercent = (value: any, maximumFractionDigits = 2) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'N/A';
  return `${numeric.toFixed(maximumFractionDigits)}%`;
};

const toFiniteNumber = (value: any) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const useAnimatedPrice = (targetValue: number | null, resetKey: string, durationMs = 650) => {
  const [displayValue, setDisplayValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (frameRef.current != null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    const target = toFiniteNumber(targetValue);
    if (target == null || target <= 0) {
      setDisplayValue(0);
      return undefined;
    }

    setDisplayValue(0);
    const startedAt = window.performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(target * eased);
      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(tick);
      }
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [targetValue, resetKey, durationMs]);

  return displayValue;
};

function AIPredictionsLocked() {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-blue-50 p-2 text-blue-600">
            <Brain size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">AI Price Intelligence</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Login to view state-wise forecasts, model efficiency, and AI reasoning. Market prices remain available below.
            </p>
          </div>
        </div>
        <a
          href="/login"
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          Login to view AI predictions
        </a>
      </div>
    </div>
  );
}

function AIPredictionsSkeleton() {
  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-slate-900 p-6">
        <div className="flex animate-pulse flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 h-6 w-56 rounded bg-slate-700" />
            <div className="h-4 w-44 rounded bg-slate-800" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-40 rounded-lg bg-slate-800" />
            <div className="h-10 w-20 rounded-lg bg-slate-800" />
            <div className="h-10 w-20 rounded-lg bg-slate-800" />
          </div>
        </div>
      </div>
      <div className="space-y-5 p-6">
        <div className="grid animate-pulse gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-4 h-4 w-28 rounded bg-slate-200" />
              <div className="mb-4 h-8 w-24 rounded bg-slate-200" />
              <div className="h-3 w-full rounded bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-slate-50" />
      </div>
    </div>
  );
}

function AIPredictionsLoadingNotice({ timedOut, error }: { timedOut: boolean; error: string }) {
  const steps = ['Latest release', 'Forecast cards', 'Efficiency graph', 'AI reasoning'];

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className={`rounded-full p-2 ${timedOut ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
            {timedOut ? <Info size={20} /> : <Brain className="animate-pulse" size={20} />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {timedOut ? 'AI predictions are not available right now' : 'Loading AI Price Intelligence'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {timedOut
                ? 'The model output is taking longer than expected. The live market price table below is still available.'
                : 'Fetching latest model output, state-wise forecasts, backtest metrics, and reasoning.'}
            </p>
            {timedOut && error && <p className="mt-1 text-xs text-slate-400">{error}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                timedOut
                  ? 'border-slate-200 bg-slate-50 text-slate-400'
                  : 'border-blue-100 bg-blue-50 text-blue-600 animate-pulse'
              }`}
              style={{ animationDelay: `${index * 140}ms` }}
            >
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const interpolateForecastMape = (daysIntoFuture: number, horizons: any) => {
  const anchors = [
    { day: 0, mape: 0 },
    ...[7, 30, 90]
      .map((horizon) => ({
        day: horizon,
        mape: getMetric(horizons?.[horizon]?.metrics, 'mape', 'ensemble_mape', 'ml_mape'),
      }))
      .filter((anchor) => Number.isFinite(Number(anchor.mape))),
  ];

  if (anchors.length <= 1) return Math.min(8, Math.max(1, daysIntoFuture * 0.08));

  for (let index = 1; index < anchors.length; index += 1) {
    const previous = anchors[index - 1];
    const next = anchors[index];
    if (daysIntoFuture <= next.day) {
      const progress = (daysIntoFuture - previous.day) / Math.max(1, next.day - previous.day);
      return previous.mape + (next.mape - previous.mape) * Math.max(0, Math.min(1, progress));
    }
  }

  return anchors[anchors.length - 1].mape;
};

export default function AIPredictions() {
  const [isAiUnlocked, setIsAiUnlocked] = useState(hasAiAccess);
  const [data, setData] = useState<any>(null);
  const [meta, setMeta] = useState<PredictionMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [predictionWaitTimedOut, setPredictionWaitTimedOut] = useState(false);
  const [currentGrain, setCurrentGrain] = useState<string>('Wheat');
  const [currentState, setCurrentState] = useState<string>('All States');
  const [currentHorizon, setCurrentHorizon] = useState<number>(7);
  const [efficiencyPage, setEfficiencyPage] = useState(0);
  const [efficiencyYear, setEfficiencyYear] = useState<string>('all');
  const [efficiencyBrushSelection, setEfficiencyBrushSelection] = useState<{ startIndex: number; endIndex: number } | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const syncAiAccess = () => setIsAiUnlocked(hasAiAccess());
    syncAiAccess();
    window.addEventListener('storage', syncAiAccess);
    window.addEventListener(AUTH_SYNC_EVENT, syncAiAccess);
    return () => {
      window.removeEventListener('storage', syncAiAccess);
      window.removeEventListener(AUTH_SYNC_EVENT, syncAiAccess);
    };
  }, []);

  useEffect(() => {
    if (isAiUnlocked) return;
    setData(null);
    setMeta(null);
    setError('');
    setPredictionWaitTimedOut(false);
    setRefreshing(false);
    setLoading(false);
  }, [isAiUnlocked]);

  useEffect(() => {
    if (!isAiUnlocked || data) {
      setPredictionWaitTimedOut(false);
      return undefined;
    }

    setPredictionWaitTimedOut(false);
    const timeout = window.setTimeout(() => {
      setPredictionWaitTimedOut(true);
    }, AI_UNAVAILABLE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [isAiUnlocked, data, currentGrain, currentState, currentHorizon]);

  useEffect(() => {
    if (!isAiUnlocked) return undefined;

    let cancelled = false;
    const fetchMeta = async () => {
      try {
        const nextMeta = await api.getAiPredictionMeta();
        if (cancelled) return;
        setMeta(nextMeta);
        if (nextMeta.grains?.length && !nextMeta.grains.includes(currentGrain)) setCurrentGrain(nextMeta.grains[0]);
        if (nextMeta.states?.length && !nextMeta.states.includes(currentState)) setCurrentState('All States');
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err instanceof Error ? err.message : 'Error loading AI prediction metadata');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchMeta();
    const interval = window.setInterval(fetchMeta, AI_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isAiUnlocked]);

  useEffect(() => {
    if (!isAiUnlocked) return undefined;

    let cancelled = false;
    const fetchSelectedData = async () => {
      setRefreshing(true);
      try {
        const [predictionPayload, efficiencyPayload, reasoningPayload, livePricePayload] = await Promise.all([
          api.getAiPrediction(currentGrain, currentState),
          api.getAiEfficiency(currentGrain, currentState, currentHorizon).catch(() => null),
          api.getAiReasoning(currentGrain, currentState, currentHorizon).catch(() => null),
          api.getLiveDashboardPrices().catch(() => null),
        ]);
        const selectedReasoning = reasoningPayload?.reasoning || predictionPayload.reasoning;
        const reasoningEntry = selectedReasoning && (selectedReasoning.bullets || selectedReasoning.text || selectedReasoning.headline)
          ? { [currentHorizon]: selectedReasoning }
          : selectedReasoning;
        const efficiency = Array.isArray(efficiencyPayload?.efficiency)
          ? efficiencyPayload.efficiency
          : efficiencyPayload?.efficiency?.series || [];

        if (cancelled) return;
        setData({
          meta: predictionPayload.meta,
          predictions: { [currentGrain]: { [currentState]: predictionPayload.prediction } },
          actuals: { [currentGrain]: { [currentState]: predictionPayload.actuals } },
          forecastSeries: { [currentGrain]: { [currentState]: predictionPayload.forecast_series || [] } },
          reasoning: { [currentGrain]: { [currentState]: reasoningEntry } },
          historicalEfficiency: { [currentGrain]: { [currentState]: efficiency } },
          fallbackReason: predictionPayload.fallback_reason || efficiencyPayload?.fallback_reason || null,
          effectiveState: predictionPayload.state || currentState,
        });
        if (livePricePayload?.success && livePricePayload?.prices) {
          setLivePrices(livePricePayload.prices);
        }
        setError('');
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err instanceof Error ? err.message : 'Error loading selected AI prediction');
      } finally {
        if (!cancelled) {
          setRefreshing(false);
          setLoading(false);
        }
      }
    };

    if (meta) fetchSelectedData();
    if (!meta) return () => {
      cancelled = true;
    };

    const interval = window.setInterval(fetchSelectedData, AI_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isAiUnlocked, meta, currentGrain, currentState, currentHorizon]);

  useEffect(() => {
    setEfficiencyPage(0);
  }, [currentGrain, currentState, currentHorizon, efficiencyYear]);

  const chartData = useMemo(() => {
    if (!data || !data.forecastSeries || !data.actuals) return [];
    const grainSeries = data.forecastSeries[currentGrain]?.[currentState] || data.forecastSeries[currentGrain]?.["All States"] || [];
    const selectedActuals = data.actuals[currentGrain]?.[currentState] || data.actuals[currentGrain]?.["All States"] || [];
    const actuals = Array.isArray(selectedActuals) ? selectedActuals : selectedActuals.context || [];

    // Merge actuals and forecast for the chart using a map by timestamp
    const dataMap = new Map<number, any>();

    // Add actuals (historical)
    actuals.forEach((item: any) => {
      const ts = new Date(item.date).getTime();
      dataMap.set(ts, {
        date: new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        actualPrice: item.price,
        timestamp: ts,
        rawDate: item.date
      });
    });

    // Find the timestamp of the last actual data point
    const lastActualTimestamp = actuals.length > 0
      ? new Date(actuals[actuals.length - 1].date).getTime()
      : 0;

    // Add forecast (only for dates >= last actual date to prevent overlapping lines)
    grainSeries.forEach((item: any) => {
      const ts = new Date(item.date).getTime();

      // Skip backtest points that overlap with historical data
      if (ts < lastActualTimestamp) return;

      const existing = dataMap.get(ts) || {
        date: new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        timestamp: ts,
        rawDate: item.date
      };

      const daysIntoFuture = Math.max(0, (ts - lastActualTimestamp) / (1000 * 60 * 60 * 24));

      const statePreds = data.predictions[currentGrain]?.[currentState] || data.predictions[currentGrain]?.["All States"];
      const currentMape = interpolateForecastMape(daysIntoFuture, statePreds?.horizons);
      const margin = item.price * (currentMape / 100);
      const lowerBound = Number.isFinite(Number(item.lowerBound ?? item.lower_bound))
        ? Number(item.lowerBound ?? item.lower_bound)
        : item.price - margin;
      const upperBound = Number.isFinite(Number(item.upperBound ?? item.upper_bound))
        ? Number(item.upperBound ?? item.upper_bound)
        : item.price + margin;

      existing.forecastPrice = item.price;
      existing.lowerBound = lowerBound;
      existing.upperBound = upperBound;
      existing.confidenceRange = [lowerBound, upperBound];
      existing.bandWidth = margin * 2;
      existing.isAnchor = item.is_anchor;
      existing.anchorHorizon = item.anchor_horizon;

      dataMap.set(ts, existing);
    });

    const combined = Array.from(dataMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    // To connect the lines visually seamlessly, force the forecast line to start EXACTLY at the last actual price
    const lastActualIndex = combined.findLastIndex(item => item.actualPrice !== undefined);
    if (lastActualIndex >= 0) {
      const lastActual = combined[lastActualIndex];

      // Force the forecast line to hinge exactly at the last actual price
      lastActual.forecastPrice = lastActual.actualPrice;

      // Pinch the confidence band to zero at the hinge point for a smooth cone effect
      lastActual.lowerBound = lastActual.actualPrice;
      lastActual.upperBound = lastActual.actualPrice;
      lastActual.confidenceRange = [lastActual.actualPrice, lastActual.actualPrice];
      lastActual.bandWidth = 0;

      // Reset any hardcoded anchor flags from the backend
      combined.forEach(item => item.isAnchor = false);

      const horizons = [7, 30, 90];
      const statePreds = data.predictions[currentGrain]?.[currentState] || data.predictions[currentGrain]?.["All States"];
      horizons.forEach((h) => {
        const hData = statePreds?.horizons?.[h];
        if (hData && hData.target_date) {
            // Find the closest point on or just after the target date
            const targetTs = new Date(hData.target_date).getTime();
            let match = combined.find(item => item.timestamp >= targetTs);

            // Fallback for 90-day if it goes slightly out of bounds
            if (!match && h === 90) {
              match = combined[combined.length - 1];
            }

            if (match) {
                match.isAnchor = true;
                match.anchorHorizon = h;
            }
        }
      });
    }

    if (!lastActualTimestamp) return combined;

    const historyStartTimestamp = lastActualTimestamp - FORECAST_HISTORY_DAYS * 24 * 60 * 60 * 1000;
    return combined.filter((item) => (
      item.timestamp >= historyStartTimestamp
      || item.forecastPrice !== undefined
      || item.isAnchor
    ));
  }, [data, currentGrain, currentState]);

  const historicalEfficiency = data?.historicalEfficiency?.[currentGrain]?.[currentState] || data?.historicalEfficiency?.[currentGrain]?.["All States"] || [];

  const efficiencyRows = useMemo(() => {
    if (!historicalEfficiency || historicalEfficiency.length === 0) return [];
    return historicalEfficiency.map((item: any) => {
      const dateValue = item.date || item.origin_date;
      const actualPrice = item.actualPrice ?? item.actual_price;
      const predictedPrice = item.predictedPrice ?? item.predicted_price;
      const difference = predictedPrice != null && actualPrice != null ? predictedPrice - actualPrice : null;
      const errorPct = item.errorPct ?? item.error_pct;
      return {
        ...item,
        date: dateValue,
        originDate: item.origin_date,
        targetDate: item.date || item.target_date || dateValue,
        actualPrice,
        predictedPrice,
        difference,
        errorPct,
        method: item.method || item.selected_method || 'model',
        timestamp: new Date(dateValue).getTime(),
        displayDate: new Date(dateValue).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
      };
    }).filter((item: any) => Number.isFinite(item.timestamp))
      .sort((a: any, b: any) => a.timestamp - b.timestamp);
  }, [historicalEfficiency]);

  const filteredEfficiencyRows = useMemo(() => {
    if (efficiencyYear === 'all') return efficiencyRows;
    const selectedYear = Number(efficiencyYear);
    return efficiencyRows.filter((row: any) => new Date(row.originDate || row.date).getFullYear() === selectedYear);
  }, [efficiencyRows, efficiencyYear]);

  const efficiencyChartData = useMemo(() => {
    const rowsForChart = efficiencyRows;
    if (rowsForChart.length <= MAX_EFFICIENCY_CHART_POINTS) return rowsForChart;

    const bucketSize = Math.ceil(rowsForChart.length / MAX_EFFICIENCY_CHART_POINTS);
    const reduced = [];
    for (let index = 0; index < rowsForChart.length; index += bucketSize) {
      const bucket = rowsForChart.slice(index, index + bucketSize);
      const last = bucket[bucket.length - 1];
      const actualValues = bucket.map((item: any) => item.actualPrice).filter((value: any) => Number.isFinite(Number(value)));
      const predictedValues = bucket.map((item: any) => item.predictedPrice).filter((value: any) => Number.isFinite(Number(value)));
      reduced.push({
        ...last,
        actualPrice: actualValues.length ? actualValues.reduce((sum: number, value: number) => sum + Number(value), 0) / actualValues.length : last.actualPrice,
        predictedPrice: predictedValues.length ? predictedValues.reduce((sum: number, value: number) => sum + Number(value), 0) / predictedValues.length : last.predictedPrice,
      });
    }
    return reduced;
  }, [efficiencyRows]);

  const efficiencyDefaultBrushRange = useMemo(() => {
    if (!efficiencyChartData.length) return { startIndex: 0, endIndex: 0 };
    const firstTimestamp = efficiencyChartData[0].timestamp;
    const lastTimestamp = efficiencyChartData[efficiencyChartData.length - 1].timestamp;
    const centerTimestamp = firstTimestamp + ((lastTimestamp - firstTimestamp) / 2);
    const halfWindowMs = (EFFICIENCY_DEFAULT_WINDOW_DAYS / 2) * 24 * 60 * 60 * 1000;
    const startTimestamp = centerTimestamp - halfWindowMs;
    const endTimestamp = centerTimestamp + halfWindowMs;
    const startIndex = Math.max(0, efficiencyChartData.findIndex((item: any) => item.timestamp >= startTimestamp));
    const endMatch = efficiencyChartData.findIndex((item: any) => item.timestamp >= endTimestamp);
    const endIndex = endMatch === -1 ? efficiencyChartData.length - 1 : Math.max(startIndex, endMatch);
    return { startIndex, endIndex };
  }, [efficiencyChartData]);

  useEffect(() => {
    setEfficiencyBrushSelection(efficiencyDefaultBrushRange);
  }, [
    currentGrain,
    currentState,
    currentHorizon,
    efficiencyDefaultBrushRange.startIndex,
    efficiencyDefaultBrushRange.endIndex,
  ]);

  const activeEfficiencyBrushRange = efficiencyBrushSelection || efficiencyDefaultBrushRange;

  const efficiencyYearOptions = useMemo(() => {
    return Array.from(
      new Set(
        efficiencyRows
          .map((row: any) => new Date(row.originDate || row.date).getFullYear())
          .filter((year: number) => Number.isFinite(year))
      )
    ).sort((left, right) => right - left);
  }, [efficiencyRows]);

  useEffect(() => {
    if (efficiencyYear === 'all') return;
    if (!efficiencyYearOptions.length) {
      setEfficiencyYear('all');
      return;
    }
    if (!efficiencyYearOptions.includes(Number(efficiencyYear))) {
      setEfficiencyYear(String(efficiencyYearOptions[0]));
    }
  }, [efficiencyYear, efficiencyYearOptions]);

  const efficiencyTablePageCount = Math.max(1, Math.ceil(filteredEfficiencyRows.length / EFFICIENCY_TABLE_PAGE_SIZE));
  const safeEfficiencyPage = Math.min(efficiencyPage, efficiencyTablePageCount - 1);
  const efficiencyTableRows = filteredEfficiencyRows.slice(
    safeEfficiencyPage * EFFICIENCY_TABLE_PAGE_SIZE,
    safeEfficiencyPage * EFFICIENCY_TABLE_PAGE_SIZE + EFFICIENCY_TABLE_PAGE_SIZE
  );
  const efficiencyTableStart = filteredEfficiencyRows.length ? safeEfficiencyPage * EFFICIENCY_TABLE_PAGE_SIZE + 1 : 0;
  const efficiencyTableEnd = Math.min((safeEfficiencyPage + 1) * EFFICIENCY_TABLE_PAGE_SIZE, filteredEfficiencyRows.length);
  const efficiencyDateRange = efficiencyRows.length
    ? `${new Date(efficiencyRows[0].date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })} - ${new Date(efficiencyRows[efficiencyRows.length - 1].date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}`
    : 'N/A';
  const selectedPredictionData = data?.predictions?.[currentGrain]?.[currentState] || data?.predictions?.[currentGrain]?.["All States"];
  const latestActualPrice = toFiniteNumber(chartData.slice().reverse().find(item => item.actualPrice !== undefined)?.actualPrice);
  const modelCurrentPrice = toFiniteNumber(selectedPredictionData?.current_price) ?? latestActualPrice;
  const liveCurrentPrice = toFiniteNumber(livePrices[currentGrain]);
  const currentActualPrice = liveCurrentPrice ?? modelCurrentPrice;
  const animatedCurrentPrice = useAnimatedPrice(
    currentActualPrice,
    `${currentGrain}|${currentState}|${currentActualPrice ?? 'pending'}`
  );
  const hasCurrentPrice = currentActualPrice != null && currentActualPrice > 0;


  if (!isAiUnlocked) return <AIPredictionsLocked />;

  if (loading) return <AIPredictionsSkeleton />;

  if (error || !data) return <AIPredictionsLoadingNotice timedOut={predictionWaitTimedOut} error={error} />;

  const grains = meta?.grains?.length ? meta.grains : Object.keys(data.predictions);
  const predictionData = selectedPredictionData;
  const stateReasoning = data.reasoning?.[currentGrain]?.[currentState] || data.reasoning?.[currentGrain]?.["All States"];
  const reasoningData = stateReasoning?.[currentHorizon] || stateReasoning?.[String(currentHorizon)] || stateReasoning;
  const backtestData = data.backtest?.[currentGrain]?.[currentState] || data.backtest?.[currentGrain]?.["All States"];
  const currentColor = GRAIN_COLORS[currentGrain] || '#3B82F6';

  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isAnchor) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={5}
          stroke={currentColor}
          strokeWidth={2}
          fill="#0F172A"
        />
      );
    }
    return null;
  };

  const anchorPoints = chartData.filter(item => item.isAnchor);

  const availableStates = meta?.states?.length
    ? [...meta.states].sort((left, right) => left === 'All States' ? -1 : right === 'All States' ? 1 : left.localeCompare(right))
    : ['All States'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="bg-slate-900 text-white p-6 border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="text-blue-400" size={24} />
              <h2 className="text-xl font-bold tracking-tight">AI Price Intelligence</h2>
            </div>
            <p className="text-slate-400 text-sm">7, 30, and 90-day forecasting engine</p>
            {refreshing && <p className="text-xs text-blue-300 mt-1">Refreshing selected forecast...</p>}
          </div>

          <div className="mt-4 md:mt-0 flex gap-2 overflow-x-auto pb-2 md:pb-0">
              <select
                value={currentState}
                onChange={(e) => setCurrentState(e.target.value)}
                className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {availableStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            {grains.map((grain) => (
              <button
                key={grain}
                onClick={() => setCurrentGrain(grain)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  currentGrain === grain
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {grain}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-slate-400 text-sm mb-1">Current {currentGrain} Price</div>
            <div className="text-3xl font-bold flex items-baseline gap-1" style={{ color: currentColor }}>
              <span className={hasCurrentPrice ? 'tabular-nums' : 'tabular-nums animate-pulse'}>
                {formatCurrency(animatedCurrentPrice)}
              </span>
              <span className="text-sm font-normal text-slate-400">/Quintal</span>
            </div>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>Last actuals: {predictionData?.last_actual_date || predictionData?.last_data_date || 'N/A'}</div>
            <div>Release: {data.meta?.generated_at ? new Date(data.meta.generated_at).toLocaleString('en-IN') : 'N/A'}</div>
          </div>
        </div>
        {data.fallbackReason && (
          <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            Showing {data.effectiveState} forecast for the selected state: {data.fallbackReason}
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Price Forecast</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[7, 30, 90].map((horizon, index) => {
            const hData = predictionData?.horizons?.[horizon];
            if (!hData) {
              return (
                <div key={horizon} className="border border-slate-200 rounded-xl p-4 animate-pulse">
                  <div className="mb-3 h-4 w-28 rounded bg-slate-200" />
                  <div className="mb-3 h-8 w-24 rounded bg-slate-200" />
                  <div className="mb-4 h-6 w-20 rounded bg-slate-100" />
                  <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
                    <div className="h-8 rounded bg-slate-100" />
                    <div className="h-8 rounded bg-slate-100" />
                    <div className="h-8 rounded bg-slate-100" />
                  </div>
                </div>
              );
            }

            const anchorPoint = anchorPoints[index];
            const dynamicPrice = hData.predicted_price;
            const changePct = hasCurrentPrice ? ((dynamicPrice - Number(currentActualPrice)) / Number(currentActualPrice)) * 100 : null;
            const isUp = changePct == null ? true : changePct >= 0;
            const mape = getMetric(hData.metrics, 'mape', 'ensemble_mape');
            const mae = getMetric(hData.metrics, 'mae', 'ensemble_mae', 'ml_mae');
            const confidence = mape == null ? null : Math.max(0, 100 - mape);

            const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight;
            const trendColor = isUp ? 'text-emerald-600' : 'text-red-600';
            const trendBg = isUp ? 'bg-emerald-50' : 'bg-red-50';

            return (
              <div
                key={horizon}
                onClick={() => setCurrentHorizon(horizon)}
                className={`border rounded-xl p-4 cursor-pointer transition-all ${
                  currentHorizon === horizon
                    ? 'border-blue-500 shadow-md ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="text-slate-500 text-sm font-medium mb-2">{horizon}-Day Forecast</div>
                <div className="text-2xl font-bold text-slate-800 mb-2">
                  {formatCurrency(dynamicPrice)}
                </div>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium mb-3 ${trendBg} ${trendColor}`}>
                  <TrendIcon size={14} />
                  {changePct == null ? 'Updating...' : `${Math.abs(changePct).toFixed(2)}% ${isUp ? 'Rise' : 'Fall'}`}
                </div>
                <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-y-2 text-xs">
                  <div>
                    <div className="text-slate-400">Confidence</div>
                    <div className="font-medium text-slate-700">
                      {confidence == null ? 'N/A' : formatPercent(confidence, 1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Error (MAPE)</div>
                    <div className="font-medium text-slate-700">{formatPercent(mape)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">MAE</div>
                    <div className="font-medium text-slate-700">{mae == null ? 'After retrain' : formatCurrency(mae, 2)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-[300px] w-full mb-8">
          {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                domain={[
                  (dataMin: number) => Math.floor(dataMin * 0.97),
                  (dataMax: number) => Math.ceil(dataMax * 1.02),
                ]}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any, name: string, props: any) => {
                  if (name === 'Confidence Band' && props && props.payload && props.payload.lowerBound != null && props.payload.upperBound != null) {
                    const lower = Math.round(props.payload.lowerBound).toLocaleString('en-IN');
                    const upper = Math.round(props.payload.upperBound).toLocaleString('en-IN');
                    return [`₹${lower} - ₹${upper}`, 'Confidence Band'];
                  }
                  if (name === 'confidenceRange') {
                    return ['', ''];
                  }
                  return [formatCurrency(value), name === 'actualPrice' ? 'Actual' : name === 'forecastPrice' ? 'Forecast' : name];
                }}
                labelStyle={{ fontWeight: 'bold', color: '#334155' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

              <Area
                type="monotone"
                dataKey="confidenceRange"
                stroke="none"
                fill={currentColor}
                fillOpacity={0.16}
                name="Confidence Band"
                connectNulls={true}
              />

              <Line
                type="monotone"
                dataKey="actualPrice"
                stroke="#64748B"
                strokeWidth={2}
                dot={false}
                name="Historical"
                connectNulls={true}
              />

              <Line
                type="monotone"
                dataKey="forecastPrice"
                stroke={currentColor}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={renderCustomDot}
                name="AI Forecast"
                connectNulls={true}
              />
            </ComposedChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl bg-slate-50">
              <div className="h-28 w-full max-w-4xl animate-pulse rounded-lg bg-white shadow-sm" />
            </div>
          )}
        </div>

        {reasoningData && (
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <Info className="text-blue-500" size={18} />
              <h4 className="font-semibold text-slate-800">
                {reasoningData.headline || `Market Reasoning (${currentHorizon}-Day)`}
              </h4>
            </div>
            {Array.isArray(reasoningData.bullets) && reasoningData.bullets.length > 0 ? (
              <ul className="mb-4 space-y-2 text-sm leading-relaxed text-slate-600">
                {reasoningData.bullets.map((bullet: string, idx: number) => (
                  <li key={idx} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: currentColor }}></span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                {reasoningData.text}
              </p>
            )}

            {reasoningData.key_drivers && reasoningData.key_drivers.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Key Drivers</div>
                <div className="flex flex-wrap gap-2">
                  {reasoningData.key_drivers.map((driver: any, idx: number) => (
                    <div key={idx} className="bg-white border border-slate-200 text-slate-600 text-xs px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentColor, opacity: Math.min(1, 0.3 + ((Number(driver.score) || 0.2) * 0.7)) }}></div>
                      {driver.feature.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Model Validation / Backtesting Table */}
        {backtestData && backtestData.comparisons && backtestData.comparisons.length > 0 && (
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Model Validation & Backtesting
                </h4>
                <p className="text-sm text-slate-500 mt-1">
                  Predictions made on {new Date(backtestData.backtestDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} vs Actual Prices
                </p>
              </div>
              <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-sm">
                Avg Error: <span className="font-bold text-slate-800">{backtestData.meanAbsoluteErrorPct}%</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Predicted Price</th>
                    <th className="px-4 py-3 font-semibold">Actual Price</th>
                    <th className="px-4 py-3 font-semibold">Difference</th>
                    <th className="px-4 py-3 font-semibold">Error %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backtestData.comparisons.map((row: any, idx: number) => (
                    <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                        {new Date(row.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatCurrency(row.predictedPrice, 2)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(row.actualPrice, 2)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center font-medium text-slate-700 whitespace-nowrap">
                          {row.difference > 0 ? '+' : ''}{row.difference.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.errorPct < 3 ? 'bg-green-100 text-green-700' : row.errorPct < 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {row.errorPct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 10-Year Model Efficiency Graph */}
        {historicalEfficiency && historicalEfficiency.length > 0 && (
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="text-purple-500" size={18} />
                  Historical Model Efficiency
                </h4>
                <p className="text-sm text-slate-500 mt-1">
                  State-wise backtesting: Predicted vs Actual Prices ({efficiencyDateRange})
                </p>
              </div>
              <div className="mt-3 sm:mt-0 text-sm text-slate-500">
                {efficiencyRows.length.toLocaleString('en-IN')} comparisons
              </div>

            </div>

            <div className="h-[300px] w-full bg-slate-50 rounded-xl p-4 border border-slate-100">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={efficiencyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any, _name: string, props: any) => {
                      return [formatCurrency(value), props?.dataKey === 'actualPrice' ? 'Actual Price' : 'Predicted Price'];
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#334155' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Brush
                    key={`${currentGrain}-${currentState}-${currentHorizon}-${efficiencyChartData.length}`}
                    data={efficiencyChartData}
                    dataKey="displayDate"
                    height={30}
                    stroke="#A78BFA"
                    travellerWidth={12}
                    startIndex={activeEfficiencyBrushRange.startIndex}
                    endIndex={activeEfficiencyBrushRange.endIndex}
                    onChange={(range) => {
                      const startIndex = Number(range?.startIndex);
                      const endIndex = Number(range?.endIndex);
                      if (Number.isFinite(startIndex) && Number.isFinite(endIndex)) {
                        setEfficiencyBrushSelection({
                          startIndex: Math.max(0, Math.min(startIndex, endIndex)),
                          endIndex: Math.min(efficiencyChartData.length - 1, Math.max(startIndex, endIndex)),
                        });
                      }
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="actualPrice"
                    stroke="#64748B"
                    strokeWidth={2}
                    dot={false}
                    name="Actual Price"
                    connectNulls={true}
                  />
                  <Line
                    type="monotone"
                    dataKey="predictedPrice"
                    stroke="#A78BFA"
                    strokeWidth={2}
                    dot={false}
                    name="Predicted Price"
                    connectNulls={true}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <h5 className="font-semibold text-slate-800">Predicted vs Actual Comparison</h5>
                  <p className="text-xs text-slate-500">
                    Showing {efficiencyTableStart}-{efficiencyTableEnd} of {filteredEfficiencyRows.length.toLocaleString('en-IN')} rows for {currentGrain} / {currentState} / {currentHorizon}-day horizon
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs font-medium text-slate-500" htmlFor="efficiency-year">
                    Year
                  </label>
                  <select
                    id="efficiency-year"
                    value={efficiencyYear}
                    onChange={(event) => setEfficiencyYear(event.target.value)}
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="all">All years</option>
                    {efficiencyYearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setEfficiencyPage((page) => Math.max(0, page - 1))}
                    disabled={safeEfficiencyPage === 0}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-500">
                    Page {safeEfficiencyPage + 1} / {efficiencyTablePageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEfficiencyPage((page) => Math.min(efficiencyTablePageCount - 1, page + 1))}
                    disabled={safeEfficiencyPage >= efficiencyTablePageCount - 1}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white"
                  >
                    Next
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Origin Date</th>
                      <th className="px-4 py-3 font-semibold">Target Date</th>
                      <th className="px-4 py-3 font-semibold">Predicted</th>
                      <th className="px-4 py-3 font-semibold">Actual</th>
                      <th className="px-4 py-3 font-semibold">Difference</th>
                      <th className="px-4 py-3 font-semibold">Error %</th>
                      <th className="px-4 py-3 font-semibold">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {efficiencyTableRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                          No comparison rows are available for this selection. Try another state, grain, horizon, or year.
                        </td>
                      </tr>
                    )}
                    {efficiencyTableRows.map((row: any, idx: number) => {
                      const difference = Number(row.difference);
                      const errorPct = Number(row.errorPct);
                      return (
                        <tr key={`${row.originDate || row.date}-${row.targetDate}-${idx}`} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                            {row.originDate ? new Date(row.originDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            {row.targetDate ? new Date(row.targetDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatCurrency(row.predictedPrice, 2)}</td>
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{formatCurrency(row.actualPrice, 2)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                            {Number.isFinite(difference) ? `${difference >= 0 ? '+' : ''}${difference.toFixed(2)}` : 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${Number.isFinite(errorPct) && errorPct < 5 ? 'bg-green-100 text-green-700' : Number.isFinite(errorPct) && errorPct < 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                              {Number.isFinite(errorPct) ? `${errorPct.toFixed(2)}%` : 'N/A'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-500">{row.method}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
