import { useState, useEffect } from 'react';
import { supabase, MandiPrice } from '../lib/supabase';
import { TrendingUp, Search, MapPin, Calendar, IndianRupee } from 'lucide-react';
import CSVUpload from './CSVUpload';

// Helper to fetch live mandi data from backend
async function fetchLiveMandi() {
  const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/mandi/live`;
  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to fetch live mandi prices');
  }
  return response.json();
}

// Helper to normalize commodity names (optional - can be used for grouping similar commodities)
const normalizeCommodity = (commodity: string): string => {
  if (!commodity) return '';
  // Return as-is, but can normalize if needed
  return commodity.trim();
};

export default function MandiBhaav() {
  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<MandiPrice[]>([]);
  const [commodityFilter, setCommodityFilter] = useState('all');
  const [varietyFilter, setVarietyFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrices();
  }, []);

  useEffect(() => {
    filterPrices();
  }, [prices, commodityFilter, varietyFilter, stateFilter, districtFilter, searchTerm]);

  const loadPrices = async () => {
    try {
      setLoading(true);
      // Try live data.gov.in feed via backend proxy
      const live = await fetchLiveMandi();
      if (live?.records?.length) {
        console.log('Fetched records:', live.records.length);
        // Show all records, normalize commodity names
        const processed = live.records
          .map((record: any) => {
            const normalized = normalizeCommodity(record.commodity);
            if (normalized && record.modal_price > 0) {
              return {
                ...record,
                commodity: normalized,
              };
            }
            return null;
          })
          .filter((record): record is MandiPrice => record !== null);
        
        console.log('Processed records:', processed.length);
        setPrices(processed);
        setLoading(false);
        return;
      }

      // Fallback to stored data if live fetch fails or returns empty
      const { data, error } = await supabase
        .from('mandi_prices')
        .select('*')
        .order('price_date', { ascending: false })
        .limit(100);

      if (!error && data) {
        const processed = data
          .map((record: any) => {
            const normalized = normalizeCommodity(record.commodity);
            if (normalized) {
              return {
                ...record,
                commodity: normalized,
              };
            }
            return null;
          })
          .filter((record): record is MandiPrice => record !== null);
        setPrices(processed);
      }
    } catch (err) {
      console.error('Mandi live fetch error:', err);
      // Optionally keep prices as-is; fallback to existing data only if available
    } finally {
      setLoading(false);
    }
  };

  const filterPrices = () => {
    let filtered = [...prices];

    if (commodityFilter !== 'all') {
      filtered = filtered.filter(p => p.commodity === commodityFilter);
    }

    if (varietyFilter !== 'all') {
      filtered = filtered.filter(p => p.variety === varietyFilter);
    }

    if (stateFilter !== 'all') {
      filtered = filtered.filter(p => p.state === stateFilter);
    }

    if (districtFilter !== 'all') {
      filtered = filtered.filter(p => p.district === districtFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.market?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.commodity?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPrices(filtered);
  };

  // Get all unique commodities from API data
  const uniqueCommodities = [...new Set(prices.map(p => p.commodity).filter(Boolean))].sort();

  // Get varieties for the selected commodity
  const availableVarieties = commodityFilter !== 'all'
    ? [...new Set(
        prices
          .filter(p => p.commodity === commodityFilter && p.variety)
          .map(p => p.variety)
      )].sort()
    : [];

  // Get all unique states
  const uniqueStates = [...new Set(prices.map(p => p.state).filter(Boolean))].sort();

  // Get districts for the selected state
  const availableDistricts = stateFilter !== 'all'
    ? [...new Set(
        prices
          .filter(p => p.state === stateFilter && p.district)
          .map(p => p.district)
      )].sort()
    : [];

  return (
    <div className="space-y-6">
      <CSVUpload type="mandi" onUploadSuccess={loadPrices} />
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-600" />
          Mandi Bhaav - Market Prices
        </h2>
        <p className="text-gray-600 mb-6">Real-time agricultural commodity prices from various mandis across India</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by market, district, or commodity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <select
            value={commodityFilter}
            onChange={(e) => {
              setCommodityFilter(e.target.value);
              setVarietyFilter('all'); // Reset variety when commodity changes
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All Commodities</option>
            {uniqueCommodities.map(commodity => (
              <option key={commodity} value={commodity}>{commodity}</option>
            ))}
          </select>

          {commodityFilter !== 'all' && availableVarieties.length > 0 && (
            <select
              value={varietyFilter}
              onChange={(e) => setVarietyFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Varieties</option>
              {availableVarieties.map(variety => (
                <option key={variety} value={variety}>{variety}</option>
              ))}
            </select>
          )}

          <select
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value);
              setDistrictFilter('all'); // Reset district when state changes
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All States</option>
            {uniqueStates.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>

          {stateFilter !== 'all' && availableDistricts.length > 0 && (
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Districts</option>
              {availableDistricts.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4">Loading market prices...</p>
          </div>
        ) : filteredPrices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No market prices available</p>
            <p className="text-sm mt-2">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredPrices.map((price) => (
              <div key={price.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-lg font-bold text-gray-800">{price.commodity}</p>
                    {price.variety && (
                      <p className="text-sm text-gray-600">{price.variety}</p>
                    )}
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-800">{price.market}</p>
                      <p className="text-sm text-gray-600">{price.district}, {price.state}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Price Date</p>
                      <p className="font-medium text-gray-800">
                        {new Date(price.price_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600">Min</span>
                      <span className="text-sm font-medium text-gray-800 flex items-center">
                        <IndianRupee className="w-3 h-3" />
                        {price.min_price}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-green-700">Modal</span>
                      <span className="text-lg font-bold text-green-800 flex items-center">
                        <IndianRupee className="w-4 h-4" />
                        {price.modal_price}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Max</span>
                      <span className="text-sm font-medium text-gray-800 flex items-center">
                        <IndianRupee className="w-3 h-3" />
                        {price.max_price}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
