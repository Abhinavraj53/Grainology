/*
  # Add Sample Data for New Features

  1. Sample Data
    - Add mandi prices for various commodities
    - Add weather data for major agricultural regions
  
  2. Purpose
    - Enable testing and demonstration of new features
    - Provide realistic data for users to explore
*/

-- Insert sample mandi prices
INSERT INTO mandi_prices (state, district, market, commodity, variety, min_price, max_price, modal_price, price_date) VALUES
('Punjab', 'Ludhiana', 'Ludhiana Mandi', 'Paddy', 'PR-126', 2100, 2300, 2200, CURRENT_DATE),
('Punjab', 'Ludhiana', 'Ludhiana Mandi', 'Wheat', 'PBW-343', 2000, 2150, 2100, CURRENT_DATE),
('Haryana', 'Karnal', 'Karnal Grain Market', 'Paddy', 'Basmati-1509', 2800, 3000, 2900, CURRENT_DATE),
('Haryana', 'Karnal', 'Karnal Grain Market', 'Wheat', 'HD-2967', 2050, 2200, 2150, CURRENT_DATE),
('Uttar Pradesh', 'Meerut', 'Meerut Mandi', 'Wheat', 'HD-3086', 2000, 2100, 2050, CURRENT_DATE),
('Uttar Pradesh', 'Meerut', 'Meerut Mandi', 'Maize', 'Hybrid', 1800, 1950, 1900, CURRENT_DATE),
('Maharashtra', 'Nashik', 'Nashik APMC', 'Maize', 'Yellow', 1850, 2000, 1925, CURRENT_DATE),
('Karnataka', 'Mandya', 'Mandya Market', 'Paddy', 'BPT-5204', 2150, 2300, 2250, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Insert sample weather data
INSERT INTO weather_data (location, latitude, longitude, date, temperature_min, temperature_max, humidity, rainfall, wind_speed, weather_condition) VALUES
('Ludhiana, Punjab', 30.9, 75.85, CURRENT_DATE, 18, 32, 65, 0, 12, 'Partly Cloudy'),
('Ludhiana, Punjab', 30.9, 75.85, CURRENT_DATE + INTERVAL '1 day', 19, 33, 60, 0, 10, 'Clear Sky'),
('Ludhiana, Punjab', 30.9, 75.85, CURRENT_DATE + INTERVAL '2 days', 20, 34, 58, 0, 8, 'Sunny'),
('Karnal, Haryana', 29.68, 76.99, CURRENT_DATE, 17, 31, 70, 2, 15, 'Light Rain'),
('Karnal, Haryana', 29.68, 76.99, CURRENT_DATE + INTERVAL '1 day', 18, 30, 75, 5, 18, 'Moderate Rain'),
('Karnal, Haryana', 29.68, 76.99, CURRENT_DATE + INTERVAL '2 days', 19, 32, 68, 0, 12, 'Partly Cloudy'),
('Meerut, Uttar Pradesh', 28.98, 77.71, CURRENT_DATE, 20, 35, 55, 0, 10, 'Clear Sky'),
('Meerut, Uttar Pradesh', 28.98, 77.71, CURRENT_DATE + INTERVAL '1 day', 21, 36, 52, 0, 12, 'Sunny'),
('Nashik, Maharashtra', 19.99, 73.79, CURRENT_DATE, 22, 38, 45, 0, 8, 'Hot and Sunny'),
('Nashik, Maharashtra', 19.99, 73.79, CURRENT_DATE + INTERVAL '1 day', 23, 39, 42, 0, 9, 'Very Hot'),
('Mandya, Karnataka', 12.52, 76.89, CURRENT_DATE, 21, 32, 80, 10, 14, 'Thunderstorm'),
('Mandya, Karnataka', 12.52, 76.89, CURRENT_DATE + INTERVAL '1 day', 20, 30, 85, 15, 16, 'Heavy Rain')
ON CONFLICT (location, date) DO NOTHING;
