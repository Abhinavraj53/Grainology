import { useState, useEffect } from 'react';
import { supabase, WeatherData } from '../lib/supabase';
import { Cloud, Droplets, Wind, Thermometer, MapPin, Calendar, RefreshCw, Loader2 } from 'lucide-react';
import { WeatherCache } from '../lib/sessionStorage';
import Weathersonu from './weathersonu';

interface LocationInfo {
  lat: number;
  lon: number;
  city: string;
  state: string;
  country: string;
}

export default function WeatherForecast() {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [place, setPlace] = useState<LocationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [locationDetected, setLocationDetected] = useState(false);

  // Auto-detect location on component mount
  useEffect(() => {
    detectLocation();
  }, []);

  // Load weather when location is detected
  useEffect(() => {
    if (coords && place) {
      loadWeatherData(coords.lat, coords.lon, place.city, place.state);
    }
  }, [coords, place]);

  const detectLocation = () => {
    setError('');
    setCoords(null);
    setPlace(null);
    setWeatherData([]);
    setLoading(true);
    setLocationDetected(false);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser. Please enable location access.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setCoords({ lat, lon });

          // Get location name using OpenStreetMap Nominatim (FREE)
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
          );
          const geo = await geoRes.json();

          const locationInfo: LocationInfo = {
            lat,
            lon,
            city: geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.county || 'Unknown',
            state: geo.address?.state || geo.address?.region || 'Unknown',
            country: geo.address?.country || 'Unknown'
          };

          setPlace(locationInfo);
          setLocationDetected(true);
        } catch (err) {
          console.error('Error fetching location:', err);
          setError('Failed to fetch location information. Please try again.');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Location access denied. Please enable location permissions in your browser settings.');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const loadWeatherData = async (lat: number, lon: number, city: string, state: string) => {
    if (!lat || !lon || !city) return;
    
    setLoading(true);
    try {
      // Check cache first
      const cached = WeatherCache.getForecast(city, state);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setWeatherData(cached);
        setLoading(false);
        return;
      }

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      // Use city name and state to fetch weather from backend
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/weather/forecast?location=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&days=7`,
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
          latitude: forecast.latitude || lat,
          longitude: forecast.longitude || lon,
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
        // Cache the data
        WeatherCache.setForecast(city, state, transformedData);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch weather' }));
        console.error('Error fetching weather:', errorData);
        
        // Show user-friendly error message
        if (response.status === 503 && errorData.message) {
          setError(errorData.message);
        } else if (response.status === 429) {
          setError('Too many requests. Please wait a few minutes and try again.');
        } else {
          setError('Unable to fetch weather data. Please try again later.');
        }
        setWeatherData([]);
      }
    } catch (error) {
      console.error('Error loading weather data:', error);
      setError('Failed to load weather data. Please try again.');
      setWeatherData([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshWeather = () => {
    if (coords && place) {
      loadWeatherData(coords.lat, coords.lon, place.city, place.state);
    } else {
      detectLocation();
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
      {/* Location & Weather KPI Card */}
      <Weathersonu />

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
