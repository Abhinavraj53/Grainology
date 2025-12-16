import { useState, useEffect } from 'react';
import { TrendingUp, Download, Printer } from 'lucide-react';

interface AgMarkNetData {
  commodity_group: string;
  commodity: string;
  variety: string;
  msp: number;
  dates: Record<string, { price: number; arrival: number }>;
}

interface FilterOptions {
  states: string[];
  districts: string[];
  markets: string[];
  commodities: string[];
  varieties: string[];
  commodity_groups: string[];
}

export default function MandiBhaav() {
  const [data, setData] = useState<AgMarkNetData[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    states: [],
    districts: [],
    markets: [],
    commodities: [],
    varieties: [],
    commodity_groups: []
  });
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    state: 'all',
    district: 'all',
    market: 'all',
    commodity_group: 'all',
    commodity: 'all',
    variety: 'all',
    grade: 'FAQ'
  });

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    if (filterOptions.states.length > 0) {
      loadData();
    }
  }, [filters, filterOptions.states.length]);

  const loadFilterOptions = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/mandi/filters`);
      if (response.ok) {
        const options = await response.json();
        setFilterOptions(options);
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/mandi/agmarknet?${params.toString()}`
      );

      if (response.ok) {
        const result = await response.json();
        setData(result.data || []);
        setDates(result.dates || []);
      } else {
        console.error('Failed to fetch data');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      state: 'all',
      district: 'all',
      market: 'all',
      commodity_group: 'all',
      commodity: 'all',
      variety: 'all',
      grade: 'FAQ'
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      return `${day} ${month}, ${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatPrice = (price: number) => {
    if (!price || price === 0) return '-';
    return price.toFixed(2);
  };

  const formatArrival = (arrival: number) => {
    if (!arrival || arrival === 0) return '-';
    return arrival.toFixed(2);
  };

  // Get filtered districts based on selected state
  const getFilteredDistricts = () => {
    if (filters.state === 'all') return filterOptions.districts;
    // In a real implementation, you'd filter districts by state from the API
    return filterOptions.districts;
  };

  // Get filtered markets based on selected district
  const getFilteredMarkets = () => {
    if (filters.district === 'all') return filterOptions.markets;
    // In a real implementation, you'd filter markets by district from the API
    return filterOptions.markets;
  };

  // Get filtered commodities based on selected commodity group
  const getFilteredCommodities = () => {
    if (filters.commodity_group === 'all') return filterOptions.commodities;
    // Filter commodities by group (simplified - in real app, maintain this mapping)
    return filterOptions.commodities;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Market Wise Price & Arrival</h1>
            <p className="text-gray-600">MSP (Minimum Support Price) Commodities - Tomato, Onion, Potato</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-4">
          <select
            value={filters.state}
            onChange={(e) => setFilters({ ...filters, state: e.target.value, district: 'all', market: 'all' })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All States</option>
            {filterOptions.states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>

          <select
            value={filters.district}
            onChange={(e) => setFilters({ ...filters, district: e.target.value, market: 'all' })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Districts</option>
            {getFilteredDistricts().map(district => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>

          <select
            value={filters.market}
            onChange={(e) => setFilters({ ...filters, market: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Markets</option>
            {getFilteredMarkets().map(market => (
              <option key={market} value={market}>{market}</option>
            ))}
          </select>

          <select
            value={filters.commodity_group}
            onChange={(e) => setFilters({ ...filters, commodity_group: e.target.value, commodity: 'all' })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Commodity Groups</option>
            {filterOptions.commodity_groups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>

          <select
            value={filters.commodity}
            onChange={(e) => setFilters({ ...filters, commodity: e.target.value, variety: 'all' })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Commodities</option>
            {getFilteredCommodities().map(commodity => (
              <option key={commodity} value={commodity}>{commodity}</option>
            ))}
          </select>

          <select
            value={filters.variety}
            onChange={(e) => setFilters({ ...filters, variety: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Varieties</option>
            {filterOptions.varieties.map(variety => (
              <option key={variety} value={variety}>{variety}</option>
            ))}
          </select>

          <select
            value={filters.grade}
            onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="FAQ">FAQ</option>
            <option value="Grade A">Grade A</option>
            <option value="Grade B">Grade B</option>
          </select>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={loadData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go
          </button>
          <button
            onClick={resetFilters}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Reset
          </button>
        </div>

        {/* Info Bar */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">All States</span> | Data Freeze Up to {dates[0] ? formatDate(dates[0]) : new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading market data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No market data available</p>
            <p className="text-sm mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th rowSpan={2} className="border border-gray-300 px-4 py-2 text-left font-semibold">Commodity Group</th>
                  <th rowSpan={2} className="border border-gray-300 px-4 py-2 text-left font-semibold">Commodity</th>
                  <th rowSpan={2} className="border border-gray-300 px-4 py-2 text-left font-semibold">MSP (Rs./Quintal) 2025-26</th>
                  <th colSpan={dates.length} className="border border-gray-300 px-4 py-2 text-center font-semibold">Price (Rs./Quintal)</th>
                  <th colSpan={dates.length} className="border border-gray-300 px-4 py-2 text-center font-semibold">Arrival (Metric Tonnes)</th>
                </tr>
                <tr className="bg-gray-50">
                  {dates.map(date => (
                    <th key={date} className="border border-gray-300 px-4 py-2 text-center text-sm font-medium">
                      {formatDate(date)}
                    </th>
                  ))}
                  {dates.map(date => (
                    <th key={`arrival-${date}`} className="border border-gray-300 px-4 py-2 text-center text-sm font-medium">
                      {formatDate(date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{item.commodity_group}</td>
                    <td className="border border-gray-300 px-4 py-2 font-medium">
                      {item.commodity}
                      {item.variety && <span className="text-gray-600 text-sm"> ({item.variety})</span>}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {item.msp > 0 ? item.msp.toFixed(2) : '-'}
                    </td>
                    {dates.map(date => (
                      <td key={`price-${date}-${idx}`} className="border border-gray-300 px-4 py-2 text-right">
                        {formatPrice(item.dates[date]?.price || 0)}
                      </td>
                    ))}
                    {dates.map(date => (
                      <td key={`arrival-${date}-${idx}`} className="border border-gray-300 px-4 py-2 text-right">
                        {formatArrival(item.dates[date]?.arrival || 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
