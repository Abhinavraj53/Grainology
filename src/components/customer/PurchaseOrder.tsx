import { useState, useEffect } from 'react';
import { ShoppingCart, Info, Calendar, Package, DollarSign, Truck, ClipboardCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { convertToAllUnits, formatQuantityWithUnit, UnitType } from '../../utils/unitConversion';
import CSVUpload from '../CSVUpload';

interface Variety {
  commodity_name: string;
  variety_name: string;
  description: string;
}

interface QualityParameter {
  id: string;
  s_no: number;
  parameter_name: string;
  unit_of_measurement: string;
  standard_value: string;
  remarks: string;
  actual_value?: string;
}

interface PurchaseOrderProps {
  userId: string;
  userName: string;
}

export default function PurchaseOrder({ userId, userName }: PurchaseOrderProps) {
  const [customerName, setCustomerName] = useState(userName || '');
  const [saudaDate, setSaudaDate] = useState('');
  const [commodity, setCommodity] = useState('');
  const [variety, setVariety] = useState('');
  const [unitOfMeasurement, setUnitOfMeasurement] = useState<UnitType>('MT');
  const [ratePerUnit, setRatePerUnit] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(0);
  const [remarks, setRemarks] = useState('Customer can choose unit of measurement from the options. Whatever is entered in one unit, other units will be converted into MT/Quintal/KG as per mathematical calculation');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryPeriod, setDeliveryPeriod] = useState('');
  const [qualityParameters, setQualityParameters] = useState<QualityParameter[]>([]);

  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [filteredVarieties, setFilteredVarieties] = useState<Variety[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const commodities = ['Paddy', 'Maize', 'Wheat'];

  useEffect(() => {
    fetchVarieties();
  }, []);

  useEffect(() => {
    if (commodity) {
      const filtered = varieties.filter(v => v.commodity_name === commodity);
      setFilteredVarieties(filtered);
      setVariety('');
      fetchQualityParameters(commodity);
    }
  }, [commodity, varieties]);

  const fetchQualityParameters = async (selectedCommodity: string) => {
    const { data, error } = await supabase
      .from('quality_parameters_master')
      .select('*')
      .eq('commodity', selectedCommodity)
      .eq('is_active', true)
      .order('s_no', { ascending: true });

    if (data && !error) {
      setQualityParameters(data.map(param => ({
        ...param,
        actual_value: param.standard_value
      })));
    }
  };

  const updateQualityParameter = (id: string, field: 'actual_value' | 'remarks', value: string) => {
    setQualityParameters(prev =>
      prev.map(param =>
        param.id === id ? { ...param, [field]: value } : param
      )
    );
  };

  const fetchVarieties = async () => {
    const { data, error } = await supabase
      .from('variety_master')
      .select('*')
      .eq('is_active', true)
      .order('commodity_name', { ascending: true })
      .order('variety_name', { ascending: true });

    if (data) {
      setVarieties(data);
    }
  };

  const getConvertedQuantities = () => {
    if (!quantity) return null;
    return convertToAllUnits(quantity, unitOfMeasurement);
  };

  const handleSubmit = async (e: React.FormEvent, status: 'Draft' | 'Submitted') => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!customerName || !saudaDate || !commodity || !variety || !quantity || !ratePerUnit) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('purchase_orders')
        .insert({
          buyer_id: userId,
          customer_name: customerName,
          sauda_confirmation_date: saudaDate,
          commodity,
          variety,
          unit_of_measurement: unitOfMeasurement,
          rate_per_unit: ratePerUnit,
          quantity,
          remarks,
          payment_terms: paymentTerms,
          delivery_period: deliveryPeriod,
          quality_parameters: { parameters: qualityParameters },
          status,
        });

      if (insertError) throw insertError;

      setSuccess(`Purchase order ${status === 'Draft' ? 'saved as draft' : 'submitted'} successfully!`);

      // Reset form
      setCustomerName(userName || '');
      setSaudaDate('');
      setCommodity('');
      setVariety('');
      setQuantity(0);
      setRatePerUnit(0);
      setPaymentTerms('');
      setDeliveryPeriod('');
      setQualityParameters([]);
    } catch (err: any) {
      setError(err.message || 'Failed to save purchase order');
    } finally {
      setLoading(false);
    }
  };

  const convertedQty = getConvertedQuantities();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <CSVUpload type="purchase-orders" />
      <div className="mb-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            2. Under Buy & Sell: Customer Module of App (I want to buy)
          </h1>
          <p className="text-sm text-gray-700 mt-1">To be entered by Buyer</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg">
        <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Purchase Order</h2>
          </div>
        </div>

        <form className="p-6 space-y-6">
          {/* Customer Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="text-gray-900">1. Name of the Customer:</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
              placeholder="e.g., Mahamaya Fertilizers"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="text-gray-900">2. Date: DD/MM/YYYY</span>
              <span className="text-gray-600 font-normal ml-2">(Date of Sauda confirmation)</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={saudaDate}
                onChange={(e) => setSaudaDate(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
              />
            </div>
          </div>

          {/* Commodity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="text-gray-900">3. Commodity: (Drop Down)</span>
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg appearance-none"
                >
                  <option value="">Select Commodity</option>
                  {commodities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-gray-600 mt-1">Paddy/Maize/Wheat (i.e. Paddy in this case)</p>
            </div>

            {/* Variety */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="text-gray-900">5. Variety: (Drop Down)</span>
              </label>
              <select
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                required
                disabled={!commodity}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg appearance-none disabled:bg-gray-100"
              >
                <option value="">Select Variety</option>
                {filteredVarieties.map((v) => (
                  <option key={v.variety_name} value={v.variety_name}>
                    {v.variety_name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-600 mt-1">
                List of Variety to be provided & same to be selected here (i.e. Katarni)
              </p>
            </div>
          </div>

          {/* Rate Input Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="text-gray-900">6. Rate will be provided by the customer at the time of Sauda</span>
            </label>

            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-4 bg-gray-100 border-b-2 border-gray-300">
                <div className="px-4 py-3 font-semibold text-gray-800 border-r border-gray-300">
                  Unit of Measurement options like MT/Quintal/KG
                </div>
                <div className="px-4 py-3 font-semibold text-gray-800 text-center border-r border-gray-300">
                  Rate per Unit
                </div>
                <div className="px-4 py-3 font-semibold text-gray-800 text-center border-r border-gray-300">
                  Quantity
                </div>
                <div className="px-4 py-3 font-semibold text-gray-800">
                  Remarks
                </div>
              </div>

              {/* Table Content */}
              <div className="grid grid-cols-4">
                {/* Unit Selection */}
                <div className="px-4 py-4 border-r border-gray-300 flex items-center">
                  <select
                    value={unitOfMeasurement}
                    onChange={(e) => setUnitOfMeasurement(e.target.value as UnitType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold"
                  >
                    <option value="MT">MT</option>
                    <option value="Quintal">Quintal</option>
                    <option value="KG">KG</option>
                  </select>
                </div>

                {/* Rate Input */}
                <div className="px-4 py-4 border-r border-gray-300 flex items-center justify-center">
                  <div className="relative w-full max-w-xs">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      value={ratePerUnit || ''}
                      onChange={(e) => setRatePerUnit(Number(e.target.value))}
                      required
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg text-center font-bold"
                      placeholder="25,510.00"
                    />
                  </div>
                </div>

                {/* Quantity Input */}
                <div className="px-4 py-4 border-r border-gray-300 flex items-center justify-center">
                  <input
                    type="number"
                    value={quantity || ''}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    required
                    min="0"
                    step="0.01"
                    className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg text-center font-bold"
                    placeholder="100"
                  />
                </div>

                {/* Remarks */}
                <div className="px-4 py-4 flex items-center">
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm resize-none"
                    placeholder="Customer can choose unit of measurement from the options..."
                  />
                </div>
              </div>
            </div>

            {/* Conversion Display */}
            {convertedQty && quantity > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-2">Automatic Unit Conversion:</p>
                    <div className="grid grid-cols-3 gap-4 text-sm text-blue-800">
                      <div>
                        <span className="font-medium">MT:</span> {formatQuantityWithUnit(convertedQty.MT, 'MT')}
                      </div>
                      <div>
                        <span className="font-medium">Quintal:</span> {formatQuantityWithUnit(convertedQty.Quintal, 'Quintal')}
                      </div>
                      <div>
                        <span className="font-medium">KG:</span> {formatQuantityWithUnit(convertedQty.KG, 'KG')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Terms */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="text-gray-900">7. Payment Terms will be provided by the customer</span>
            </label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
              placeholder="Example - 2-3 days of unloading of commodity at the customer warehouse"
            />
          </div>

          {/* Delivery Period */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="text-gray-900">8. Delivery Period will be provided by customer</span>
            </label>
            <div className="relative">
              <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={deliveryPeriod}
                onChange={(e) => setDeliveryPeriod(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                placeholder="Example - 5-6 days of sauda confirmation date"
              />
            </div>
          </div>

          {/* Quality Parameters */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck className="w-6 h-6 text-green-600" />
              <label className="text-sm font-semibold text-gray-700">
                <span className="text-gray-900">9. Quality Parameters will be provided by the Customer</span>
              </label>
            </div>

            {commodity ? (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border-2 border-green-200 mb-4">
                <p className="text-sm font-semibold text-green-800 mb-2">
                  ✓ Quality parameters auto-populated for {commodity} in editable mode
                </p>
                <p className="text-xs text-gray-600">
                  Standard values are pre-filled. You can edit any field below as per your requirements.
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
                <p className="text-sm text-yellow-800">
                  Please select a commodity to view quality parameters
                </p>
              </div>
            )}

            {qualityParameters.length > 0 && (
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="bg-gray-800 text-white">
                  <div className="grid grid-cols-12 gap-2 px-4 py-3 font-semibold text-sm">
                    <div className="col-span-1">S No.</div>
                    <div className="col-span-2">Particulars</div>
                    <div className="col-span-2">Unit of Measurement</div>
                    <div className="col-span-3">Standard Quality Parameter example</div>
                    <div className="col-span-4">Remarks</div>
                  </div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-gray-300">
                  {qualityParameters.map((param) => (
                    <div key={param.id} className="grid grid-cols-12 gap-2 px-4 py-3 bg-white hover:bg-gray-50">
                      <div className="col-span-1 flex items-center">
                        <span className="font-semibold text-gray-700">{param.s_no}</span>
                      </div>
                      <div className="col-span-2 flex items-center">
                        <span className="font-medium text-gray-900">{param.parameter_name}</span>
                      </div>
                      <div className="col-span-2 flex items-center">
                        <span className="text-gray-700">{param.unit_of_measurement}</span>
                      </div>
                      <div className="col-span-3 flex items-center">
                        <input
                          type="text"
                          value={param.actual_value || ''}
                          onChange={(e) => updateQualityParameter(param.id, 'actual_value', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-yellow-50 font-medium"
                          placeholder={param.standard_value}
                        />
                      </div>
                      <div className="col-span-4 flex items-center">
                        <input
                          type="text"
                          value={param.remarks}
                          onChange={(e) => updateQualityParameter(param.id, 'remarks', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                          placeholder="Enter remarks"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'Draft')}
              disabled={loading}
              className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'Submitted')}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
