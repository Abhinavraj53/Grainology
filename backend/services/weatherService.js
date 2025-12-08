// Weather service using Google Maps Geocoding API and OpenWeatherMap
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyB51PU-2f2npfvej1rc6AId8KO6huRWmto';
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const WEATHERAPI_BASE_URL = 'https://api.weatherapi.com/v1';
const WEATHERAPI_KEY = process.env.WEATHERAPI_KEY;

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

// Get current weather for a location
export const getCurrentWeather = async (location, state = '') => {
  try {
    if (!OPENWEATHER_API_KEY) {
      throw new Error('OpenWeatherMap API key not configured');
    }

    // Get coordinates first using Google Geocoding
    const coords = await geocodeLocation(location, state);
    
    // Get current weather
    const weatherUrl = `${OPENWEATHER_BASE_URL}/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await axios.get(weatherUrl);
    
    return transformWeatherData(response.data, coords, 'current');
  } catch (error) {
    console.error('Get current weather error:', error.message);
    throw error;
  }
};

// Get weather forecast (5 days, 3-hour intervals)
export const getWeatherForecast = async (location, state = '', days = 5) => {
  try {
    // Try WeatherAPI first if key is available (more accurate for India)
    if (WEATHERAPI_KEY) {
      try {
        const locationQuery = state ? `${location}, ${state}, India` : `${location}, India`;
        const weatherApiUrl = `${WEATHERAPI_BASE_URL}/forecast.json?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(locationQuery)}&days=${days}&aqi=no&alerts=no`;
        const response = await axios.get(weatherApiUrl);
        
        const forecasts = response.data.forecast.forecastday.map(day => ({
          date: day.date,
          date_obj: new Date(day.date),
          temperature_min: day.day.mintemp_c,
          temperature_max: day.day.maxtemp_c,
          temperature_avg: day.day.avgtemp_c,
          humidity: day.day.avghumidity,
          rainfall: day.day.totalprecip_mm,
          wind_speed: day.day.maxwind_kph,
          weather_condition: day.day.condition.text,
          forecast_data: {
            hourly_forecasts: day.hour.map(h => ({
              time: h.time,
              temp: h.temp_c,
              condition: h.condition.text,
              humidity: h.humidity,
              wind_speed: h.wind_kph,
              rainfall: h.precip_mm
            })),
            weather_icon: day.day.condition.icon,
            weather_description: day.day.condition.text
          }
        }));
        
        return {
          location: response.data.location.name,
          state: response.data.location.region,
          latitude: response.data.location.lat,
          longitude: response.data.location.lon,
          country: response.data.location.country,
          formatted_address: `${response.data.location.name}, ${response.data.location.region}, ${response.data.location.country}`,
          forecasts: forecasts
        };
      } catch (weatherApiError) {
        console.log('WeatherAPI failed, trying OpenWeatherMap...', weatherApiError.message);
      }
    }
    
    // Fallback to OpenWeatherMap
    if (!OPENWEATHER_API_KEY && !WEATHERAPI_KEY) {
      throw new Error('No weather API key configured. Please add OPENWEATHER_API_KEY or WEATHERAPI_KEY to your .env file');
    }
    
    if (!OPENWEATHER_API_KEY) {
      throw new Error('OpenWeatherMap API key is required when WeatherAPI fails. Please add OPENWEATHER_API_KEY to your .env file or fix WeatherAPI configuration');
    }

    // Get coordinates first using Google Geocoding
    const coords = await geocodeLocation(location, state);
    
    // Get forecast (5 days, 3-hour intervals)
    const forecastUrl = `${OPENWEATHER_BASE_URL}/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await axios.get(forecastUrl);
    
    // Transform and group by day
    const dailyForecasts = groupForecastsByDay(response.data.list, days);
    
    return {
      location: coords.name,
      state: coords.state,
      latitude: coords.lat,
      longitude: coords.lon,
      country: coords.country,
      formatted_address: coords.formatted_address,
      forecasts: dailyForecasts
    };
  } catch (error) {
    console.error('Get weather forecast error:', error.message);
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

