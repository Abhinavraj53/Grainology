import React, { useEffect, useState, useMemo } from 'react';
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
} from 'recharts';
import { Brain, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

const API_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

const GRAIN_COLORS: Record<string, string> = {
  Wheat: '#F59E0B', // Amber
  Paddy: '#10B981', // Emerald
  Maize: '#F97316', // Orange
  Mustard: '#A78BFA', // Purple
};

export default function AIPredictions() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentGrain, setCurrentGrain] = useState<string>('Wheat');
  const [currentHorizon, setCurrentHorizon] = useState<number>(7);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/mandi/predictions`);
        if (!res.ok) throw new Error('Failed to load predictions');
        const json = await res.json();
        if (json.success && json.data && json.data.predictions) {
          setData(json.data);
          const grains = Object.keys(json.data.predictions);
          if (grains.length > 0 && !grains.includes(currentGrain)) {
            setCurrentGrain(grains[0]);
          }
        } else {
          throw new Error('Invalid prediction data format');
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Error loading AI predictions');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartData = useMemo(() => {
    if (!data || !data.forecastSeries || !data.actuals) return [];
    const grainSeries = data.forecastSeries[currentGrain] || [];
    const actuals = data.actuals[currentGrain]?.context || [];
    
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
      
      // Find the true MAPE from the 30-day forecast to anchor the cone
      const h30 = data.predictions[currentGrain]?.horizons?.[30];
      const targetMape = h30?.metrics?.ensemble_mape || 1.72;
      
      // Scale margin from 0 to targetMape over 30 days
      const currentMape = Math.min(targetMape, (daysIntoFuture / 30) * targetMape);
      const margin = item.price * (currentMape / 100);

      existing.forecastPrice = item.price;
      existing.lowerBound = item.price - margin;
      existing.upperBound = item.price + margin;
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
      lastActual.bandWidth = 0;
      
      // Reset any hardcoded anchor flags from the backend
      combined.forEach(item => item.isAnchor = false);
      
      const horizons = [7, 30, 90];
      horizons.forEach((h) => {
        const hData = data.predictions[currentGrain]?.horizons?.[h];
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

    return combined;
  }, [data, currentGrain]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin text-primary-600 mb-4">
          <Brain size={32} />
        </div>
        <p className="text-slate-500 font-medium animate-pulse">Loading AI Price Intelligence...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[300px]">
        <Info className="text-slate-400 mb-2" size={32} />
        <p className="text-slate-500">AI predictions are currently unavailable.</p>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  const grains = Object.keys(data.predictions);
  const predictionData = data.predictions[currentGrain];
  const reasoningData = data.reasoning?.[currentGrain]?.[currentHorizon];
  const backtestData = data.backtest?.[currentGrain];
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
  // Always prefer the live API-sourced current_price from predictions over the historical actuals tail
  // (actuals tail can be stale from the CSV pipeline)
  const currentActualPrice = predictionData?.current_price || chartData.slice().reverse().find(item => item.actualPrice !== undefined)?.actualPrice || 1;

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
          </div>
          
          <div className="mt-4 md:mt-0 flex gap-2 overflow-x-auto pb-2 md:pb-0">
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
              ₹{currentActualPrice?.toLocaleString('en-IN') || '---'}
              <span className="text-sm font-normal text-slate-400">/Quintal</span>
            </div>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>Last actuals: {predictionData?.last_data_date || 'N/A'}</div>
            <div>Forecast as of: {predictionData?.forecast_as_of || 'N/A'}</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Price Forecast</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[7, 30, 90].map((horizon, index) => {
            const hData = predictionData?.horizons?.[horizon];
            if (!hData) return null;
            
            const anchorPoint = anchorPoints[index];
            const dynamicPrice = hData.predicted_price;
            const changePct = ((dynamicPrice - currentActualPrice) / currentActualPrice) * 100;
            const isUp = changePct >= 0;
            
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
                  ₹{dynamicPrice?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium mb-3 ${trendBg} ${trendColor}`}>
                  <TrendIcon size={14} />
                  {Math.abs(changePct).toFixed(2)}% {isUp ? 'Rise' : 'Fall'}
                </div>
                <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-y-2 text-xs">
                  <div>
                    <div className="text-slate-400">Confidence</div>
                    <div className="font-medium text-slate-700">
                      {hData.confidence_level || 'High'} ({Math.max(0, 100 - (hData.metrics?.ensemble_mape || 0)).toFixed(1)}%)
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Error (MAPE)</div>
                    <div className="font-medium text-slate-700">{hData.metrics?.ensemble_mape?.toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Avg. Miss (MAE)</div>
                    <div className="font-medium text-slate-700">₹{hData.metrics?.ensemble_mae?.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-[300px] w-full mb-8">
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
                  // Hide the standalone lowerBound from tooltip if it appears
                  if (name === 'lowerBound' || name === 'Lower Bound') {
                    return ['', '']; 
                  }
                  return [`₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, name === 'actualPrice' ? 'Actual' : name === 'forecastPrice' ? 'Forecast' : name];
                }}
                labelStyle={{ fontWeight: 'bold', color: '#334155' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              
              {/*
                Confidence band: two Area layers, no stackId.
                upperBound fills from axis-floor up to upper → grain colour at 18% opacity.
                lowerBound fills from axis-floor up to lower  → white at 100% opacity,
                erasing the grain fill below the lower bound.
                Both layers must NOT use stackId so recharts keeps Y-axis auto-scaled.
              */}
              <Area
                type="monotone"
                dataKey="upperBound"
                stroke="none"
                fill={currentColor}
                fillOpacity={0.18}
                name="Confidence Band"
                connectNulls={true}
              />
              <Area
                type="monotone"
                dataKey="lowerBound"
                stroke="none"
                fill="#ffffff"
                fillOpacity={1}
                legendType="none"
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
        </div>

        {reasoningData && (
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <Info className="text-blue-500" size={18} />
              <h4 className="font-semibold text-slate-800">AI Reasoning ({currentHorizon}-Day)</h4>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-auto">
                {reasoningData.source === 'gemini' ? 'Gemini AI' : 'Rule Engine'}
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              {reasoningData.text}
            </p>
            
            {reasoningData.key_drivers && reasoningData.key_drivers.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Key Drivers</div>
                <div className="flex flex-wrap gap-2">
                  {reasoningData.key_drivers.map((driver: any, idx: number) => (
                    <div key={idx} className="bg-white border border-slate-200 text-slate-600 text-xs px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentColor, opacity: 0.3 + (driver.score * 2) }}></div>
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
                      <td className="px-4 py-3 text-slate-600">₹{row.predictedPrice.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">₹{row.actualPrice.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 font-medium ${row.difference > 0 ? 'text-red-500' : 'text-green-500'}`}>
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
      </div>
    </div>
  );
}
