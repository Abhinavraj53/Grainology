import { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, Download, Printer, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { MandiCache } from '../lib/sessionStorage';
import { useIsVisible } from '../hooks/useIsVisible';

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
    commodity_group: 'Cereals', // Default to Cereals to show Paddy, Maize, Wheat
    commodity: 'all',
    variety: 'all',
    grade: 'FAQ'
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [apiError, setApiError] = useState<string | null>(null);
  const itemsPerCommodity = 3; // 3 Paddy + 3 Maize + 3 Wheat = 9 rows per page
  const componentRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(componentRef);

  useEffect(() => {
    // Only load if component is visible
    if (isVisible) {
      loadFilterOptions();
    }
  }, [isVisible]);

  useEffect(() => {
    // Only load data if component is visible and filter options are loaded
    if (isVisible && filterOptions.states.length > 0) {
      // On initial load, fetch default commodities (Paddy, Maize, Wheat)
      if (isInitialLoad) {
        loadDefaultData();
        setIsInitialLoad(false);
      } else {
        loadData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, filters, filterOptions.states.length]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const loadFilterOptions = async () => {
    try {
      // Check cache first
      const cached = MandiCache.getFilters() as FilterOptions | null;
      if (cached) {
        setFilterOptions(cached);
        return;
      }

      // Fetch from API
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/mandi/filters`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch filters' }));
        console.error('Failed to load filter options:', errorData);
        // Set empty filters to prevent infinite loading
        setFilterOptions({
          states: [],
          districts: [],
          markets: [],
          commodities: [],
          varieties: [],
          commodity_groups: []
        });
        return;
      }

      const options = await response.json();
      if (options && typeof options === 'object') {
        setFilterOptions(options);
        // Cache the filters
        MandiCache.setFilters(options);
        setApiError(null); // Clear any previous errors
      } else {
        setApiError('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Error loading filter options:', error);
      setApiError(error.message || 'Failed to load filter options. Please try again later.');
      // Set empty filters on error
      setFilterOptions({
        states: [],
        districts: [],
        markets: [],
        commodities: [],
        varieties: [],
        commodity_groups: []
      });
    }
  };

  const loadDefaultData = async () => {
    try {
      setLoading(true);
      
      // Check cache first
      const cached = MandiCache.getDefault() as { data: AgMarkNetData[]; dates: string[] } | null;
      if (cached && cached.data && cached.dates) {
        setData(cached.data);
        setDates(cached.dates);
        setLoading(false);
        return;
      }

      // Fetch data for Paddy, Maize, Wheat by default
      const params = new URLSearchParams();
      params.append('commodity_group', 'Cereals');
      // Filter to show only Paddy, Maize, Wheat
      const defaultCommodities = ['Paddy', 'Maize', 'Wheat'];
      
      // Fetch data for each commodity and combine
      const allData: AgMarkNetData[] = [];
      const allDatesSet = new Set<string>();

      for (const commodity of defaultCommodities) {
        const commodityParams = new URLSearchParams(params);
        commodityParams.append('commodity', commodity);
        
        try {
          const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/mandi/agmarknet?${commodityParams.toString()}`;
          const response = await fetch(apiUrl);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to fetch data' }));
            console.error(`Failed to fetch ${commodity} data:`, errorData);
            continue; // Skip this commodity and continue with others
          }

          const result = await response.json();
          if (result && result.success !== false && result.data && Array.isArray(result.data) && result.data.length > 0) {
            // Take all data (we'll paginate it)
            allData.push(...result.data);
            if (result.dates && Array.isArray(result.dates)) {
              result.dates.forEach((d: string) => allDatesSet.add(d));
            }
          }
        } catch (error) {
          console.error(`Error fetching ${commodity} data:`, error);
          // Continue with other commodities even if one fails
        }
      }

      // Sort dates and take last 3
      const sortedDates = Array.from(allDatesSet).sort().reverse().slice(0, 3);
      setData(allData);
      setDates(sortedDates);
      
      // Cache the data
      MandiCache.setDefault({ data: allData, dates: sortedDates });
      setApiError(null); // Clear any previous errors
    } catch (error: any) {
      console.error('Error loading default data:', error);
      setApiError(error.message || 'Failed to load mandi data. Please check your connection and try again.');
      setData([]);
      setDates([]);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Check cache first
      const cached = MandiCache.get(filters) as { data: AgMarkNetData[]; dates: string[] } | null;
      if (cached && cached.data && cached.dates) {
        setData(cached.data);
        setDates(cached.dates);
        setLoading(false);
        return;
      }

      // Fetch from API
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/mandi/agmarknet?${params.toString()}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch data' }));
        console.error('Failed to fetch mandi data:', errorData);
        setApiError(errorData.error || errorData.message || 'Failed to fetch mandi data. Please try again.');
        setData([]);
        setDates([]);
        return;
      }

      const result = await response.json();
      if (result && result.success !== false) {
        const resultData = Array.isArray(result.data) ? result.data : [];
        const resultDates = Array.isArray(result.dates) ? result.dates : [];
        setData(resultData);
        setDates(resultDates);
        
        // Cache the data
        MandiCache.set(filters, { data: resultData, dates: resultDates });
        setApiError(null); // Clear any previous errors
      } else {
        console.error('API returned error:', result);
        setApiError(result.error || result.message || 'Invalid response from server');
        setData([]);
        setDates([]);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      setApiError(error.message || 'Network error. Please check your connection and try again.');
      setData([]);
      setDates([]);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      state: 'all',
      district: 'all',
      market: 'all',
      commodity_group: 'Cereals', // Reset to default
      commodity: 'all',
      variety: 'all',
      grade: 'FAQ'
    });
    setIsInitialLoad(true); // Reload default data
    setCurrentPage(1); // Reset to first page
  };

  // Organize data for pagination: 3 Paddy, 3 Maize, 3 Wheat per page (default)
  // If a specific commodity is filtered, show 9 rows of that commodity per page
  const paginatedData = useMemo(() => {
    // Check if a specific commodity is filtered
    const isSpecificCommodityFiltered = filters.commodity !== 'all';
    
    if (isSpecificCommodityFiltered) {
      // If specific commodity filtered, show 9 rows of that commodity per page
      const startIndex = (currentPage - 1) * 9;
      return data.slice(startIndex, startIndex + 9);
    }

    // Default: Group data by commodity (Paddy, Maize, Wheat)
    const paddyData = data.filter(item => 
      item.commodity.toLowerCase().includes('paddy') || 
      item.commodity.toLowerCase().includes('rice')
    );
    const maizeData = data.filter(item => 
      item.commodity.toLowerCase().includes('maize') || 
      item.commodity.toLowerCase().includes('corn')
    );
    const wheatData = data.filter(item => 
      item.commodity.toLowerCase().includes('wheat')
    );

    // Calculate items per commodity per page (3 each)
    const startIndex = (currentPage - 1) * itemsPerCommodity;

    // Get 3 items from each commodity for current page
    const paddyPage = paddyData.slice(startIndex, startIndex + itemsPerCommodity);
    const maizePage = maizeData.slice(startIndex, startIndex + itemsPerCommodity);
    const wheatPage = wheatData.slice(startIndex, startIndex + itemsPerCommodity);

    // Combine: Paddy first, then Maize, then Wheat (3 each = 9 total)
    return [...paddyPage, ...maizePage, ...wheatPage];
  }, [data, currentPage, filters.commodity, itemsPerCommodity]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    // Check if a specific commodity is filtered
    const isSpecificCommodityFiltered = filters.commodity !== 'all';
    
    if (isSpecificCommodityFiltered) {
      // If specific commodity filtered, calculate pages based on total data
      return Math.ceil(data.length / 9);
    }

    // Default: Calculate based on the commodity with most data
    const paddyData = data.filter(item => 
      item.commodity.toLowerCase().includes('paddy') || 
      item.commodity.toLowerCase().includes('rice')
    );
    const maizeData = data.filter(item => 
      item.commodity.toLowerCase().includes('maize') || 
      item.commodity.toLowerCase().includes('corn')
    );
    const wheatData = data.filter(item => 
      item.commodity.toLowerCase().includes('wheat')
    );

    const maxLength = Math.max(paddyData.length, maizeData.length, wheatData.length);
    return Math.ceil(maxLength / itemsPerCommodity);
  }, [data, filters.commodity, itemsPerCommodity]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      // Handle different date formats: YYYY-MM-DD, ISO strings, etc.
      let date: Date;
      if (dateStr.includes('T')) {
        date = new Date(dateStr);
      } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // YYYY-MM-DD format
        date = new Date(dateStr + 'T00:00:00');
      } else {
        date = new Date(dateStr);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      
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
    
    // Map commodity groups to commodities
    const groupCommodities: Record<string, string[]> = {
      'Cereals': ['Paddy', 'Maize', 'Wheat', 'Bajra', 'Pearl Millet', 'Barley', 'Jowar', 'Sorghum', 'Ragi', 'Finger Millet'],
      'Fibre Crops': ['Cotton'],
      'Oil Seeds': ['Groundnut', 'Soybean', 'Sunflower', 'Copra'],
      'Vegetables': ['Tomato', 'Onion', 'Potato'],
      'Others': []
    };
    
    const groupCommodityList = groupCommodities[filters.commodity_group] || [];
    if (groupCommodityList.length > 0) {
      return filterOptions.commodities.filter(c => 
        groupCommodityList.some(gc => c.includes(gc) || gc.includes(c))
      );
    }
    
    return filterOptions.commodities;
  };

  return (
    <div ref={componentRef} className="space-y-6">
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

        {/* Error Message */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Error Loading Data</p>
              <p className="text-sm text-red-600 mt-1">{apiError}</p>
              <button
                onClick={() => {
                  setApiError(null);
                  if (isInitialLoad) {
                    loadDefaultData();
                  } else {
                    loadData();
                  }
                }}
                className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Info Bar */}
        {!apiError && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">All States</span> | Data Freeze Up to {dates[0] ? formatDate(dates[0]) : new Date().toLocaleDateString()}
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

        {/* Pagination Controls */}
        {!loading && data.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 10) {
                    pageNum = i + 1;
                  } else if (currentPage <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 4) {
                    pageNum = totalPages - 9 + i;
                  } else {
                    pageNum = currentPage - 5 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-lg ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                  </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
                  </div>

            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages} 
              <span className="ml-2 text-gray-500">
                (Showing {paginatedData.length} of {data.length} records)
                      </span>
                    </div>
          </div>
        )}
      </div>
    </div>
  );
}
