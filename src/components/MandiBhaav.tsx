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

export default function MandiBhaav() {
  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<MandiPrice[]>([]);
  const [commodityFilter, setCommodityFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrices();
  }, []);

  useEffect(() => {
    filterPrices();
  }, [prices, commodityFilter, stateFilter, searchTerm]);

  const loadPrices = async () => {
    try {
      setLoading(true);
      // Try live data.gov.in feed via backend proxy
      const live = await fetchLiveMandi();
      if (live?.records?.length) {
        setPrices(live.records);
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
        setPrices(data);
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

    if (stateFilter !== 'all') {
      filtered = filtered.filter(p => p.state === stateFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.market.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.district.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPrices(filtered);
  };

  const uniqueCommodities = [...new Set(prices.map(p => p.commodity))];
  const uniqueStates = [...new Set(prices.map(p => p.state))];

  return (
    <div className="space-y-6">
      <CSVUpload type="mandi" onUploadSuccess={loadPrices} />
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-600" />
          Mandi Bhaav - Market Prices
        </h2>
        <p className="text-gray-600 mb-6">Real-time agricultural commodity prices from various mandis across India</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by market or district..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <select
            value={commodityFilter}
            onChange={(e) => setCommodityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All Commodities</option>
            {uniqueCommodities.map(commodity => (
              <option key={commodity} value={commodity}>{commodity}</option>
            ))}
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All States</option>
            {uniqueStates.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
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
