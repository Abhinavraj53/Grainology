import { useState, useEffect } from 'react';
import { supabase, WeatherData } from '../lib/supabase';
import { Cloud, Droplets, Wind, Thermometer, MapPin, Calendar, RefreshCw } from 'lucide-react';
import CSVUpload from './CSVUpload';

interface Profile {
  id: string;
  state?: string;
  district?: string;
}

export default function WeatherForecast() {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [customerState, setCustomerState] = useState<string>('');

  // Load customer profile to get default state
  useEffect(() => {
    loadCustomerProfile();
    loadStates();
  }, []);

  // Load weather when district is selected
  useEffect(() => {
    if (selectedDistrict && selectedState) {
      loadWeatherData(selectedDistrict, selectedState);
    }
  }, [selectedDistrict, selectedState]);

  const loadCustomerProfile = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, state, district')
        .eq('id', session.data.session.user.id)
        .maybeSingle();

      if (!error && data && data.state) {
        setCustomerState(data.state);
        setSelectedState(data.state);
        // Load districts for customer's state
        loadDistricts(data.state);
      }
    } catch (error) {
      console.error('Error loading customer profile:', error);
    }
  };

  const loadStates = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/weather/states`,
        {
          headers: {
            'Authorization': `Bearer ${token || ''}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const statesData = await response.json();
        setStates(statesData);
      }
    } catch (error) {
      console.error('Error loading states:', error);
    }
  };

  const loadDistricts = async (state: string) => {
    if (!state) return;
    
    setLoadingDistricts(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/weather/districts/${encodeURIComponent(state)}`,
        {
          headers: {
            'Authorization': `Bearer ${token || ''}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const districtsData = await response.json();
        setDistricts(districtsData);
        
        // If customer has district set, select it
        if (customerState === state) {
          const session = await supabase.auth.getSession();
          const { data } = await supabase
            .from('profiles')
            .select('district')
            .eq('id', session.data.session?.user.id)
            .maybeSingle();
          
          if (data?.district && districtsData.includes(data.district)) {
            setSelectedDistrict(data.district);
          } else if (districtsData.length > 0) {
            // Select first district as default
            setSelectedDistrict(districtsData[0]);
          }
        } else if (districtsData.length > 0) {
          setSelectedDistrict(districtsData[0]);
        }
      }
    } catch (error) {
      console.error('Error loading districts:', error);
    } finally {
      setLoadingDistricts(false);
    }
  };

  const loadWeatherData = async (district: string, state: string) => {
    if (!district || !state) return;
    
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/weather/forecast?location=${encodeURIComponent(district)}&state=${encodeURIComponent(state)}&days=7`,
        {
          headers: {
            'Authorization': `Bearer ${token || ''}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const forecast = await response.json();
        // Transform forecast data to match our format
        const transformedData = forecast.forecasts.map((f: any) => ({
          id: `${forecast.location}-${f.date}`,
          location: forecast.location,
          state: forecast.state,
          latitude: forecast.latitude,
          longitude: forecast.longitude,
          date: f.date,
          temperature_min: f.temperature_min,
          temperature_max: f.temperature_max,
          humidity: f.humidity,
          rainfall: f.rainfall,
          wind_speed: f.wind_speed,
          weather_condition: f.weather_condition,
          forecast_data: f.forecast_data,
          created_at: new Date().toISOString()
        }));
        setWeatherData(transformedData);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch weather' }));
        console.error('Error fetching weather:', errorData);
        
        // Show user-friendly error message
        if (response.status === 503 && errorData.message) {
          alert(`⚠️ ${errorData.message}`);
        } else {
          alert(`⚠️ Unable to fetch weather data. Please check your API configuration.`);
        }
        setWeatherData([]);
      }
    } catch (error) {
      console.error('Error loading weather data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedDistrict(''); // Reset district when state changes
    setDistricts([]);
    setWeatherData([]);
    if (state) {
      loadDistricts(state);
    }
  };

  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district);
  };

  const refreshWeather = () => {
    if (selectedDistrict && selectedState) {
      loadWeatherData(selectedDistrict, selectedState);
    }
  };

  // Load weather data from database after CSV upload (fallback)
  const loadFromDatabase = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const params = new URLSearchParams();
      if (selectedDistrict) {
        params.append('location', selectedDistrict);
      }
      // Load from today onwards
      const today = new Date().toISOString().split('T')[0];
      params.append('date__gte', today);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/weather?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token || ''}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const transformedData = data.map((w: any) => ({
          id: w.id || w._id || `${w.location}-${w.date}`,
          location: w.location,
          state: w.forecast_data?.state || w.state,
          latitude: w.latitude,
          longitude: w.longitude,
          date: w.date,
          temperature_min: w.temperature_min,
          temperature_max: w.temperature_max,
          humidity: w.humidity,
          rainfall: w.rainfall,
          wind_speed: w.wind_speed,
          weather_condition: w.weather_condition,
          forecast_data: w.forecast_data,
          created_at: w.createdAt,
        }));
        setWeatherData(transformedData);
      } else {
        console.error('Failed to load weather data from database');
      }
    } catch (error) {
      console.error('Error loading weather data from database:', error);
    }
  };

  const getWeatherIcon = (condition?: string) => {
    if (!condition) return <Cloud className="w-8 h-8 text-gray-400" />;
    const lower = condition.toLowerCase();
    if (lower.includes('rain') || lower.includes('shower')) {
      return <Droplets className="w-8 h-8 text-blue-500" />;
    }
    if (lower.includes('cloud')) {
      return <Cloud className="w-8 h-8 text-gray-500" />;
    }
    return <Cloud className="w-8 h-8 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      <CSVUpload type="weather" onUploadSuccess={loadFromDatabase} />
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Cloud className="w-6 h-6 text-blue-600" />
              Weather Forecast
            </h2>
            <p className="text-gray-600">7-day weather forecast for your location</p>
          </div>
          {selectedDistrict && selectedState && (
            <button
              onClick={refreshWeather}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>

        {/* State and District Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select State
            </label>
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select State</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select District
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              disabled={!selectedState || loadingDistricts}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {loadingDistricts ? 'Loading districts...' : selectedState ? 'Select District' : 'Select State First'}
              </option>
              {districts.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>
        </div>

        {customerState && selectedState === customerState && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <MapPin className="w-4 h-4 inline mr-1" />
              Showing weather for your registered location: <strong>{selectedDistrict}, {selectedState}</strong>
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4">Loading weather data...</p>
          </div>
        ) : weatherData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Cloud className="w-12 h-12 mx-auto mb-4 opacity-30" />
            {!selectedDistrict ? (
              <>
                <p>Please select a state and district to view weather forecast</p>
                {customerState && (
                  <p className="text-sm mt-2">Default location set to: <strong>{customerState}</strong></p>
                )}
              </>
            ) : (
              <p>No weather data available for this location</p>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-800">
                  {weatherData[0]?.location || selectedDistrict}, {weatherData[0]?.state || selectedState}
                </h3>
              </div>
              {weatherData[0]?.forecast_data?.formatted_address && (
                <p className="text-sm text-gray-600">{weatherData[0].forecast_data.formatted_address}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weatherData.map((weather) => (
                <div key={weather.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <p className="font-semibold text-gray-800">{weather.location}</p>
                    </div>
                    {getWeatherIcon(weather.weather_condition)}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(weather.date).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}</span>
                  </div>

                  {weather.weather_condition && (
                    <p className="text-sm text-gray-700 mb-3 capitalize">{weather.weather_condition}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {(weather.temperature_min !== undefined && weather.temperature_max !== undefined) && (
                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                          <Thermometer className="w-3 h-3" />
                          <span>Temperature</span>
                        </div>
                        <p className="text-sm font-bold text-gray-800">
                          {weather.temperature_min}° - {weather.temperature_max}°C
                        </p>
                      </div>
                    )}

                    {weather.humidity !== undefined && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                          <Droplets className="w-3 h-3" />
                          <span>Humidity</span>
                        </div>
                        <p className="text-sm font-bold text-gray-800">{weather.humidity}%</p>
                      </div>
                    )}

                    {weather.rainfall !== undefined && parseFloat(weather.rainfall) > 0 && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                          <Droplets className="w-3 h-3" />
                          <span>Rainfall</span>
                        </div>
                        <p className="text-sm font-bold text-gray-800">{weather.rainfall} mm</p>
                      </div>
                    )}

                    {weather.wind_speed !== undefined && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                          <Wind className="w-3 h-3" />
                          <span>Wind Speed</span>
                        </div>
                        <p className="text-sm font-bold text-gray-800">{weather.wind_speed} km/h</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Agricultural Weather Tips</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="font-bold">•</span>
            <span>Monitor rainfall patterns for irrigation planning</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">•</span>
            <span>High humidity may increase risk of fungal diseases</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">•</span>
            <span>Plan harvesting activities during favorable weather conditions</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">•</span>
            <span>Strong winds may affect crop protection measures</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
