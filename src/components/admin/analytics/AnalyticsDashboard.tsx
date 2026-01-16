import { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  Users, 
  GitCompare, 
  FileText,
  Calendar,
  RefreshCw,
  Download
} from 'lucide-react';
import TimeBasedCharts from './TimeBasedCharts';
import CommodityAnalysis from './CommodityAnalysis';
import CustomerAnalysis from './CustomerAnalysis';
import ComparativeReports from './ComparativeReports';
import TabularReports from './TabularReports';

type TabType = 'time-based' | 'commodity' | 'customer' | 'comparison' | 'reports';

const tabs: { key: TabType; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'time-based', label: 'Time Analysis', icon: TrendingUp, color: 'blue' },
  { key: 'commodity', label: 'Commodity', icon: Package, color: 'emerald' },
  { key: 'customer', label: 'Customer/Seller', icon: Users, color: 'purple' },
  { key: 'comparison', label: 'Comparative', icon: GitCompare, color: 'amber' },
  { key: 'reports', label: 'Table Reports', icon: FileText, color: 'indigo' }
];

const periods = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' }
];

const groupByOptions = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' }
];

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('time-based');
  const [period, setPeriod] = useState('month');
  const [groupBy, setGroupBy] = useState('day');
  const [customerType, setCustomerType] = useState<'sales' | 'purchase'>('sales');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getTabColor = (tabKey: TabType) => {
    const tab = tabs.find(t => t.key === tabKey);
    if (!tab) return 'blue';
    return tab.color;
  };

  return (
    <div className="max-w-full mx-auto p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Comprehensive insights from your orders data</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {periods.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Group By (for time-based) */}
          {activeTab === 'time-based' && (
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {groupByOptions.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          )}

          {/* Customer Type (for customer analysis) */}
          {activeTab === 'customer' && (
            <select
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value as 'sales' | 'purchase')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="sales">Sales Customers</option>
              <option value="purchase">Purchase Suppliers</option>
            </select>
          )}

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === key
                  ? `bg-${color}-600 text-white shadow-md`
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              style={activeTab === key ? {
                backgroundColor: color === 'blue' ? '#2563eb' :
                                 color === 'emerald' ? '#059669' :
                                 color === 'purple' ? '#9333ea' :
                                 color === 'amber' ? '#d97706' :
                                 '#4f46e5'
              } : {}}
            >
              <Icon className="w-5 h-5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div key={refreshKey}>
        {activeTab === 'time-based' && (
          <TimeBasedCharts period={period} groupBy={groupBy} />
        )}

        {activeTab === 'commodity' && (
          <CommodityAnalysis period={period} />
        )}

        {activeTab === 'customer' && (
          <CustomerAnalysis period={period} type={customerType} />
        )}

        {activeTab === 'comparison' && (
          <ComparativeReports period={period} />
        )}

        {activeTab === 'reports' && (
          <TabularReports period={period} />
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Need Custom Reports?</h3>
            <p className="text-blue-100 text-sm mt-1">
              Export any report to CSV/Excel for further analysis in your preferred tools
            </p>
          </div>
          <button className="px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export All Data
          </button>
        </div>
      </div>
    </div>
  );
}
