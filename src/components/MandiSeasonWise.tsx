import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Download, Printer, AlertCircle, Zap } from 'lucide-react';
import { MandiCache } from '../lib/sessionStorage';

interface SeasonWiseData {
  commodity_group: string;
  commodity: string;
  variety: string;
  msp: number;
  seasons: {
    Kharif: { price: number; arrival: number; count: number };
    Rabi: { price: number; arrival: number; count: number };
  };
}

interface FilterOptions {
  states: string[];
  districts: string[];
  markets: string[];
  commodities: string[];
  varieties: string[];
  commodity_groups: string[];
}

export default function MandiSeasonWise() {
  const [data, setData] = useState<SeasonWiseData[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    states: [],
    districts: [],
    markets: [],
    commodities: [],
    varieties: [],
    commodity_groups: []
  });
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
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    if (filterOptions.states.length > 0 || !loading) {
      loadData();
    }
  }, [filters, filterOptions.states.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const loadFilterOptions = async () => {
    try {
      const cached = MandiCache.getFilters() as FilterOptions | null;
      if (cached && cached.states && cached.states.length > 0) {
        setFilterOptions(cached);
        return;
      }

      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/mandi/filters`;
      const response = await fetch(apiUrl, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        setFilterOptions({
          states: ['Bihar', 'Uttar Pradesh', 'Punjab', 'Haryana'],
          districts: [],
          markets: [],
          commodities: ['Paddy', 'Maize', 'Wheat'],
          varieties: [],
          commodity_groups: ['Cereals']
        });
        return;
      }

      const options = await response.json();
      if (options && options.states && Array.isArray(options.states)) {
        setFilterOptions(options);
        MandiCache.setFilters(options);
      }
    } catch (error: any) {
      console.error('Error loading filter options:', error);
      setFilterOptions({
        states: ['Bihar', 'Uttar Pradesh', 'Punjab', 'Haryana'],
        districts: [],
        markets: [],
        commodities: ['Paddy', 'Maize', 'Wheat'],
        varieties: [],
        commodity_groups: ['Cereals']
      });
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setApiError(null);
      
      const cacheKey = { ...filters, type: 'season-wise' };
      const cached = MandiCache.get(cacheKey) as { data: SeasonWiseData[] } | null;
      if (cached && cached.data && Array.isArray(cached.data) && cached.data.length > 0) {
        setData(cached.data);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/mandi/season-wise?${params.toString()}`;
      console.log('Fetching season-wise data from:', apiUrl);
      const response = await fetch(apiUrl, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000), // 20 second timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch data' }));
        setApiError(errorData.error || errorData.message || `Failed to fetch data (${response.status})`);
        setData([]);
        setLoading(false);
        return;
      }

      const result = await response.json();
      console.log('Season-wise API response:', result);
      
      if (result && result.success !== false) {
        const resultData = Array.isArray(result.data) ? result.data : [];
        if (resultData.length > 0) {
          setData(resultData);
          const cacheKey = { ...filters, type: 'season-wise' };
          MandiCache.set(cacheKey, { data: resultData });
          setApiError(null);
        } else {
          setApiError('No data found for the selected filters.');
          setData([]);
        }
      } else {
        setApiError(result.error || result.message || 'Invalid response from server');
        setData([]);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      setApiError(error.message || 'Network error. Please check your connection.');
      setData([]);
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
    setCurrentPage(1);
  };

  const formatPrice = (price: number) => {
    if (!price || price === 0) return '-';
    return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formatArrival = (arrival: number) => {
    if (!arrival || arrival === 0) return '-';
    return arrival.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const csvContent = [
      ['Commodity Group', 'Commodity', 'MSP (Rs./Quintal) 2025-26', 'Kharif Price', 'Kharif Arrival', 'Rabi Price', 'Rabi Arrival'],
      ...data.map(item => [
        item.commodity_group,
        item.commodity + (item.variety ? ` (${item.variety})` : ''),
        item.msp > 0 ? item.msp.toFixed(2) : '-',
        formatPrice(item.seasons.Kharif.price),
        formatArrival(item.seasons.Kharif.arrival),
        formatPrice(item.seasons.Rabi.price),
        formatArrival(item.seasons.Rabi.arrival)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mandi-season-wise-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  }, [data, currentPage]);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  const getFilteredCommodities = () => {
    if (filters.commodity_group === 'all') return filterOptions.commodities;
    // Filter commodities by selected group
    return filterOptions.commodities;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Crop Season Wise Price & Arrival</h2>
        <p className="text-sm text-gray-600">(MSP Commodities)</p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <select
            value={filters.state}
            onChange={(e) => setFilters({ ...filters, state: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All States</option>
            {filterOptions.states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>

          <select
            value={filters.district}
            onChange={(e) => setFilters({ ...filters, district: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Districts</option>
            {filterOptions.districts.map(district => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>

          <select
            value={filters.market}
            onChange={(e) => setFilters({ ...filters, market: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Markets</option>
            {filterOptions.markets.map(market => (
              <option key={market} value={market}>{market}</option>
            ))}
          </select>

          <select
            value={filters.commodity_group}
            onChange={(e) => setFilters({ ...filters, commodity_group: e.target.value, commodity: 'all' })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Commodities</option>
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

        <div className="flex gap-2 items-center">
          <button
            onClick={loadData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Go
          </button>
          <button
            onClick={resetFilters}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Reset
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      {/* Error Message */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Error Loading Data</p>
            <p className="text-sm text-red-600 mt-1">{apiError}</p>
            <button
              onClick={loadData}
              className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Info Bar */}
      {!apiError && data.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{filters.state !== 'all' ? filters.state : 'All States'}</span>
            {filters.district !== 'all' && ` | ${filters.district} District`}
            {' '}| Data Freeze Up to {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      )}

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
                <th colSpan={2} className="border border-gray-300 px-4 py-2 text-center font-semibold">
                  Kharif Marketing Season<br />01 Oct - 30 Sep
                </th>
                <th colSpan={2} className="border border-gray-300 px-4 py-2 text-center font-semibold">
                  Rabi Marketing Season<br />01 Apr - 31 Mar
                </th>
              </tr>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium">Price (Rs./Quintal)</th>
                <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium">Arrival (Metric Tonnes)</th>
                <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium">Price (Rs./Quintal)</th>
                <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium">Arrival (Metric Tonnes)</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">{item.commodity_group}</td>
                  <td className="border border-gray-300 px-4 py-2 font-medium">
                    {item.commodity}
                    {item.variety && <span className="text-gray-600 text-sm"> ({item.variety})</span>}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {item.msp > 0 ? item.msp.toFixed(2) : '-'}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatPrice(item.seasons.Kharif.price)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatArrival(item.seasons.Kharif.arrival)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatPrice(item.seasons.Rabi.price)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatArrival(item.seasons.Rabi.arrival)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && data.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-600">
            Rows per page: {itemsPerPage} | Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, data.length)} of {data.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

