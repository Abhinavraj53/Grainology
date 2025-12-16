// Weather service using Google Maps Geocoding API and Google Weather API
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Google Maps API key for geocoding and weather
const GOOGLE_API_KEY = (process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || process.env.WEATHER_API_KEY || '').trim();

// Google Weather API base URL
const GOOGLE_WEATHER_BASE_URL = 'https://weather.googleapis.com/v1';

// Get coordinates (lat/lon) from location name using Google Geocoding API
export const geocodeLocation = async (location, state = '', country = 'India') => {
  try {
    if (!GOOGLE_API_KEY) {
      throw new Error('Google API key not configured');
    }

    // Build location query with state if provided
    const locationQuery = state ? `${location}, ${state}, ${country}` : `${location}, ${country}`;
    
    // Use Google Geocoding API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationQuery)}&key=${GOOGLE_API_KEY}`;
    const response = await axios.get(geocodeUrl);
    
    if (response.data && response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      const location_data = result.geometry.location;
      
      // Extract city and state from address components
      let city = location;
      let state_name = state;
      
      result.address_components.forEach(component => {
        if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
          city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          state_name = component.long_name;
        }
      });
      
      return {
        lat: location_data.lat,
        lon: location_data.lng,
        name: city,
        state: state_name,
        country: country,
        formatted_address: result.formatted_address
      };
    }
    
    throw new Error('Location not found');
  } catch (error) {
    console.error('Geocoding error:', error.message);
    throw error;
  }
};

// Get current weather for a location using Google Weather API
export const getCurrentWeather = async (location, state = '') => {
  try {
    if (!GOOGLE_API_KEY) {
      throw new Error('Google API key not configured');
    }

    // Get coordinates first using Google Geocoding
    const coords = await geocodeLocation(location, state);
    
    // Use Google Weather API for current conditions
    const currentConditionsUrl = `${GOOGLE_WEATHER_BASE_URL}/currentConditions:lookup?key=${GOOGLE_API_KEY}`;
    const response = await axios.post(currentConditionsUrl, {
      location: {
        latitude: coords.lat,
        longitude: coords.lon
      }
    });

    const data = response.data.currentConditions;
    
    return {
      location: coords.name,
      state: coords.state,
      latitude: coords.lat,
      longitude: coords.lon,
      country: coords.country,
      formatted_address: coords.formatted_address,
      date: new Date(),
      temperature_min: data.temperature?.value || data.temperature || 0,
      temperature_max: data.temperature?.value || data.temperature || 0,
      humidity: data.humidity?.value || data.humidity || 0,
      rainfall: data.precipitation?.value || 0,
      wind_speed: data.windSpeed?.value || data.windSpeed || 0,
      weather_condition: data.condition || 'Unknown',
      weather_description: data.condition || '',
      weather_icon: data.icon || '',
      pressure: data.pressure?.value || null,
      visibility: data.visibility?.value || null,
      forecast_data: {
        feels_like: data.temperature?.value || data.temperature || 0,
        temp_min: data.temperature?.value || data.temperature || 0,
        temp_max: data.temperature?.value || data.temperature || 0,
        weather_icon: data.icon || '',
        weather_description: data.condition || ''
      }
    };
  } catch (error) {
    console.error('Get current weather error:', error.message);
    if (error.response) {
      console.error('Google Weather API error:', error.response.data);
    }
    throw error;
  }
};

// Get weather forecast using Google Weather API
export const getWeatherForecast = async (location, state = '', days = 5) => {
  try {
    if (!GOOGLE_API_KEY) {
      throw new Error('Google API key not configured');
    }

    // Get coordinates first using Google Geocoding
    const coords = await geocodeLocation(location, state);
    
    // Use Google Weather API for daily forecast (supports up to 10 days)
    const forecastDays = Math.min(days, 10);
    const forecastUrl = `${GOOGLE_WEATHER_BASE_URL}/forecastDaily:lookup?key=${GOOGLE_API_KEY}`;
    const response = await axios.post(forecastUrl, {
      location: {
        latitude: coords.lat,
        longitude: coords.lon
      },
      days: forecastDays
    });

    // Transform Google Weather API response to match existing format
    const dailyForecast = response.data.dailyForecast;
    const forecasts = dailyForecast.days.map((day) => {
      // Extract date from timestamp or date string
      const date = day.date ? new Date(day.date) : new Date();
      const dateKey = date.toISOString().split('T')[0];
      
      return {
        date: dateKey,
        date_obj: date,
        temperature_min: day.temperatureMin?.value || day.temperatureMin || 0,
        temperature_max: day.temperatureMax?.value || day.temperatureMax || 0,
        temperature_avg: day.temperatureAvg?.value || day.temperatureAvg || 0,
        humidity: day.humidityAvg?.value || day.humidityAvg || 0,
        rainfall: day.precipitationAmount?.value || day.precipitationAmount || 0,
        wind_speed: day.windSpeedAvg?.value || day.windSpeedAvg || 0,
        weather_condition: day.condition || 'Unknown',
        forecast_data: {
          hourly_forecasts: [], // Google Weather API doesn't provide hourly in daily forecast
          weather_icon: day.icon || '',
          weather_description: day.condition || '',
          formatted_address: coords.formatted_address
        }
      };
    });
    
    return {
      location: coords.name,
      state: coords.state,
      latitude: coords.lat,
      longitude: coords.lon,
      country: coords.country,
      formatted_address: coords.formatted_address,
      forecasts: forecasts
    };
  } catch (error) {
    console.error('Get weather forecast error:', error.message);
    if (error.response) {
      console.error('Google Weather API error:', error.response.data);
    }
    throw error;
  }
};

// Transform OpenWeatherMap data to our format
const transformWeatherData = (data, coords, type) => {
  return {
    location: coords.name,
    state: coords.state || '',
    latitude: coords.lat,
    longitude: coords.lon,
    country: coords.country,
    formatted_address: coords.formatted_address || '',
    date: new Date(data.dt * 1000),
    temperature_min: type === 'forecast' ? data.main.temp_min : data.main.temp,
    temperature_max: type === 'forecast' ? data.main.temp_max : data.main.temp,
    humidity: data.main.humidity,
    rainfall: data.rain ? (data.rain['3h'] || data.rain['1h'] || 0) : 0,
    wind_speed: data.wind ? (data.wind.speed * 3.6) : 0, // Convert m/s to km/h
    weather_condition: data.weather[0].main,
    weather_description: data.weather[0].description,
    weather_icon: data.weather[0].icon,
    pressure: data.main.pressure,
    visibility: data.visibility ? (data.visibility / 1000) : null, // Convert to km
    forecast_data: {
      feels_like: data.main.feels_like,
      temp_min: data.main.temp_min,
      temp_max: data.main.temp_max,
      weather_icon: data.weather[0].icon,
      weather_description: data.weather[0].description
    }
  };
};

// Group 3-hour forecasts by day
const groupForecastsByDay = (forecastList, days) => {
  const dailyForecasts = {};
  
  forecastList.slice(0, days * 8).forEach(item => {
    const date = new Date(item.dt * 1000);
    const dateKey = date.toISOString().split('T')[0];
    
    if (!dailyForecasts[dateKey]) {
      dailyForecasts[dateKey] = {
        date: dateKey,
        date_obj: date,
        temps: [],
        humidity: [],
        rainfall: [],
        wind_speed: [],
        conditions: [],
        forecasts: []
      };
    }
    
    dailyForecasts[dateKey].temps.push(item.main.temp);
    dailyForecasts[dateKey].humidity.push(item.main.humidity);
    dailyForecasts[dateKey].rainfall.push(item.rain ? (item.rain['3h'] || 0) : 0);
    dailyForecasts[dateKey].wind_speed.push(item.wind ? (item.wind.speed * 3.6) : 0);
    dailyForecasts[dateKey].conditions.push(item.weather[0].main);
    dailyForecasts[dateKey].forecasts.push({
      time: date.toISOString(),
      temp: item.main.temp,
      condition: item.weather[0].main,
      description: item.weather[0].description,
      icon: item.weather[0].icon,
      humidity: item.main.humidity,
      wind_speed: item.wind ? (item.wind.speed * 3.6) : 0,
      rainfall: item.rain ? (item.rain['3h'] || 0) : 0
    });
  });
  
  // Calculate daily averages and min/max
  return Object.values(dailyForecasts).map(day => ({
    date: day.date,
    date_obj: day.date_obj,
    temperature_min: Math.min(...day.temps),
    temperature_max: Math.max(...day.temps),
    temperature_avg: (day.temps.reduce((a, b) => a + b, 0) / day.temps.length).toFixed(1),
    humidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
    rainfall: day.rainfall.reduce((a, b) => a + b, 0).toFixed(1),
    wind_speed: (day.wind_speed.reduce((a, b) => a + b, 0) / day.wind_speed.length).toFixed(1),
    weather_condition: getMostCommonCondition(day.conditions),
    forecast_data: {
      hourly_forecasts: day.forecasts,
      most_common_condition: getMostCommonCondition(day.conditions)
    }
  }));
};

const getMostCommonCondition = (conditions) => {
  const counts = {};
  conditions.forEach(cond => {
    counts[cond] = (counts[cond] || 0) + 1;
  });
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
};

