import { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  Users, 
  Package, 
  MinusCircle, 
  Warehouse, 
  Truck, 
  CheckCircle, 
  MapPin, 
  TrendingUp,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Props {
  period: string;
}

type ReportType = 
  | 'order-summary' 
  | 'daily-transaction' 
  | 'customer-ledger' 
  | 'commodity-price' 
  | 'deduction' 
  | 'warehouse-stock' 
  | 'vehicle' 
  | 'quality' 
  | 'state-summary' 
  | 'monthly-pl';

const reportTypes: { key: ReportType; label: string; icon: React.ElementType }[] = [
  { key: 'order-summary', label: 'Order Summary', icon: FileText },
  { key: 'daily-transaction', label: 'Daily Transaction', icon: Calendar },
  { key: 'customer-ledger', label: 'Customer Ledger', icon: Users },
  { key: 'commodity-price', label: 'Commodity Price', icon: Package },
  { key: 'deduction', label: 'Deduction Report', icon: MinusCircle },
  { key: 'warehouse-stock', label: 'Warehouse Stock', icon: Warehouse },
  { key: 'vehicle', label: 'Vehicle Report', icon: Truck },
  { key: 'quality', label: 'Quality Report', icon: CheckCircle },
  { key: 'state-summary', label: 'State Summary', icon: MapPin },
  { key: 'monthly-pl', label: 'Monthly P&L', icon: TrendingUp }
];

export default function TabularReports({ period }: Props) {
  const [activeReport, setActiveReport] = useState<ReportType>('order-summary');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  useEffect(() => {
    fetchReport();
  }, [activeReport, period, pagination.page]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('auth_token');

      const response = await fetch(
        `${apiUrl}/analytics/reports/${activeReport}?period=${period}&page=${pagination.page}&limit=${pagination.limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        setData(result.data || []);
        setPagination(prev => ({
          ...prev,
          total: result.pagination?.total || 0,
          totalPages: result.pagination?.totalPages || 0
        }));
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value === undefined || value === null) return '₹0';
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const exportToCSV = () => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const value = row[h];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeReport}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const renderTable = () => {
    if (loading) {
      return (
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-2"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded mb-2"></div>
          ))}
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No data available for this report</p>
        </div>
      );
    }

    switch (activeReport) {
      case 'order-summary':
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 font-semibold">Type</th>
                <th className="text-left p-3 font-semibold">Date</th>
                <th className="text-left p-3 font-semibold">Invoice</th>
                <th className="text-left p-3 font-semibold">Customer</th>
                <th className="text-left p-3 font-semibold">Commodity</th>
                <th className="text-right p-3 font-semibold">Net Weight (MT)</th>
                <th className="text-right p-3 font-semibold">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      row.type === 'Sales' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="p-3">{formatDate(row.date)}</td>
                  <td className="p-3 font-mono text-xs">{row.invoice}</td>
                  <td className="p-3">{row.customer}</td>
                  <td className="p-3">{row.commodity} {row.variety !== 'N/A' && <span className="text-gray-500">({row.variety})</span>}</td>
                  <td className="p-3 text-right">{row.netWeight?.toFixed(3)}</td>
                  <td className="p-3 text-right font-semibold text-green-600">{formatCurrency(row.netAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'daily-transaction':
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 font-semibold">Date</th>
                <th className="text-right p-3 font-semibold">Total Orders</th>
                <th className="text-right p-3 font-semibold text-emerald-600">Sales</th>
                <th className="text-right p-3 font-semibold text-indigo-600">Purchase</th>
                <th className="text-right p-3 font-semibold">Total Amount</th>
                <th className="text-right p-3 font-semibold">Total Weight (MT)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 font-medium">{row.date}</td>
                  <td className="p-3 text-right font-semibold">{row.totalOrders}</td>
                  <td className="p-3 text-right text-emerald-600">{row.salesOrders}</td>
                  <td className="p-3 text-right text-indigo-600">{row.purchaseOrders}</td>
                  <td className="p-3 text-right font-semibold text-green-600">{formatCurrency(row.totalAmount)}</td>
                  <td className="p-3 text-right">{row.totalWeight?.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'customer-ledger':
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 font-semibold">Customer</th>
                <th className="text-left p-3 font-semibold">Email</th>
                <th className="text-right p-3 font-semibold">Orders</th>
                <th className="text-right p-3 font-semibold">Total Amount</th>
                <th className="text-right p-3 font-semibold">Weight (MT)</th>
                <th className="text-right p-3 font-semibold text-amber-600">Pending</th>
                <th className="text-right p-3 font-semibold text-green-600">Paid</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 font-medium">{row.customer}</td>
                  <td className="p-3 text-gray-500 text-xs">{row.email}</td>
                  <td className="p-3 text-right">{row.totalOrders}</td>
                  <td className="p-3 text-right font-semibold">{formatCurrency(row.totalAmount)}</td>
                  <td className="p-3 text-right">{row.totalWeight?.toFixed(3)}</td>
                  <td className="p-3 text-right text-amber-600">{formatCurrency(row.pending)}</td>
                  <td className="p-3 text-right text-green-600">{formatCurrency(row.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'commodity-price':
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 font-semibold">Commodity</th>
                <th className="text-left p-3 font-semibold">Variety</th>
                <th className="text-right p-3 font-semibold">Avg Rate/MT</th>
                <th className="text-right p-3 font-semibold text-red-600">Min Rate</th>
                <th className="text-right p-3 font-semibold text-green-600">Max Rate</th>
                <th className="text-right p-3 font-semibold">Orders</th>
                <th className="text-right p-3 font-semibold">Weight (MT)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 font-medium">{row.commodity}</td>
                  <td className="p-3">{row.variety}</td>
                  <td className="p-3 text-right font-semibold">{formatCurrency(row.avgRate)}</td>
                  <td className="p-3 text-right text-red-600">{formatCurrency(row.minRate)}</td>
                  <td className="p-3 text-right text-green-600">{formatCurrency(row.maxRate)}</td>
                  <td className="p-3 text-right">{row.totalOrders}</td>
                  <td className="p-3 text-right">{row.totalWeight?.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'deduction':
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 font-semibold">Invoice</th>
                <th className="text-left p-3 font-semibold">Date</th>
                <th className="text-left p-3 font-semibold">Commodity</th>
                <th className="text-right p-3 font-semibold">HLW Ded.</th>
                <th className="text-right p-3 font-semibold">MOI+BDOI Ded.</th>
                <th className="text-right p-3 font-semibold">Other Ded.</th>
                <th className="text-right p-3 font-semibold text-red-600">Total Ded.</th>
                <th className="text-right p-3 font-semibold text-green-600">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 font-mono text-xs">{row.invoice}</td>
                  <td className="p-3">{formatDate(row.date)}</td>
                  <td className="p-3">{row.commodity}</td>
                  <td className="p-3 text-right">{formatCurrency(row.hlwDeduction)}</td>
                  <td className="p-3 text-right">{formatCurrency(row.moiBdoiDeduction)}</td>
                  <td className="p-3 text-right">{formatCurrency(row.otherDeductions)}</td>
                  <td className="p-3 text-right text-red-600 font-semibold">{formatCurrency(row.totalDeduction)}</td>
                  <td className="p-3 text-right text-green-600 font-semibold">{formatCurrency(row.netAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'warehouse-stock':
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 font-semibold">Warehouse</th>
                <th className="text-left p-3 font-semibold">Commodity</th>
                <th className="text-right p-3 font-semibold text-emerald-600">Qty In (MT)</th>
                <th className="text-right p-3 font-semibold text-red-600">Qty Out (MT)</th>
                <th className="text-right p-3 font-semibold">Balance (MT)</th>
                <th className="text-right p-3 font-semibold">Orders In</th>
                <th className="text-right p-3 font-semibold">Orders Out</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 font-medium">{row.warehouse}</td>
                  <td className="p-3">{row.commodity}</td>
                  <td className="p-3 text-right text-emerald-600">{row.quantityIn?.toFixed(3)}</td>
                  <td className="p-3 text-right text-red-600">{row.quantityOut?.toFixed(3)}</td>
                  <td className={`p-3 text-right font-semibold ${row.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.balance?.toFixed(3)}
                  </td>
                  <td className="p-3 text-right">{row.ordersIn}</td>
                  <td className="p-3 text-right">{row.ordersOut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'vehicle':
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 font-semibold">Vehicle No.</th>
                <th className="text-right p-3 font-semibold">Trips</th>
                <th className="text-right p-3 font-semibold">Total Weight (MT)</th>
                <th className="text-right p-3 font-semibold">Total Amount</th>
                <th className="text-left p-3 font-semibold">Commodities</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 font-mono font-medium">{row.vehicleNo}</td>
                  <td className="p-3 text-right">{row.trips}</td>
                  <td className="p-3 text-right">{row.totalWeight?.toFixed(3)}</td>
                  <td className="p-3 text-right font-semibold text-green-600">{formatCurrency(row.totalAmount)}</td>
                  <td className="p-3 text-xs text-gray-500">{row.commodities}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'quality':
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 font-semibold">Invoice</th>
                <th className="text-left p-3 font-semibold">Commodity</th>
                <th className="text-right p-3 font-semibold">HLW</th>
                <th className="text-right p-3 font-semibold">Moisture</th>
                <th className="text-right p-3 font-semibold">BDOI</th>
                <th className="text-right p-3 font-semibold">Total Ded.</th>
                <th className="text-center p-3 font-semibold">Grade</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 font-mono text-xs">{row.invoice}</td>
                  <td className="p-3">{row.commodity} <span className="text-gray-500">({row.variety})</span></td>
                  <td className="p-3 text-right">{row.hlw}</td>
                  <td className="p-3 text-right">{row.moisture}%</td>
                  <td className="p-3 text-right">{row.bdoi}%</td>
                  <td className="p-3 text-right text-red-600">{formatCurrency(row.totalDeduction)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      row.qualityGrade === 'A' ? 'bg-green-100 text-green-700' :
                      row.qualityGrade === 'B' ? 'bg-blue-100 text-blue-700' :
                      row.qualityGrade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {row.qualityGrade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'state-summary':
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 font-semibold">State</th>
                <th className="text-right p-3 font-semibold">Total Orders</th>
                <th className="text-right p-3 font-semibold text-emerald-600">Sales</th>
                <th className="text-right p-3 font-semibold text-indigo-600">Purchase</th>
                <th className="text-right p-3 font-semibold">Total Amount</th>
                <th className="text-right p-3 font-semibold">Weight (MT)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 font-medium">{row.state}</td>
                  <td className="p-3 text-right font-semibold">{row.totalOrders}</td>
                  <td className="p-3 text-right text-emerald-600">{row.salesOrders} ({formatCurrency(row.salesAmount)})</td>
                  <td className="p-3 text-right text-indigo-600">{row.purchaseOrders} ({formatCurrency(row.purchaseAmount)})</td>
                  <td className="p-3 text-right font-semibold text-green-600">{formatCurrency(row.totalAmount)}</td>
                  <td className="p-3 text-right">{row.totalWeight?.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'monthly-pl':
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 font-semibold">Month</th>
                <th className="text-right p-3 font-semibold">Orders</th>
                <th className="text-right p-3 font-semibold">Gross Amount</th>
                <th className="text-right p-3 font-semibold text-red-600">Deductions</th>
                <th className="text-right p-3 font-semibold text-green-600">Net Amount</th>
                <th className="text-right p-3 font-semibold">Weight (MT)</th>
                <th className="text-right p-3 font-semibold">Growth %</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 font-medium">{row.month}</td>
                  <td className="p-3 text-right">{row.totalOrders}</td>
                  <td className="p-3 text-right">{formatCurrency(row.grossAmount)}</td>
                  <td className="p-3 text-right text-red-600">{formatCurrency(row.totalDeductions)}</td>
                  <td className="p-3 text-right font-semibold text-green-600">{formatCurrency(row.netAmount)}</td>
                  <td className="p-3 text-right">{row.totalWeight?.toFixed(3)}</td>
                  <td className="p-3 text-right">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      row.growthPercent > 0 ? 'bg-green-100 text-green-700' :
                      row.growthPercent < 0 ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {row.growthPercent > 0 ? '+' : ''}{row.growthPercent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div className="flex flex-wrap gap-2">
        {reportTypes.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => {
              setActiveReport(key);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-all ${
              activeReport === key
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            {reportTypes.find(r => r.key === activeReport)?.label} Report
          </h3>
          <button
            onClick={exportToCSV}
            disabled={data.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          {renderTable()}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total records)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
