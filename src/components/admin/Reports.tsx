import { useState, useEffect } from 'react';
import { api, Profile, Order, Offer } from '../../lib/client';
import { FileText, Download, TrendingUp, Users, Package, DollarSign, Calendar } from 'lucide-react';

export default function Reports() {
  const [reportType, setReportType] = useState<'supplier' | 'vendor' | 'order_tracking' | 'transaction' | 'performance' | 'delivery_status'>('order_tracking');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const generateReport = async () => {
    setLoading(true);
    setReportData(null);

    try {
      let data: any = {};

      switch (reportType) {
        case 'supplier':
          data = await generateSupplierReport();
          break;
        case 'vendor':
          data = await generateVendorReport();
          break;
        case 'order_tracking':
          data = await generateOrderTrackingReport();
          break;
        case 'transaction':
          data = await generateTransactionReport();
          break;
        case 'performance':
          data = await generatePerformanceReport();
          break;
        case 'delivery_status':
          data = await generateDeliveryStatusReport();
          break;
      }

      setReportData(data);

      await api.from('reports').insert({
        report_type: reportType,
        report_title: `${reportType.replace('_', ' ').toUpperCase()} Report`,
        report_data: data,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        generated_by: (await api.auth.getUser()).data.user?.id
      });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSupplierReport = async () => {
    let query = api
      .from('profiles')
      .select('id, name, email, role, entity_type, business_name, kyc_status, created_at')
      .in('role', ['farmer', 'fpo', 'corporate']);

    const { data: suppliers } = await query;

    const supplierStats = await Promise.all(
      (suppliers || []).map(async (supplier) => {
        const { data: offers } = await api
          .from('offers')
          .select('id, quantity_mt, price_per_quintal, status')
          .eq('seller_id', supplier.id);

        const { data: orders } = await api
          .from('orders')
          .select('id, quantity_mt, final_price_per_quintal, status')
          .in('offer_id', (offers || []).map(o => o.id));

        return {
          ...supplier,
          totalOffers: offers?.length || 0,
          activeOffers: offers?.filter(o => o.status === 'Active').length || 0,
          totalOrders: orders?.length || 0,
          completedOrders: orders?.filter(o => o.status === 'Completed').length || 0,
          totalRevenue: orders?.reduce((sum, o) => sum + (o.quantity_mt * o.final_price_per_quintal * 10), 0) || 0
        };
      })
    );

    return {
      totalSuppliers: supplierStats.length,
      verifiedSuppliers: supplierStats.filter(s => s.kyc_status === 'verified').length,
      suppliers: supplierStats
    };
  };

  const generateVendorReport = async () => {
    let query = api
      .from('profiles')
      .select('id, name, email, role, entity_type, business_name, kyc_status, created_at')
      .in('role', ['trader', 'miller', 'corporate']);

    const { data: vendors } = await query;

    const vendorStats = await Promise.all(
      (vendors || []).map(async (vendor) => {
        const { data: orders } = await api
          .from('orders')
          .select('id, quantity_mt, final_price_per_quintal, status, created_at')
          .eq('buyer_id', vendor.id);

        return {
          ...vendor,
          totalOrders: orders?.length || 0,
          pendingOrders: orders?.filter(o => o.status === 'Pending Approval').length || 0,
          completedOrders: orders?.filter(o => o.status === 'Completed').length || 0,
          totalSpent: orders?.reduce((sum, o) => sum + (o.quantity_mt * o.final_price_per_quintal * 10), 0) || 0
        };
      })
    );

    return {
      totalVendors: vendorStats.length,
      activeVendors: vendorStats.filter(v => v.totalOrders > 0).length,
      vendors: vendorStats
    };
  };

  const generateOrderTrackingReport = async () => {
    let query = api
      .from('orders')
      .select('*, offer:offers(commodity, variety, seller:profiles!offers_seller_id_fkey(name)), buyer:profiles!orders_buyer_id_fkey(name)')
      .order('created_at', { ascending: false });

    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data: orders } = await query;

    return {
      totalOrders: orders?.length || 0,
      pendingOrders: orders?.filter(o => o.status === 'Pending Approval').length || 0,
      approvedOrders: orders?.filter(o => o.status.includes('Approved')).length || 0,
      completedOrders: orders?.filter(o => o.status === 'Completed').length || 0,
      rejectedOrders: orders?.filter(o => o.status === 'Rejected').length || 0,
      orders: orders || []
    };
  };

  const generateTransactionReport = async () => {
    let query = api
      .from('orders')
      .select('*, offer:offers(commodity, variety, price_per_quintal, seller:profiles!offers_seller_id_fkey(name)), buyer:profiles!orders_buyer_id_fkey(name)')
      .eq('status', 'Completed')
      .order('created_at', { ascending: false });

    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data: transactions } = await query;

    const totalValue = transactions?.reduce((sum, t) => sum + (t.quantity_mt * t.final_price_per_quintal * 10), 0) || 0;
    const totalDeductions = transactions?.reduce((sum, t) => sum + (t.deduction_amount || 0), 0) || 0;

    return {
      totalTransactions: transactions?.length || 0,
      totalValue: totalValue,
      totalDeductions: totalDeductions,
      netValue: totalValue - totalDeductions,
      averageOrderValue: transactions?.length ? totalValue / transactions.length : 0,
      transactions: transactions || []
    };
  };

  const generatePerformanceReport = async () => {
    const { data: suppliers } = await api
      .from('profiles')
      .select('id, name, role')
      .in('role', ['farmer', 'fpo', 'corporate']);

    const performanceData = await Promise.all(
      (suppliers || []).map(async (supplier) => {
        const { data: offers } = await api
          .from('offers')
          .select('id')
          .eq('seller_id', supplier.id);

        const offerIds = (offers || []).map(o => o.id);

        const { data: orders } = await api
          .from('orders')
          .select('id, status, created_at')
          .in('offer_id', offerIds);

        const { data: shipments } = await api
          .from('logistics_shipments')
          .select('id, status, created_at, actual_delivery_date, expected_delivery_date')
          .in('order_id', (orders || []).map(o => o.id));

        const onTimeDeliveries = shipments?.filter(s => {
          if (!s.actual_delivery_date || !s.expected_delivery_date) return false;
          return new Date(s.actual_delivery_date) <= new Date(s.expected_delivery_date);
        }).length || 0;

        return {
          supplier: supplier.name,
          role: supplier.role,
          totalOrders: orders?.length || 0,
          completedOrders: orders?.filter(o => o.status === 'Completed').length || 0,
          completionRate: orders?.length ? ((orders.filter(o => o.status === 'Completed').length / orders.length) * 100).toFixed(1) : 0,
          totalShipments: shipments?.length || 0,
          onTimeDeliveries: onTimeDeliveries,
          onTimeRate: shipments?.length ? ((onTimeDeliveries / shipments.length) * 100).toFixed(1) : 0
        };
      })
    );

    return {
      suppliers: performanceData,
      averageCompletionRate: performanceData.length ?
        (performanceData.reduce((sum, s) => sum + parseFloat(s.completionRate.toString()), 0) / performanceData.length).toFixed(1) : 0
    };
  };

  const generateDeliveryStatusReport = async () => {
    let query = api
      .from('logistics_shipments')
      .select('*, order:orders(id, offer:offers(commodity, variety, seller:profiles!offers_seller_id_fkey(name)), buyer:profiles!orders_buyer_id_fkey(name))')
      .order('created_at', { ascending: false });

    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data: shipments } = await query;

    return {
      totalShipments: shipments?.length || 0,
      pending: shipments?.filter(s => s.status === 'pending').length || 0,
      inTransit: shipments?.filter(s => s.status === 'in_transit').length || 0,
      delivered: shipments?.filter(s => s.status === 'delivered').length || 0,
      cancelled: shipments?.filter(s => s.status === 'cancelled').length || 0,
      shipments: shipments || []
    };
  };

  const downloadReport = () => {
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Generate Reports
        </h2>
        <p className="text-gray-600 mb-6">Create comprehensive reports on suppliers, vendors, orders, and transactions</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="order_tracking">Order Tracking</option>
              <option value="supplier">Supplier Report</option>
              <option value="vendor">Vendor Report</option>
              <option value="transaction">Transaction Details</option>
              <option value="performance">Performance Report</option>
              <option value="delivery_status">Delivery Status</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          onClick={generateReport}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating Report...' : 'Generate Report'}
        </button>
      </div>

      {reportData && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">Report Results</h3>
            <button
              onClick={downloadReport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download JSON
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {reportType === 'supplier' && (
              <>
                <div className="bg-blue-50 rounded-lg p-4">
                  <Users className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="text-sm text-gray-600">Total Suppliers</p>
                  <p className="text-2xl font-bold text-gray-800">{reportData.totalSuppliers}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <Users className="w-8 h-8 text-green-600 mb-2" />
                  <p className="text-sm text-gray-600">Verified</p>
                  <p className="text-2xl font-bold text-gray-800">{reportData.verifiedSuppliers}</p>
                </div>
              </>
            )}

            {reportType === 'vendor' && (
              <>
                <div className="bg-blue-50 rounded-lg p-4">
                  <Users className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="text-sm text-gray-600">Total Vendors</p>
                  <p className="text-2xl font-bold text-gray-800">{reportData.totalVendors}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
                  <p className="text-sm text-gray-600">Active Vendors</p>
                  <p className="text-2xl font-bold text-gray-800">{reportData.activeVendors}</p>
                </div>
              </>
            )}

            {reportType === 'order_tracking' && (
              <>
                <div className="bg-blue-50 rounded-lg p-4">
                  <Package className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-800">{reportData.totalOrders}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <Package className="w-8 h-8 text-yellow-600 mb-2" />
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-800">{reportData.pendingOrders}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <Package className="w-8 h-8 text-green-600 mb-2" />
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-800">{reportData.completedOrders}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <Package className="w-8 h-8 text-red-600 mb-2" />
                  <p className="text-sm text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-gray-800">{reportData.rejectedOrders}</p>
                </div>
              </>
            )}

            {reportType === 'transaction' && (
              <>
                <div className="bg-blue-50 rounded-lg p-4">
                  <DollarSign className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-xl font-bold text-gray-800">₹{reportData.totalValue.toFixed(0)}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <DollarSign className="w-8 h-8 text-yellow-600 mb-2" />
                  <p className="text-sm text-gray-600">Deductions</p>
                  <p className="text-xl font-bold text-gray-800">₹{reportData.totalDeductions.toFixed(0)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <DollarSign className="w-8 h-8 text-green-600 mb-2" />
                  <p className="text-sm text-gray-600">Net Value</p>
                  <p className="text-xl font-bold text-gray-800">₹{reportData.netValue.toFixed(0)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <Package className="w-8 h-8 text-gray-600 mb-2" />
                  <p className="text-sm text-gray-600">Transactions</p>
                  <p className="text-2xl font-bold text-gray-800">{reportData.totalTransactions}</p>
                </div>
              </>
            )}
          </div>

          <div className="overflow-x-auto">
            <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-auto max-h-96">
              {JSON.stringify(reportData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
