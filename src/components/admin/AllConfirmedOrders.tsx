import { useState, useEffect } from 'react';
import { Eye, Filter, X, Download, Edit, Trash2, FileDown } from 'lucide-react';
import { generateOrderPDF } from '../../utils/pdfGenerator';

interface ConfirmedSalesOrder {
  id: string;
  invoice_number: string;
  transaction_date: string;
  customer_id: {
    id: string;
    name: string;
    email: string;
    mobile_number?: string;
  };
  commodity: string;
  variety?: string;
  vehicle_no: string;
  net_weight_mt: number;
  rate_per_mt: number;
  gross_amount: number;
  total_deduction: number;
  net_amount: number;
  state?: string;
  seller_name?: string;
  location?: string;
  warehouse_name?: string;
  chamber_no?: string;
  gate_pass_no?: string;
  weight_slip_no?: string;
  gross_weight_mt?: number;
  tare_weight_mt?: number;
  no_of_bags?: number;
  hlw_wheat?: number;
  excess_hlw?: number;
  deduction_amount_hlw?: number;
  moisture_moi?: number;
  excess_moisture?: number;
  bdoi?: number;
  excess_bdoi?: number;
  moi_bdoi?: number;
  weight_deduction_kg?: number;
  deduction_amount_moi_bdoi?: number;
  other_deductions?: Array<{ amount: number; remarks: string }>;
  quality_report?: Record<string, any>;
  delivery_location?: string;
  remarks?: string;
  created_by?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
}

interface ConfirmedPurchaseOrder {
  id: string;
  invoice_number: string;
  transaction_date: string;
  customer_id: {
    id: string;
    name: string;
    email: string;
    mobile_number?: string;
  };
  commodity: string;
  variety?: string;
  vehicle_no: string;
  net_weight_mt: number;
  rate_per_mt: number;
  gross_amount: number;
  total_deduction: number;
  net_amount: number;
  state?: string;
  supplier_name?: string; // Different from seller_name
  location?: string;
  warehouse_name?: string;
  chamber_no?: string;
  gate_pass_no?: string;
  weight_slip_no?: string;
  gross_weight_mt?: number;
  tare_weight_mt?: number;
  no_of_bags?: number;
  hlw_wheat?: number;
  excess_hlw?: number;
  deduction_amount_hlw?: number;
  moisture_moi?: number;
  excess_moisture?: number;
  bddi?: number; // Different from bdoi
  excess_bddi?: number;
  moi_bddi?: number;
  weight_deduction_kg?: number;
  deduction_amount_moi_bddi?: number;
  other_deductions?: Array<{ amount: number; remarks: string }>;
  quality_report?: Record<string, any>;
  delivery_location?: string;
  remarks?: string;
  created_by?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
}

type ConfirmedOrder = (ConfirmedSalesOrder & { orderType: 'sales' }) | (ConfirmedPurchaseOrder & { orderType: 'purchase' });

export default function AllConfirmedOrders() {
  const [salesOrders, setSalesOrders] = useState<ConfirmedSalesOrder[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<ConfirmedPurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ConfirmedOrder | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'sales' | 'purchase'>('all');
  const [editingOrder, setEditingOrder] = useState<ConfirmedOrder | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'sales' | 'purchase' } | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('auth_token');

      if (!token) {
        setError('Authentication required');
        return;
      }

      const [salesRes, purchaseRes] = await Promise.all([
        fetch(`${apiUrl}/confirmed-sales-orders`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${apiUrl}/confirmed-purchase-orders`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!salesRes.ok || !purchaseRes.ok) {
        throw new Error('Failed to fetch confirmed orders');
      }

      const salesData = await salesRes.json();
      const purchaseData = await purchaseRes.json();

      setSalesOrders(salesData);
      setPurchaseOrders(purchaseData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportToCSV = () => {
    try {
      // Helper functions for CSV export (different from display formatting)
      const exportFormatDate = (dateStr: string | undefined) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return dateStr;
          return date.toLocaleDateString('en-GB');
        } catch {
          return dateStr;
        }
      };

      const exportFormatCurrency = (amount: number | undefined) => {
        if (amount === undefined || amount === null) return '0.00';
        return amount.toFixed(2);
      };

      const ordersToExport = filteredOrders;
      
      if (ordersToExport.length === 0) {
        alert('No orders to export');
        return;
      }

      // Separate sales and purchase orders
      const salesOrdersToExport = ordersToExport.filter(o => o.orderType === 'sales') as ConfirmedSalesOrder[];
      const purchaseOrdersToExport = ordersToExport.filter(o => o.orderType === 'purchase') as ConfirmedPurchaseOrder[];

      let csvContent = '';
      let filename = '';

      // Export Purchase Orders (39 columns - no separate remarks for other deductions)
      if (purchaseOrdersToExport.length > 0) {
        const purchaseHeaders = [
          'Date of Transaction',
          'State',
          'Supplier Name',
          'Location',
          'Warehouse Name',
          'Chamber No.',
          'Commodity',
          'Variety',
          'Gate Pass No.',
          'Vehicle No.',
          'Weight Slip No.',
          'Gross Weight in MT (Vehicle + Goods)',
          'Tare Weight of Vehicle',
          'No. of Bags',
          'Net Weight in MT',
          'Rate Per MT',
          'Gross Amount',
          'HLW (Hectolitre Weight) in Wheat',
          'Excess HLW',
          'Deduction Amount Rs. (HLW)',
          'Moisture (MOI)',
          'Excess Moisture',
          'Broken, Damage, Discolour, Immature (BDDI)',
          'Excess BDDI',
          'MOI+BDDI',
          'Weight Deduction in KG',
          'Deduction Amount Rs. (MOI+BDDI)',
          'Other Deduction 1',
          'Other Deduction 2',
          'Other Deduction 3',
          'Other Deduction 4',
          'Other Deduction 5',
          'Other Deduction 6',
          'Other Deduction 7',
          'Other Deduction 8',
          'Other Deduction 9',
          'Other Deduction 10',
          'Net Amount',
          'Remarks'
        ];

        const purchaseRows = purchaseOrdersToExport.map(order => {
          // Get other deductions (up to 10)
          const otherDeductions = order.other_deductions || [];
          const deductionValues = Array(10).fill('-').map((_, idx) => {
            if (otherDeductions[idx]) {
              return formatCurrency(otherDeductions[idx].amount);
            }
            return '-';
          });

          return [
            formatDate(order.transaction_date),
            order.state || '',
            order.supplier_name || order.customer_id?.name || '',
            order.location || '',
            order.warehouse_name || '',
            order.chamber_no || '',
            order.commodity || '',
            order.variety || '',
            order.gate_pass_no || '',
            order.vehicle_no || '',
            order.weight_slip_no || '',
            exportFormatCurrency(order.gross_weight_mt),
            exportFormatCurrency(order.tare_weight_mt),
            (order.no_of_bags || 0).toString(),
            exportFormatCurrency(order.net_weight_mt),
            exportFormatCurrency(order.rate_per_mt),
            exportFormatCurrency(order.gross_amount),
            exportFormatCurrency(order.hlw_wheat) || 'Not Applicable',
            exportFormatCurrency(order.excess_hlw) || 'Not Applicable',
            exportFormatCurrency(order.deduction_amount_hlw) || '0.00',
            exportFormatCurrency(order.moisture_moi) || '',
            exportFormatCurrency(order.excess_moisture) || '',
            exportFormatCurrency(order.bddi) || '',
            exportFormatCurrency(order.excess_bddi) || '',
            exportFormatCurrency(order.moi_bddi) || '',
            exportFormatCurrency(order.weight_deduction_kg) || '',
            exportFormatCurrency(order.deduction_amount_moi_bddi) || '',
            ...deductionValues,
            exportFormatCurrency(order.net_amount),
            order.remarks || ''
          ];
        });

        csvContent = [purchaseHeaders, ...purchaseRows]
          .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        
        filename = filterType === 'all' 
          ? `all_confirmed_orders_${new Date().toISOString().split('T')[0]}.csv`
          : `confirmed_purchase_orders_${new Date().toISOString().split('T')[0]}.csv`;
      }

      // Export Sales Orders (with separate remarks columns for other deductions)
      if (salesOrdersToExport.length > 0) {
        const salesHeaders = [
          'Date of Transaction',
          'State',
          'Customer',
          'Seller Name',
          'Location',
          'Warehouse Name',
          'Chamber No.',
          'Commodity',
          'Variety',
          'Gate Pass No.',
          'Vehicle No.',
          'Weight Slip No.',
          'Gross Weight in MT (Vehicle + Goods)',
          'Tare Weight of Vehicle',
          'No. of Bags',
          'Net Weight in MT',
          'Rate Per MT',
          'Gross Amount',
          'HLW (Hectolitre Weight) in Wheat',
          'Excess HLW',
          'Deduction Amount Rs. (HLW)',
          'Moisture (MOI)',
          'Excess Moisture',
          'Broken, Damage, Discolour, Immature (BDOI)',
          'Excess BDOI',
          'MOI+BDOI',
          'Weight Deduction in KG (MOI+BDOI)',
          'Deduction Amount Rs. (MOI+BDOI)',
          'Other Deduction 1',
          'Other Deduction 1 Remarks',
          'Other Deduction 2',
          'Other Deduction 2 Remarks',
          'Other Deduction 3',
          'Other Deduction 3 Remarks',
          'Other Deduction 4',
          'Other Deduction 4 Remarks',
          'Other Deduction 5',
          'Other Deduction 5 Remarks',
          'Other Deduction 6',
          'Other Deduction 6 Remarks',
          'Other Deduction 7',
          'Other Deduction 7 Remarks',
          'Other Deduction 8',
          'Other Deduction 8 Remarks',
          'Other Deduction 9',
          'Other Deduction 9 Remarks',
          'Net Amount',
          'Remarks'
        ];

        const salesRows = salesOrdersToExport.map(order => {
          // Get other deductions (up to 9) with remarks
          const otherDeductions = order.other_deductions || [];
          const deductionPairs = Array(9).fill(null).map((_, idx) => {
            if (otherDeductions[idx]) {
              return [
                exportFormatCurrency(otherDeductions[idx].amount),
                otherDeductions[idx].remarks || ''
              ];
            }
            return ['-', '-'];
          }).flat();

          return [
            exportFormatDate(order.transaction_date),
            order.state || '',
            order.customer_id?.name || '',
            order.seller_name || order.customer_id?.name || '',
            order.location || '',
            order.warehouse_name || '',
            order.chamber_no || '',
            order.commodity || '',
            order.variety || '',
            order.gate_pass_no || '',
            order.vehicle_no || '',
            order.weight_slip_no || '',
            exportFormatCurrency(order.gross_weight_mt),
            exportFormatCurrency(order.tare_weight_mt),
            (order.no_of_bags || 0).toString(),
            exportFormatCurrency(order.net_weight_mt),
            exportFormatCurrency(order.rate_per_mt),
            exportFormatCurrency(order.gross_amount),
            exportFormatCurrency(order.hlw_wheat) || 'Not Applicable',
            exportFormatCurrency(order.excess_hlw) || 'Not Applicable',
            exportFormatCurrency(order.deduction_amount_hlw) || '0.00',
            exportFormatCurrency(order.moisture_moi) || '',
            exportFormatCurrency(order.excess_moisture) || '',
            exportFormatCurrency(order.bdoi) || '',
            exportFormatCurrency(order.excess_bdoi) || '',
            exportFormatCurrency(order.moi_bdoi) || '',
            exportFormatCurrency(order.weight_deduction_kg) || '',
            exportFormatCurrency(order.deduction_amount_moi_bdoi) || '',
            ...deductionPairs,
            exportFormatCurrency(order.net_amount),
            order.remarks || ''
          ];
        });

        if (csvContent) {
          // If we already have purchase orders, add sales orders to the same file
          csvContent += '\n\n'; // Add separator
          csvContent += [salesHeaders, ...salesRows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
          filename = `all_confirmed_orders_${new Date().toISOString().split('T')[0]}.csv`;
        } else {
          csvContent = [salesHeaders, ...salesRows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
          filename = `confirmed_sales_orders_${new Date().toISOString().split('T')[0]}.csv`;
        }
      }

      // Download the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export error:', error);
      alert('Failed to export orders: ' + (error.message || 'Unknown error'));
    }
  };

  const allOrders: ConfirmedOrder[] = [
    ...salesOrders.map(order => ({ ...order, orderType: 'sales' as const })),
    ...purchaseOrders.map(order => ({ ...order, orderType: 'purchase' as const })),
  ].sort((a, b) => {
    const dateA = new Date(a.transaction_date || a.createdAt || 0).getTime();
    const dateB = new Date(b.transaction_date || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const filteredOrders = filterType === 'all' 
    ? allOrders 
    : allOrders.filter(order => order.orderType === filterType);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleDelete = async (orderId: string, orderType: 'sales' | 'purchase') => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('auth_token');

      if (!token) {
        setError('Authentication required');
        return;
      }

      const endpoint = orderType === 'sales' 
        ? `${apiUrl}/confirmed-sales-orders/${orderId}`
        : `${apiUrl}/confirmed-purchase-orders/${orderId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      // Refresh orders
      await fetchOrders();
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (order: ConfirmedOrder) => {
    setEditingOrder(order);
    setSelectedOrder(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading confirmed orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Confirmed Orders</h1>
          <p className="text-gray-600">View all confirmed sales and purchase orders</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleExportToCSV}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            title="Download all orders as CSV/Excel"
          >
            <FileDown className="w-5 h-5" />
            Download {filterType === 'all' ? 'All Orders' : filterType === 'sales' ? 'Sales Orders' : 'Purchase Orders'} (CSV/Excel)
          </button>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 p-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'sales' | 'purchase')}
              className="border-none outline-none text-sm font-medium"
            >
              <option value="all">All Orders</option>
              <option value="sales">Sales Orders</option>
              <option value="purchase">Purchase Orders</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Order Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Invoice No.
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Supplier / Seller
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Commodity
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Vehicle No.
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Net Weight (MT)
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Net Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No confirmed orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        order.orderType === 'sales'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {order.orderType === 'sales' ? 'Sales Order' : 'Purchase Order'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(order.transaction_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>
                        <div className="font-medium">
                          {order.orderType === 'purchase' 
                            ? (order.supplier_name || order.customer_id?.name || 'N/A')
                            : (order.seller_name || order.customer_id?.name || 'N/A')
                          }
                        </div>
                        <div className="text-xs text-gray-500">{order.customer_id?.email || ''}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.commodity} {order.variety && `(${order.variety})`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.vehicle_no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.net_weight_mt?.toFixed(2)} MT
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(order.net_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(order)}
                          className="text-green-600 hover:text-green-800 font-medium flex items-center gap-1"
                          title="Edit Order"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ id: order.id, type: order.orderType })}
                          className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                          title="Delete Order"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Order Details - {selectedOrder.invoice_number}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    selectedOrder.orderType === 'sales'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedOrder.orderType === 'sales' ? 'Sales Order' : 'Purchase Order'}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => generateOrderPDF(selectedOrder, selectedOrder.orderType)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-6">
                {/* Customer Information */}
                <div className="col-span-3 border-b border-gray-200 pb-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    {selectedOrder.orderType === 'purchase' ? 'Supplier Information' : 'Customer Information'}
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        {selectedOrder.orderType === 'purchase' ? 'Supplier Name' : 'Customer Name'}
                      </label>
                      <p className="text-gray-900 font-medium">
                        {selectedOrder.orderType === 'purchase'
                          ? ((selectedOrder as ConfirmedPurchaseOrder).supplier_name || selectedOrder.customer_id?.name || 'N/A')
                          : ((selectedOrder as ConfirmedSalesOrder).seller_name || selectedOrder.customer_id?.name || 'N/A')
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-gray-900">{selectedOrder.customer_id?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Mobile</label>
                      <p className="text-gray-900">{selectedOrder.customer_id?.mobile_number || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="col-span-3 border-b border-gray-200 pb-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Transaction Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Invoice Number</label>
                      <p className="text-gray-900 font-medium">{selectedOrder.invoice_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Transaction Date</label>
                      <p className="text-gray-900">{formatDate(selectedOrder.transaction_date)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">State</label>
                      <p className="text-gray-900">{selectedOrder.state || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        {selectedOrder.orderType === 'sales' ? 'Seller Name' : 'Supplier Name'}
                      </label>
                      <p className="text-gray-900">
                        {selectedOrder.orderType === 'sales' 
                          ? (selectedOrder as ConfirmedSalesOrder).seller_name || 'N/A'
                          : (selectedOrder as ConfirmedPurchaseOrder).supplier_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Location</label>
                      <p className="text-gray-900">{selectedOrder.location || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Warehouse</label>
                      <p className="text-gray-900">{selectedOrder.warehouse_name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Chamber No.</label>
                      <p className="text-gray-900">{selectedOrder.chamber_no || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Delivery Location</label>
                      <p className="text-gray-900">{selectedOrder.delivery_location || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Commodity Details */}
                <div className="col-span-3 border-b border-gray-200 pb-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Commodity Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Commodity</label>
                      <p className="text-gray-900 font-medium">{selectedOrder.commodity}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Variety</label>
                      <p className="text-gray-900">{selectedOrder.variety || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Gate Pass No.</label>
                      <p className="text-gray-900">{selectedOrder.gate_pass_no || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Vehicle & Weight Details */}
                <div className="col-span-3 border-b border-gray-200 pb-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Vehicle & Weight Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Vehicle No.</label>
                      <p className="text-gray-900 font-medium">{selectedOrder.vehicle_no}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Weight Slip No.</label>
                      <p className="text-gray-900">{selectedOrder.weight_slip_no || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">No. of Bags</label>
                      <p className="text-gray-900">{selectedOrder.no_of_bags || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Gross Weight (MT)</label>
                      <p className="text-gray-900">{selectedOrder.gross_weight_mt?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Tare Weight (MT)</label>
                      <p className="text-gray-900">{selectedOrder.tare_weight_mt?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Net Weight (MT)</label>
                      <p className="text-gray-900 font-semibold">{selectedOrder.net_weight_mt?.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Financial Details */}
                <div className="col-span-3 border-b border-gray-200 pb-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Financial Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Rate Per MT</label>
                      <p className="text-gray-900">{formatCurrency(selectedOrder.rate_per_mt)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Gross Amount</label>
                      <p className="text-gray-900 font-semibold">{formatCurrency(selectedOrder.gross_amount)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Total Deduction</label>
                      <p className="text-gray-900 text-red-600 font-semibold">
                        {formatCurrency(selectedOrder.total_deduction || 0)}
                      </p>
                    </div>
                    <div className="col-span-3">
                      <label className="text-sm font-medium text-gray-600">Net Amount</label>
                      <p className="text-gray-900 text-2xl font-bold text-green-600">
                        {formatCurrency(selectedOrder.net_amount)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quality Parameters */}
                {(selectedOrder.hlw_wheat || selectedOrder.moisture_moi || (selectedOrder as any).bdoi || (selectedOrder as any).bddi) && (
                  <div className="col-span-3 border-b border-gray-200 pb-4 mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Quality Parameters</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedOrder.hlw_wheat && (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-600">HLW (Wheat)</label>
                            <p className="text-gray-900">{selectedOrder.hlw_wheat}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Excess HLW</label>
                            <p className="text-gray-900">{selectedOrder.excess_hlw || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Deduction (HLW) ₹</label>
                            <p className="text-gray-900">{formatCurrency(selectedOrder.deduction_amount_hlw || 0)}</p>
                          </div>
                        </>
                      )}
                      {selectedOrder.moisture_moi && (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Moisture (MOI)</label>
                            <p className="text-gray-900">{selectedOrder.moisture_moi}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Excess Moisture</label>
                            <p className="text-gray-900">{selectedOrder.excess_moisture || 'N/A'}</p>
                          </div>
                        </>
                      )}
                      {((selectedOrder as any).bdoi || (selectedOrder as any).bddi) && (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              {selectedOrder.orderType === 'sales' ? 'BDOI' : 'BDDI'}
                            </label>
                            <p className="text-gray-900">
                              {selectedOrder.orderType === 'sales'
                                ? ((selectedOrder as any).bdoi || 'N/A')
                                : ((selectedOrder as any).bddi || 'N/A')}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Excess {selectedOrder.orderType === 'sales' ? 'BDOI' : 'BDDI'}
                            </label>
                            <p className="text-gray-900">
                              {selectedOrder.orderType === 'sales'
                                ? (selectedOrder as ConfirmedSalesOrder).excess_bdoi || 'N/A'
                                : (selectedOrder as ConfirmedPurchaseOrder).excess_bddi || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              {selectedOrder.orderType === 'sales' ? 'MOI+BDOI' : 'MOI+BDDI'}
                            </label>
                            <p className="text-gray-900">
                              {selectedOrder.orderType === 'sales'
                                ? (selectedOrder as ConfirmedSalesOrder).moi_bdoi || 'N/A'
                                : (selectedOrder as ConfirmedPurchaseOrder).moi_bddi || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Weight Deduction (KG)</label>
                            <p className="text-gray-900">{selectedOrder.weight_deduction_kg || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Deduction ({selectedOrder.orderType === 'sales' ? 'MOI+BDOI' : 'MOI+BDDI'}) ₹
                            </label>
                            <p className="text-gray-900">
                              {formatCurrency(
                                selectedOrder.orderType === 'sales'
                                  ? (selectedOrder as ConfirmedSalesOrder).deduction_amount_moi_bdoi || 0
                                  : (selectedOrder as ConfirmedPurchaseOrder).deduction_amount_moi_bddi || 0
                              )}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Other Deductions */}
                {selectedOrder.other_deductions && selectedOrder.other_deductions.length > 0 && (
                  <div className="col-span-3 border-b border-gray-200 pb-4 mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Other Deductions</h3>
                    <div className="space-y-3">
                      {selectedOrder.other_deductions.map((deduction, index) => (
                        <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-sm font-semibold text-gray-700">Deduction {index + 1}:</span>
                                <span className="text-lg font-bold text-red-600">{formatCurrency(deduction.amount)}</span>
                              </div>
                              {deduction.remarks && (
                                <p className="text-sm text-gray-600 mt-1">
                                  <span className="font-medium">Remarks:</span> {deduction.remarks}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remarks */}
                {selectedOrder.remarks && (
                  <div className="col-span-3">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Remarks</h3>
                    <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">{selectedOrder.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Delete</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this {deleteConfirm.type === 'sales' ? 'sales' : 'purchase'} order? 
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm.id, deleteConfirm.type)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Placeholder for now */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Edit Order</h3>
                <button
                  onClick={() => setEditingOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-gray-600 mb-4">
                Edit functionality will be implemented here. For now, please use the backend API directly or update the form component.
              </p>
              <button
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

