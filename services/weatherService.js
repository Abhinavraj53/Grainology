// Weather service using Google Maps Geocoding API and Open-Meteo Weather API
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Google Maps API key for geocoding (Open-Meteo doesn't need an API key)
const GOOGLE_API_KEY = (process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || process.env.WEATHER_API_KEY || '').trim();

// Open-Meteo Weather API base URL (free, no API key required)
const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1';

// Fallback coordinates for major Indian cities (when Geocoding API fails)
const INDIAN_CITY_COORDINATES = {
  'Mumbai': { lat: 19.0760, lon: 72.8777 },
  'Pune': { lat: 18.5204, lon: 73.8567 },
  'Nagpur': { lat: 21.1458, lon: 79.0882 },
  'Nashik': { lat: 19.9975, lon: 73.7898 },
  'Aurangabad': { lat: 19.8762, lon: 75.3433 },
  'Solapur': { lat: 17.6599, lon: 75.9064 },
  'Amravati': { lat: 20.9374, lon: 77.7796 },
  'Kolhapur': { lat: 16.7050, lon: 74.2433 },
  'Sangli': { lat: 16.8524, lon: 74.5815 },
  'Jalgaon': { lat: 21.0486, lon: 75.5685 },
  'Patna': { lat: 25.5941, lon: 85.1376 },
  'Delhi': { lat: 28.6139, lon: 77.2090 },
  'Bangalore': { lat: 12.9716, lon: 77.5946 },
  'Hyderabad': { lat: 17.3850, lon: 78.4867 },
  'Chennai': { lat: 13.0827, lon: 80.2707 },
  'Kolkata': { lat: 22.5726, lon: 88.3639 },
  'Ahmedabad': { lat: 23.0225, lon: 72.5714 },
  'Jaipur': { lat: 26.9124, lon: 75.7873 },
  'Lucknow': { lat: 26.8467, lon: 80.9462 },
  'Kanpur': { lat: 26.4499, lon: 80.3319 },
  'Agra': { lat: 27.1767, lon: 78.0081 },
  'Varanasi': { lat: 25.3176, lon: 82.9739 },
  'Surat': { lat: 21.1702, lon: 72.8311 },
  'Vadodara': { lat: 22.3072, lon: 73.1812 },
  'Rajkot': { lat: 22.3039, lon: 70.8022 },
  'Indore': { lat: 22.7196, lon: 75.8577 },
  'Bhopal': { lat: 23.2599, lon: 77.4126 },
  'Visakhapatnam': { lat: 17.6868, lon: 83.2185 },
  'Vijayawada': { lat: 16.5062, lon: 80.6480 },
  'Coimbatore': { lat: 11.0168, lon: 76.9558 },
  'Madurai': { lat: 9.9252, lon: 78.1198 },
  'Kochi': { lat: 9.9312, lon: 76.2673 },
  'Thiruvananthapuram': { lat: 8.5241, lon: 76.9366 },
  'Guwahati': { lat: 26.1445, lon: 91.7362 },
  'Chandigarh': { lat: 30.7333, lon: 76.7794 },
  'Bhubaneswar': { lat: 20.2961, lon: 85.8245 },
  'Raipur': { lat: 21.2514, lon: 81.6296 },
  'Ranchi': { lat: 23.3441, lon: 85.3096 },
  'Jamshedpur': { lat: 22.8046, lon: 86.2029 },
  'Dhanbad': { lat: 23.7956, lon: 86.4304 },
  'Gurgaon': { lat: 28.4089, lon: 77.0378 },
  'Faridabad': { lat: 28.4089, lon: 77.3178 },
  'Noida': { lat: 28.5355, lon: 77.3910 },
  'Ghaziabad': { lat: 28.6692, lon: 77.4538 },
  'Meerut': { lat: 28.9845, lon: 77.7064 },
  'Ludhiana': { lat: 30.9010, lon: 75.8573 },
  'Amritsar': { lat: 31.6340, lon: 74.8723 },
  'Jalandhar': { lat: 31.3260, lon: 75.5762 },
  'Dehradun': { lat: 30.3165, lon: 78.0322 },
  'Shimla': { lat: 31.1048, lon: 77.1734 },
  'Srinagar': { lat: 34.0837, lon: 74.7973 },
  'Jammu': { lat: 32.7266, lon: 74.8570 },
};

// Case-insensitive lookup for fallback coordinates
const getFallbackCoords = (location, state = '', country = 'India') => {
  const trimmed = (location || '').trim();
  if (!trimmed) return null;

  // Direct key match (case-sensitive, existing map)
  if (INDIAN_CITY_COORDINATES[trimmed]) {
    return { name: trimmed, coords: INDIAN_CITY_COORDINATES[trimmed] };
  }

  // Case-insensitive match
  const lower = trimmed.toLowerCase();
  const entry = Object.entries(INDIAN_CITY_COORDINATES).find(
    ([city]) => city.toLowerCase() === lower
  );
  if (entry) {
    return { name: entry[0], coords: entry[1] };
  }

  return null;
};

// Get coordinates (lat/lon) from location name using Google Geocoding API
// Falls back to hardcoded coordinates if geocoding fails
export const geocodeLocation = async (location, state = '', country = 'India') => {
  try {
    if (!GOOGLE_API_KEY) {
      throw new Error('Google API key not configured');
    }

    // Build location query with state if provided
    const locationQuery = state ? `${location}, ${state}, ${country}` : `${location}, ${country}`;
    
    // Try multiple query formats for better results
    const queries = [
      locationQuery, // Full query with state
      state ? `${location}, ${state}` : `${location}, ${country}`, // Without country
      location, // Just the location name
    ];
    
    let response = null;
    let lastError = null;
    
    // Try each query format until one works
    for (const query of queries) {
      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&region=in`;
        response = await axios.get(geocodeUrl);
        
        // If we got results, break out of loop
        if (response.data && response.data.results && response.data.results.length > 0) {
          break;
        }
      } catch (err) {
        lastError = err;
        continue; // Try next query format
      }
    }
    
    // If all queries failed, use last response or throw error
    if (!response) {
      throw lastError || new Error('All geocoding queries failed');
    }
    
    if (response.data) {
      // Check for API errors
      if (response.data.error_message) {
        throw new Error(`Geocoding API error: ${response.data.error_message}. Please ensure Geocoding API is enabled in Google Cloud Console.`);
      }
      
      if (response.data.status === 'REQUEST_DENIED') {
        throw new Error('Geocoding API request denied. Please check API key permissions and ensure Geocoding API is enabled.');
      }
      
      if (response.data.status === 'ZERO_RESULTS') {
        throw new Error(`Location not found: ${locationQuery}`);
      }
      
      if (response.data.results && response.data.results.length > 0) {
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
    }
    
    // If geocoding fails, try fallback coordinates
    const fallback = getFallbackCoords(location, state, country);
    if (fallback) {
      console.log(`Using fallback coordinates for ${fallback.name}`);
      const coords = fallback.coords;
      return {
        lat: coords.lat,
        lon: coords.lon,
        name: fallback.name,
        state: state || '',
        country: country,
        formatted_address: `${fallback.name}, ${state || ''}, ${country}`
      };
    }
    
    throw new Error(`Location not found: ${locationQuery}`);
  } catch (error) {
    console.error('Geocoding error:', error.message);
    if (error.response) {
      console.error('Geocoding API response:', error.response.data);
    }
    
    // Try fallback coordinates before throwing error
    const fallback = getFallbackCoords(location, state, country);
    if (fallback) {
      console.log(`Using fallback coordinates for ${fallback.name} (after error)`);
      const coords = fallback.coords;
      return {
        lat: coords.lat,
        lon: coords.lon,
        name: fallback.name,
        state: state || '',
        country: country,
        formatted_address: `${fallback.name}, ${state || ''}, ${country}`
      };
    }
    
    throw error;
  }
};

// Get current weather for a location using Open-Meteo API
export const getCurrentWeather = async (location, state = '') => {
  try {
    if (!GOOGLE_API_KEY) {
      throw new Error('Google API key not configured for geocoding');
    }

    // Get coordinates first using Google Geocoding (this works!)
    const coords = await geocodeLocation(location, state);
    
    // Use Open-Meteo API for current weather (free, no API key required)
    const weatherUrl = `${OPEN_METEO_BASE_URL}/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&timezone=auto`;
    
    try {
      const response = await axios.get(weatherUrl);
      const data = response.data;
      
      if (!data.current) {
        throw new Error('No current weather data available');
      }
      
      const current = data.current;
      const hourly = data.hourly;
      
      // Get today's min/max from hourly data
      const todayTemps = hourly?.temperature_2m?.slice(0, 24) || [];
      const todayHumidity = hourly?.relative_humidity_2m?.slice(0, 24) || [];
      const todayWind = hourly?.wind_speed_10m?.slice(0, 24) || [];
      const todayPrecip = hourly?.precipitation?.slice(0, 24) || [];
      
      const tempMin = todayTemps.length > 0 ? Math.min(...todayTemps) : current.temperature_2m;
      const tempMax = todayTemps.length > 0 ? Math.max(...todayTemps) : current.temperature_2m;
      const avgHumidity = todayHumidity.length > 0 ? Math.round(todayHumidity.reduce((a, b) => a + b, 0) / todayHumidity.length) : current.relative_humidity_2m;
      const avgWind = todayWind.length > 0 ? (todayWind.reduce((a, b) => a + b, 0) / todayWind.length).toFixed(1) : current.wind_speed_10m;
      const totalPrecip = todayPrecip.length > 0 ? todayPrecip.reduce((a, b) => a + b, 0).toFixed(1) : (current.precipitation || 0);
      
      // Map weather code to condition (WMO Weather interpretation codes)
      const weatherCondition = getWeatherConditionFromCode(current.weather_code);
      
      return {
        location: coords.name,
        state: coords.state,
        latitude: coords.lat,
        longitude: coords.lon,
        country: coords.country,
        formatted_address: coords.formatted_address,
        date: new Date(),
        temperature_min: tempMin,
        temperature_max: tempMax,
        humidity: avgHumidity,
        rainfall: parseFloat(totalPrecip),
        wind_speed: parseFloat(avgWind),
        weather_condition: weatherCondition,
        weather_description: weatherCondition,
        weather_icon: getWeatherIconFromCode(current.weather_code),
        pressure: null, // Not available in free tier
        visibility: null, // Not available in free tier
        forecast_data: {
          feels_like: current.temperature_2m,
          temp_min: tempMin,
          temp_max: tempMax,
          weather_icon: getWeatherIconFromCode(current.weather_code),
          weather_description: weatherCondition
        }
      };
    } catch (weatherError) {
      console.error('Open-Meteo API error:', weatherError.message);
      if (weatherError.response) {
        console.error('Open-Meteo API response:', weatherError.response.data);
      }
      throw new Error(`Failed to fetch weather data: ${weatherError.message}`);
    }
  } catch (error) {
    console.error('Get current weather error:', error.message);
    throw error;
  }
};

// Get weather forecast using Open-Meteo API
export const getWeatherForecast = async (location, state = '', days = 5) => {
  try {
    if (!GOOGLE_API_KEY) {
      throw new Error('Google API key not configured for geocoding');
    }

    // Get coordinates first using Google Geocoding (this works!)
    const coords = await geocodeLocation(location, state);
    
    // Use Open-Meteo API for daily forecast (supports up to 16 days, free, no API key required)
    const forecastDays = Math.min(days, 16);
    const weatherUrl = `${OPEN_METEO_BASE_URL}/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_max,weather_code&timezone=auto&forecast_days=${forecastDays}`;
    
    try {
      const response = await axios.get(weatherUrl);
      const data = response.data;
      
      if (!data.daily || !data.daily.time) {
        throw new Error('Invalid weather data format received from API');
      }
      
      const daily = data.daily;
      const forecasts = daily.time.map((dateStr, index) => {
        const date = new Date(dateStr);
        const dateKey = date.toISOString().split('T')[0];
        
        // Calculate average temperature
        const tempMin = daily.temperature_2m_min[index] || 0;
        const tempMax = daily.temperature_2m_max[index] || 0;
        const tempAvg = ((tempMin + tempMax) / 2).toFixed(1);
        
        // Map weather code to condition
        const weatherCode = daily.weather_code[index] || 0;
        const weatherCondition = getWeatherConditionFromCode(weatherCode);
        
        return {
          date: dateKey,
          date_obj: date,
          temperature_min: tempMin,
          temperature_max: tempMax,
          temperature_avg: parseFloat(tempAvg),
          humidity: daily.relative_humidity_2m_max[index] || 0,
          rainfall: daily.precipitation_sum[index] || 0,
          wind_speed: daily.wind_speed_10m_max[index] || 0,
          weather_condition: weatherCondition,
          forecast_data: {
            hourly_forecasts: [], // Can be populated with hourly data if needed
            weather_icon: getWeatherIconFromCode(weatherCode),
            weather_description: weatherCondition,
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
    } catch (weatherError) {
      console.error('Open-Meteo API error:', weatherError.message);
      if (weatherError.response) {
        console.error('Open-Meteo API response:', weatherError.response.data);
      }
      throw new Error(`Failed to fetch weather forecast: ${weatherError.message}`);
    }
  } catch (error) {
    console.error('Get weather forecast error:', error.message);
    throw error;
  }
};

// Helper function to convert Open-Meteo weather code to readable condition
// Based on WMO Weather interpretation codes (WW)
const getWeatherConditionFromCode = (code) => {
  if (code === 0) return 'Clear sky';
  if (code >= 1 && code <= 3) return 'Partly cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code === 56 || code === 57) return 'Freezing drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code === 66 || code === 67) return 'Freezing rain';
  if (code >= 71 && code <= 75) return 'Snow';
  if (code === 77) return 'Snow grains';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code === 95) return 'Thunderstorm';
  if (code === 96 || code === 99) return 'Thunderstorm with hail';
  return 'Unknown';
};

// Helper function to get weather icon from Open-Meteo weather code
const getWeatherIconFromCode = (code) => {
  if (code === 0) return '☀️'; // Clear sky
  if (code >= 1 && code <= 3) return '⛅'; // Partly cloudy
  if (code === 45 || code === 48) return '🌫️'; // Fog
  if (code >= 51 && code <= 57) return '🌦️'; // Drizzle
  if (code >= 61 && code <= 67) return '🌧️'; // Rain
  if (code >= 71 && code <= 77) return '❄️'; // Snow
  if (code >= 80 && code <= 86) return '🌦️'; // Showers
  if (code >= 95 && code <= 99) return '⛈️'; // Thunderstorm
  return '🌤️'; // Default
};

// Transform OpenWeatherMap data to our format (legacy, kept for reference)
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

