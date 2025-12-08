import { useState, useEffect } from 'react';
import { supabase, Order, QualityParameter, QualityDeduction } from '../../lib/supabase';
import { AlertTriangle, CheckCircle, Calculator, Save } from 'lucide-react';
import CSVUpload from '../CSVUpload';

export default function QualityManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [parameters, setParameters] = useState<QualityParameter[]>([]);
  const [deductions, setDeductions] = useState<Record<string, { measured: number; deduction: number }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadOrders();
    loadParameters();
  }, []);

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, offer:offers(commodity, variety, seller:profiles!offers_seller_id_fkey(name)), buyer:profiles!orders_buyer_id_fkey(name)')
      .in('status', ['Approved', 'Approved - Awaiting Logistics'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as any);
    }
  };

  const loadParameters = async () => {
    const { data, error } = await supabase
      .from('quality_parameters')
      .select('*')
      .order('commodity', { ascending: true });

    if (!error && data) {
      setParameters(data);
    }
  };

  const calculateDeduction = (param: QualityParameter, measuredValue: number): number => {
    const standard = parseFloat(param.standard.split('-')[0]);
    const deviation = Math.abs(measuredValue - standard);
    return (deviation / standard) * 100;
  };

  const handleApplyDeductions = async () => {
    if (!selectedOrder) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let totalDeduction = 0;
      const deductionRecords = [];

      for (const [paramId, values] of Object.entries(deductions)) {
        if (values.measured && values.deduction > 0) {
          const param = parameters.find(p => p.id === paramId);
          if (param) {
            const deductionAmount = (selectedOrder.final_price_per_quintal * selectedOrder.quantity_mt * 10 * values.deduction) / 100;
            totalDeduction += deductionAmount;

            deductionRecords.push({
              order_id: selectedOrder.id,
              parameter_id: paramId,
              measured_value: values.measured,
              standard_value: parseFloat(param.standard.split('-')[0]),
              deduction_percentage: values.deduction,
              deduction_amount: deductionAmount
            });
          }
        }
      }

      if (deductionRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('quality_deductions')
          .insert(deductionRecords);

        if (insertError) throw insertError;

        const { error: updateError } = await supabase
          .from('orders')
          .update({ deduction_amount: totalDeduction })
          .eq('id', selectedOrder.id);

        if (updateError) throw updateError;

        setSuccess(`Applied ${deductionRecords.length} quality deductions totaling ₹${totalDeduction.toFixed(2)}`);
        setSelectedOrder(null);
        setDeductions({});
        loadOrders();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const relevantParams = selectedOrder
    ? parameters.filter(p => p.commodity === (selectedOrder.offer as any)?.commodity)
    : [];

  return (
    <div className="space-y-6">
      <CSVUpload type="quality" onUploadSuccess={() => { loadParameters(); loadOrders(); }} />
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Calculator className="w-6 h-6" />
          Quality Management & Deductions
        </h2>
        <p className="text-gray-600 mb-6">Review quality parameters and apply deductions to approved orders</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Select Order for Quality Review</h3>

          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No approved orders available for quality review</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedOrder?.id === order.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {(order.offer as any)?.commodity} - {(order.offer as any)?.variety}
                      </p>
                      <p className="text-sm text-gray-600">
                        Buyer: {(order.buyer as any)?.name} | Seller: {(order.offer as any)?.seller?.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Quantity: {order.quantity_mt} MT | Price: ₹{order.final_price_per_quintal}/quintal
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      order.deduction_amount > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {order.deduction_amount > 0 ? `Deduction: ₹${order.deduction_amount}` : 'No Deductions'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Quality Parameters</h3>

          {relevantParams.length === 0 ? (
            <p className="text-gray-500">No quality parameters defined for this commodity</p>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {relevantParams.map((param) => (
                  <div key={param.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-semibold text-gray-800">{param.param_name}</p>
                        <p className="text-sm text-gray-600">Standard: {param.standard} {param.unit}</p>
                        <p className="text-xs text-gray-500 mt-1">{param.remarks}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Measured Value ({param.unit})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={deductions[param.id]?.measured || ''}
                          onChange={(e) => {
                            const measured = parseFloat(e.target.value);
                            const deduction = measured ? calculateDeduction(param, measured) : 0;
                            setDeductions({
                              ...deductions,
                              [param.id]: { measured, deduction: Math.max(0, deduction) }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="Enter measured value"
                        />
                        {deductions[param.id]?.deduction > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            <span className="text-yellow-800 font-medium">
                              Deduction: {deductions[param.id].deduction.toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleApplyDeductions}
                  disabled={loading || Object.keys(deductions).length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Apply Quality Deductions
                </button>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setDeductions({});
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
