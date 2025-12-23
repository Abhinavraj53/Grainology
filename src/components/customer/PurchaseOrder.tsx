import { useState, useEffect } from 'react';
import { ShoppingCart, Calendar, Package, DollarSign, Truck, ClipboardCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UnitType } from '../../utils/unitConversion';
import CSVUpload from '../CSVUpload';
import { QUALITY_STRUCTURE } from '../../constants/qualityParameters';
import { COMMODITY_VARIETIES } from '../../constants/commodityVarieties';

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
  options?: string[]; // Added to support dropdowns
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
  const [filteredVarieties, setFilteredVarieties] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const commodities = ['Paddy', 'Maize', 'Wheat'];

  useEffect(() => {
    fetchVarieties();
  }, []);

  useEffect(() => {
    if (commodity) {
      // Get static varieties
      const staticVarieties = COMMODITY_VARIETIES[commodity] || [];
      
      // Get varieties from database
      const dbVarieties = varieties
        .filter(v => v.commodity_name === commodity)
        .map(v => v.variety_name);
      
      // Combine and remove duplicates
      const allVarieties = Array.from(new Set([...staticVarieties, ...dbVarieties]));
      
      setFilteredVarieties(allVarieties);
      setVariety('');
      fetchQualityParameters(commodity);
    }
  }, [commodity, varieties]);

  const fetchQualityParameters = async (selectedCommodity: string) => {
    // First try to load from the static quality structure for standard AgMarkNet parameters
    if (QUALITY_STRUCTURE[selectedCommodity]) {
      const params = QUALITY_STRUCTURE[selectedCommodity].map((p, index) => ({
        id: `${selectedCommodity}-${index}`,
        s_no: index + 1,
        parameter_name: p.name,
        unit_of_measurement: p.unit,
        standard_value: p.standard,
        actual_value: p.options[0], // Default to first option
        remarks: p.remarks,
        options: p.options
      }));
      setQualityParameters(params);
      return;
    }

    // Fallback to database if not one of our standard commodities
    const { data, error } = await supabase
      .from('quality_parameters_master')
      .select('*')
      .eq('commodity', selectedCommodity)
      .eq('is_active', true)
      .order('s_no', { ascending: true });

    if (data && !error) {
      setQualityParameters(data.map((param: any) => ({
        ...param,
        actual_value: param.standard_value
      })));
    }
  };

  const updateQualityParameter = (id: string, field: 'actual_value' | 'remarks', value: string) => {
    setQualityParameters(prev =>
      prev.map((param: QualityParameter) =>
        param.id === id ? { ...param, [field]: value } : param
      )
    );
  };

  const fetchVarieties = async () => {
    const { data } = await supabase
      .from('variety_master')
      .select('*')
      .eq('is_active', true)
      .order('commodity_name', { ascending: true })
      .order('variety_name', { ascending: true });

    if (data) {
      setVarieties(data);
    }
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
          {/* 1. Commodity Dropdown First */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="text-gray-900">1. Commodity: (Drop Down)</span>
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
              <p className="text-sm text-gray-600 mt-1">Paddy/Maize/Wheat</p>
            </div>

            {/* Variety Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="text-gray-900">Variety: (Drop Down)</span>
              </label>
              <select
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                required
                disabled={!commodity}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg appearance-none disabled:bg-gray-100"
              >
                <option value="">Select Variety</option>
                {filteredVarieties.map((vName) => (
                  <option key={vName} value={vName}>
                    {vName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Date */}
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

          {/* 3, 4, 5. Unit, Rate, Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="text-gray-900">3. Unit of Measurement</span>
              </label>
              <select
                value={unitOfMeasurement}
                onChange={(e) => setUnitOfMeasurement(e.target.value as UnitType)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold appearance-none"
              >
                <option value="MT">MT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="text-gray-900">4. Rate (Rs.) per MT*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="number"
                  value={ratePerUnit || ''}
                  onChange={(e) => setRatePerUnit(Number(e.target.value))}
                  required
                  min="0"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg text-center font-bold"
                  placeholder="25,510.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="text-gray-900">5. Quantity (MT)*</span>
              </label>
              <input
                type="number"
                value={quantity || ''}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg text-center font-bold"
                placeholder="100"
              />
            </div>
          </div>

          {/* Quality Parameters (Particulars Section) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck className="w-6 h-6 text-green-600" />
              <label className="text-sm font-semibold text-gray-700">
                <span className="text-gray-900">6. Quality Parameters (Particulars Section):</span>
              </label>
            </div>

            {commodity ? (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border-2 border-green-200 mb-4">
                <p className="text-sm font-semibold text-green-800 mb-2">
                  ✓ Quality parameters auto-populated for {commodity}
                </p>
                <p className="text-xs text-gray-600">
                  Select the appropriate value for each parameter from the dropdowns below.
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
                    <div className="col-span-3">Particulars</div>
                    <div className="col-span-2">UOM</div>
                    <div className="col-span-3">Standard</div>
                    <div className="col-span-3">Actual Value</div>
                  </div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-gray-300">
                  {qualityParameters.map((param) => (
                    <div key={param.id} className="grid grid-cols-12 gap-2 px-4 py-3 bg-white hover:bg-gray-50">
                      <div className="col-span-1 flex items-center">
                        <span className="font-semibold text-gray-700">{param.s_no}</span>
                      </div>
                      <div className="col-span-3 flex items-center">
                        <span className="font-medium text-gray-900">{param.parameter_name}</span>
                      </div>
                      <div className="col-span-2 flex items-center">
                        <span className="text-gray-700">{param.unit_of_measurement}</span>
                      </div>
                      <div className="col-span-3 flex items-center text-xs text-gray-600">
                        {param.standard_value}
                      </div>
                      <div className="col-span-3 flex items-center">
                        {param.options ? (
                          <select
                            value={param.actual_value || ''}
                            onChange={(e) => updateQualityParameter(param.id, 'actual_value', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-yellow-50 font-medium text-sm"
                          >
                            {param.options.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={param.actual_value || ''}
                            onChange={(e) => updateQualityParameter(param.id, 'actual_value', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-yellow-50 font-medium text-sm"
                            placeholder={param.standard_value}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 7. Remarks */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="text-gray-900">7. Remarks</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg resize-none"
              placeholder="Enter any additional remarks or terms here..."
            />
          </div>

          {/* Name of Customer moved down or hidden if not needed as separate step */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="text-gray-900">Customer Details:</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., Mahamaya Fertilizers"
            />
          </div>

          {/* Payment Terms & Delivery Period moved to bottom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="text-gray-900">Payment Terms</span>
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                placeholder="Example - 2-3 days of unloading..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="text-gray-900">Delivery Period</span>
              </label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={deliveryPeriod}
                  onChange={(e) => setDeliveryPeriod(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                  placeholder="Example - 5-6 days..."
                />
              </div>
            </div>
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
