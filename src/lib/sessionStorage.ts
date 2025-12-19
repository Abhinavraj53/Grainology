/**
 * Session Storage Utility
 * Handles caching of weather, mandi, and dashboard data to prevent unnecessary API calls
 */

const CACHE_DURATION = {
  WEATHER: 30 * 60 * 1000, // 30 minutes
  MANDI: 60 * 60 * 1000, // 1 hour
  DASHBOARD: 15 * 60 * 1000, // 15 minutes
  FILTERS: 24 * 60 * 60 * 1000, // 24 hours
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

/**
 * Get cached data from session storage
 */
export function getCachedData<T>(key: string, maxAge: number): T | null {
  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const age = Date.now() - entry.timestamp;

    if (age > maxAge) {
      sessionStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error(`Error reading cache for ${key}:`, error);
    return null;
  }
}

/**
 * Save data to session storage
 */
export function setCachedData<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      key,
    };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error(`Error saving cache for ${key}:`, error);
    // If storage is full, try to clear old entries
    try {
      clearOldCache();
      sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now(), key }));
    } catch (retryError) {
      console.error(`Failed to save cache after cleanup:`, retryError);
    }
  }
}

/**
 * Clear old cache entries to free up space
 */
function clearOldCache(): void {
  const keys = Object.keys(sessionStorage);
  const now = Date.now();

  keys.forEach((key) => {
    if (key.startsWith('cache_')) {
      try {
        const entry = JSON.parse(sessionStorage.getItem(key) || '{}');
        const age = now - (entry.timestamp || 0);
        // Clear entries older than 24 hours
        if (age > 24 * 60 * 60 * 1000) {
          sessionStorage.removeItem(key);
        }
      } catch {
        // If parsing fails, remove the key
        sessionStorage.removeItem(key);
      }
    }
  });
}

/**
 * Weather cache keys and functions
 */
export const WeatherCache = {
  get: (location: string, state: string) => {
    const key = `cache_weather_${location}_${state}`;
    return getCachedData(key, CACHE_DURATION.WEATHER);
  },
  set: (location: string, state: string, data: any) => {
    const key = `cache_weather_${location}_${state}`;
    setCachedData(key, data);
  },
  getForecast: (location: string, state: string) => {
    const key = `cache_weather_forecast_${location}_${state}`;
    return getCachedData(key, CACHE_DURATION.WEATHER);
  },
  setForecast: (location: string, state: string, data: any) => {
    const key = `cache_weather_forecast_${location}_${state}`;
    setCachedData(key, data);
  },
};

/**
 * Mandi cache keys and functions
 */
export const MandiCache = {
  get: (filters: Record<string, string>) => {
    const filterKey = Object.entries(filters)
      .sort()
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    const key = `cache_mandi_${filterKey}`;
    return getCachedData(key, CACHE_DURATION.MANDI);
  },
  set: (filters: Record<string, string>, data: any) => {
    const filterKey = Object.entries(filters)
      .sort()
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    const key = `cache_mandi_${filterKey}`;
    setCachedData(key, data);
  },
  getFilters: () => {
    const key = 'cache_mandi_filters';
    return getCachedData(key, CACHE_DURATION.FILTERS);
  },
  setFilters: (data: any) => {
    const key = 'cache_mandi_filters';
    setCachedData(key, data);
  },
  getDefault: () => {
    const key = 'cache_mandi_default';
    return getCachedData(key, CACHE_DURATION.MANDI);
  },
  setDefault: (data: any) => {
    const key = 'cache_mandi_default';
    setCachedData(key, data);
  },
};

/**
 * Dashboard cache keys and functions
 */
export const DashboardCache = {
  get: (userId: string) => {
    const key = `cache_dashboard_${userId}`;
    return getCachedData(key, CACHE_DURATION.DASHBOARD);
  },
  set: (userId: string, data: any) => {
    const key = `cache_dashboard_${userId}`;
    setCachedData(key, data);
  },
  // Customer dashboard data
  getCustomerData: (userId: string) => {
    const key = `cache_customer_dashboard_${userId}`;
    return getCachedData(key, CACHE_DURATION.DASHBOARD);
  },
  setCustomerData: (userId: string, data: { offers: any[]; orders: any[]; qualityParams: any[] }) => {
    const key = `cache_customer_dashboard_${userId}`;
    setCachedData(key, data);
  },
  // Admin dashboard data
  getAdminData: (userId: string) => {
    const key = `cache_admin_dashboard_${userId}`;
    return getCachedData(key, CACHE_DURATION.DASHBOARD);
  },
  setAdminData: (userId: string, data: { shipments: any[]; vendorPerformance: any[] }) => {
    const key = `cache_admin_dashboard_${userId}`;
    setCachedData(key, data);
  },
};

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  const keys = Object.keys(sessionStorage);
  keys.forEach((key) => {
    if (key.startsWith('cache_')) {
      sessionStorage.removeItem(key);
    }
  });
}

/**
 * Clear specific cache by prefix
 */
export function clearCacheByPrefix(prefix: string): void {
  const keys = Object.keys(sessionStorage);
  keys.forEach((key) => {
    if (key.startsWith(`cache_${prefix}`)) {
      sessionStorage.removeItem(key);
    }
  });
}

