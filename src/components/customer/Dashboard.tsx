import { useState, useEffect } from 'react';
import { Profile, Order, Offer } from '../../lib/supabase';
import { Cloud, Package, ShoppingCart, AlertCircle } from 'lucide-react';
import MandiBhaav from '../MandiBhaav';
import { WeatherCache } from '../../lib/sessionStorage';

interface DashboardProps {
  profile: Profile | null;
  orders: Order[];
  offers: Offer[];
}


export default function Dashboard({ profile, orders, offers }: DashboardProps) {

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const [weather, setWeather] = useState<{
    location: string;
    state: string;
    temperature_min: number;
    temperature_max: number;
    humidity: number;
    rainfall: number;
    weather_condition: string;
  } | null>(null);

  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    loadWeather(); // Load weather even without profile (uses default Patna, Bihar)
  }, [profile]);


  const loadWeather = async () => {
    try {
      setWeatherLoading(true);
      // Prefer user's district/state; fallback to Patna, Bihar
      const location = profile?.district || 'Patna';
      const state = profile?.state || 'Bihar';

      // Check cache first
      const cached = WeatherCache.get(location, state) as {
        location: string;
        state: string;
        temperature_min: number;
        temperature_max: number;
        humidity: number;
        rainfall: number;
        weather_condition: string;
      } | null;
      if (cached) {
        setWeather(cached);
        setWeatherLoading(false);
        return;
      }

      // Fetch from API
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const params = new URLSearchParams({
        location,
        state,
      });

      const token = localStorage.getItem('auth_token') || '';

      const response = await fetch(`${baseUrl}/weather/current?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch' }));
        console.error('Failed to fetch weather data:', errorData);
        // Set default weather data if API fails
        const defaultWeather = {
          location,
          state,
          temperature_min: 0,
          temperature_max: 0,
          humidity: 0,
          rainfall: 0,
          weather_condition: 'Data not available',
        };
        setWeather(defaultWeather);
        WeatherCache.set(location, state, defaultWeather);
        return;
      }

      const data = await response.json();
      if (data.error) {
        console.error('Weather API error:', data.error);
        const defaultWeather = {
          location,
          state,
          temperature_min: 0,
          temperature_max: 0,
          humidity: 0,
          rainfall: 0,
          weather_condition: 'Data not available',
        };
        setWeather(defaultWeather);
        WeatherCache.set(location, state, defaultWeather);
        return;
      }

      const weatherData = {
        location: data.location || location,
        state: data.state || state,
        temperature_min: data.temperature_min || 0,
        temperature_max: data.temperature_max || 0,
        humidity: data.humidity || 0,
        rainfall: data.rainfall || 0,
        weather_condition: data.weather_condition || data.weather_description || 'Unknown',
      };
      setWeather(weatherData);
      // Cache the data
      WeatherCache.set(location, state, weatherData);
    } catch (error) {
      console.error('Error loading weather:', error);
      // Set default on error
      const location = profile?.district || 'Patna';
      const state = profile?.state || 'Bihar';
      const defaultWeather = {
        location,
        state,
        temperature_min: 0,
        temperature_max: 0,
        humidity: 0,
        rainfall: 0,
        weather_condition: 'Data not available',
      };
      setWeather(defaultWeather);
      WeatherCache.set(location, state, defaultWeather);
    } finally {
      setWeatherLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-700">Loading profile...</p>
        </div>
      </div>
    );
  }

  const myOffers = offers.filter(o => o.seller_id === profile.id);
  const pendingOrders = orders.filter(o => o.status === 'Pending Approval');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">My Orders</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{orders.length}</p>
            </div>
            <ShoppingCart className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </div>

        {profile.role === 'farmer' && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Offers</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{myOffers.length}</p>
              </div>
              <Package className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Approval</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{pendingOrders.length}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-orange-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-teal-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {orders.filter(o => o.status === 'Completed').length}
              </p>
            </div>
            <Package className="w-12 h-12 text-teal-500 opacity-20" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Weather & Advisory</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200"> 
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Weather</p>
                  <p className="text-xs text-gray-500">
                    {weather
                      ? `${weather.location}, ${weather.state}`
                      : profile?.district && profile?.state
                        ? `${profile.district}, ${profile.state}`
                        : 'Location'}
                  </p>
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {weather
                    ? `${Math.round((weather.temperature_min + weather.temperature_max) / 2)}°C`
                    : weatherLoading
                      ? '...'
                      : '--'}
                </p>
              </div>
              <p className="text-sm text-gray-600">
                {weather
                  ? `${weather.weather_condition}. Humidity ${Math.round(weather.humidity || 0)}%.` +
                    (weather.rainfall && weather.rainfall > 0 ? ` Rainfall ${weather.rainfall} mm.` : '')
                  : weatherLoading
                    ? 'Loading latest weather from Open-Meteo...'
                    : 'Weather data not available.'}
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-gray-800 mb-2">Crop Advisory</p>
              <p className="text-sm text-gray-600">
                Good time for harvesting paddy. Moisture levels optimal for storage.
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm font-medium text-gray-800 mb-2">Market Tip</p>
              <p className="text-sm text-gray-600">
                Wheat prices expected to rise next week due to festival demand.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mandi Bhav Component with all filters */}
      <MandiBhaav />

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commodity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity (MT)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/Quintal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {order.offer?.commodity || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.quantity_mt}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">₹{order.final_price_per_quintal}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'Pending Approval' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'Approved - Awaiting Logistics' ? 'bg-purple-100 text-purple-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(order.sauda_confirmation_date || order.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No orders yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
