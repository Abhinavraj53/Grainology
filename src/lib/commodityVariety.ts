/**
 * Utility functions for fetching commodities and varieties from the database
 * Falls back to static defaults if database is unavailable
 */

import { COMMODITY_VARIETIES } from '../constants/commodityVarieties';

export interface Commodity {
  id: string;
  name: string;
  description?: string;
  category?: string;
  is_active: boolean;
}

export interface Variety {
  id: string;
  commodity_name: string;
  variety_name: string;
  description?: string;
  is_active: boolean;
}

// Cache for commodities and varieties
let commoditiesCache: Commodity[] | null = null;
let varietiesCache: Variety[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all active commodities from the database
 * Falls back to static defaults if database is unavailable
 */
export async function fetchCommodities(): Promise<string[]> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      // Return static defaults if not authenticated
      return Object.keys(COMMODITY_VARIETIES);
    }

    // Check cache
    const now = Date.now();
    if (commoditiesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return commoditiesCache.filter(c => c.is_active).map(c => c.name);
    }

    const response = await fetch(`${apiUrl}/commodity-master?is_active=true`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch commodities');
    }

    const data: Commodity[] = await response.json();
    commoditiesCache = data;
    cacheTimestamp = now;

    // Combine database commodities with static defaults
    const dbCommodities = data.filter(c => c.is_active).map(c => c.name);
    const staticCommodities = Object.keys(COMMODITY_VARIETIES);
    const allCommodities = Array.from(new Set([...staticCommodities, ...dbCommodities]));
    
    return allCommodities;
  } catch (error) {
    console.warn('Failed to fetch commodities from database, using static defaults:', error);
    // Return static defaults on error
    return Object.keys(COMMODITY_VARIETIES);
  }
}

/**
 * Fetch all varieties for a specific commodity
 * Combines database varieties with static defaults
 */
export async function fetchVarieties(commodity: string): Promise<string[]> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      // Return static defaults if not authenticated
      return COMMODITY_VARIETIES[commodity] || [];
    }

    // Check cache
    const now = Date.now();
    if (varietiesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      const staticVarieties = COMMODITY_VARIETIES[commodity] || [];
      const dbVarieties = varietiesCache
        .filter(v => v.is_active && v.commodity_name === commodity)
        .map(v => v.variety_name);
      return Array.from(new Set([...staticVarieties, ...dbVarieties]));
    }

    const response = await fetch(`${apiUrl}/variety-master?commodity_name=${encodeURIComponent(commodity)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch varieties');
    }

    const data: Variety[] = await response.json();
    
    // Update cache (fetch all varieties if cache is empty)
    if (!varietiesCache) {
      const allVarietiesResponse = await fetch(`${apiUrl}/variety-master`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (allVarietiesResponse.ok) {
        varietiesCache = await allVarietiesResponse.json();
        cacheTimestamp = now;
      }
    } else {
      varietiesCache = data;
      cacheTimestamp = now;
    }

    // Combine database varieties with static defaults
    const staticVarieties = COMMODITY_VARIETIES[commodity] || [];
    const dbVarieties = data
      .filter(v => v.is_active && v.commodity_name === commodity)
      .map(v => v.variety_name);
    
    return Array.from(new Set([...staticVarieties, ...dbVarieties]));
  } catch (error) {
    console.warn('Failed to fetch varieties from database, using static defaults:', error);
    // Return static defaults on error
    return COMMODITY_VARIETIES[commodity] || [];
  }
}

/**
 * Fetch all varieties (for all commodities)
 * Used when you need the full list
 */
export async function fetchAllVarieties(): Promise<Variety[]> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      return [];
    }

    // Check cache
    const now = Date.now();
    if (varietiesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return varietiesCache.filter(v => v.is_active);
    }

    const response = await fetch(`${apiUrl}/variety-master`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch varieties');
    }

    const data: Variety[] = await response.json();
    varietiesCache = data;
    cacheTimestamp = now;

    return data.filter(v => v.is_active);
  } catch (error) {
    console.warn('Failed to fetch varieties from database:', error);
    return [];
  }
}

/**
 * Clear the cache (useful after creating/updating/deleting commodities or varieties)
 */
export function clearCommodityVarietyCache() {
  commoditiesCache = null;
  varietiesCache = null;
  cacheTimestamp = 0;
}

