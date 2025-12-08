import { useState } from 'react';
import { X, Save, Calculator } from 'lucide-react';
import { api } from '../../lib/api';

interface SupplyTransactionFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function SupplyTransactionForm({ onClose, onSuccess, initialData }: SupplyTransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state - Transaction Info
  const [transactionDate, setTransactionDate] = useState(initialData?.transaction_date?.split('T')[0] || '');
  const [state, setState] = useState(initialData?.state || 'Bihar');
  const [supplierName, setSupplierName] = useState(initialData?.supplier_name || '');
  const [location, setLocation] = useState(initialData?.location || '');

  // Warehouse Info
  const [warehouseName, setWarehouseName] = useState(initialData?.warehouse_name || '');
  const [chamberNo, setChamberNo] = useState(initialData?.chamber_no || '');

  // Commodity Info
  const [commodity, setCommodity] = useState(initialData?.commodity || '');
  const [variety, setVariety] = useState(initialData?.variety || '');

  // Logistics Info
  const [gatePassNo, setGatePassNo] = useState(initialData?.gate_pass_no || '');
  const [vehicleNo, setVehicleNo] = useState(initialData?.vehicle_no || '');
  const [weightSlipNo, setWeightSlipNo] = useState(initialData?.weight_slip_no || '');

  // Weight Info
  const [grossWeightMt, setGrossWeightMt] = useState(initialData?.gross_weight_mt?.toString() || '');
  const [tareWeightMt, setTareWeightMt] = useState(initialData?.tare_weight_mt?.toString() || '');
  const [noOfBags, setNoOfBags] = useState(initialData?.no_of_bags?.toString() || '');
  const [netWeightMt, setNetWeightMt] = useState(initialData?.net_weight_mt?.toString() || '');

  // Financial Info
  const [ratePerMt, setRatePerMt] = useState(initialData?.rate_per_mt?.toString() || '');
  const [grossAmount, setGrossAmount] = useState(initialData?.gross_amount?.toString() || '');
  const [netAmount, setNetAmount] = useState(initialData?.net_amount?.toString() || '');

  // Quality Parameters - HLW
  const [hlwWheat, setHlwWheat] = useState(initialData?.hlw_wheat?.toString() || '');
  const [excessHlw, setExcessHlw] = useState(initialData?.excess_hlw?.toString() || '');
  const [deductionAmountHlw, setDeductionAmountHlw] = useState(initialData?.deduction_amount_hlw?.toString() || '');

  // Quality Parameters - Moisture
  const [moistureMoi, setMoistureMoi] = useState(initialData?.moisture_moi?.toString() || '');
  const [excessMoisture, setExcessMoisture] = useState(initialData?.excess_moisture?.toString() || '');

  // Quality Parameters - BDDI
  const [bddi, setBddi] = useState(initialData?.bddi?.toString() || '');
  const [excessBddi, setExcessBddi] = useState(initialData?.excess_bddi?.toString() || '');
  const [moiBddi, setMoiBddi] = useState(initialData?.moi_bddi?.toString() || '');
  const [weightDeductionKg, setWeightDeductionKg] = useState(initialData?.weight_deduction_kg?.toString() || '');
  const [deductionAmountMoiBddi, setDeductionAmountMoiBddi] = useState(initialData?.deduction_amount_moi_bddi?.toString() || '');

  // Other Deductions (10 fields)
  const [otherDeductions, setOtherDeductions] = useState<number[]>(
    initialData?.other_deductions || Array(10).fill(0)
  );

  // Additional Info
  const [remarks, setRemarks] = useState(initialData?.remarks || '');

  const commodities = ['Maize', 'Wheat', 'Paddy'];
  const states = ['Bihar', 'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan', 'Haryana', 'Punjab', 'Other'];

  // Calculate net weight from gross and tare
  const calculateNetWeight = () => {
    const gross = parseFloat(grossWeightMt) || 0;
    const tare = parseFloat(tareWeightMt) || 0;
    const calculated = gross - tare;
    if (calculated > 0 && !netWeightMt) {
      setNetWeightMt(calculated.toFixed(3));
    }
  };

  // Calculate gross amount
  const calculateGrossAmount = () => {
    const weight = parseFloat(netWeightMt) || 0;
    const rate = parseFloat(ratePerMt) || 0;
    const calculated = weight * rate;
    if (calculated > 0 && !grossAmount) {
      setGrossAmount(calculated.toFixed(2));
    }
  };

  // Calculate net amount
  const calculateNetAmount = () => {
    const gross = parseFloat(grossAmount) || 0;
    const hlwDeduction = parseFloat(deductionAmountHlw) || 0;
    const moiBddiDeduction = parseFloat(deductionAmountMoiBddi) || 0;
    const otherDeductionTotal = otherDeductions.reduce((sum, val) => sum + (val || 0), 0);
    const calculated = gross - hlwDeduction - moiBddiDeduction - otherDeductionTotal;
    if (calculated > 0) {
      setNetAmount(calculated.toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validation
      if (!transactionDate || !supplierName || !location || !warehouseName || !commodity || !variety) {
        throw new Error('Please fill in all required fields (Date, Supplier Name, Location, Warehouse, Commodity, Variety)');
      }

      if (!netWeightMt || !ratePerMt || !grossAmount || !netAmount) {
        throw new Error('Please fill in weight, rate, and amount fields');
      }

      const transactionData = {
        transaction_date: new Date(transactionDate),
        state,
        supplier_name: supplierName,
        location,
        warehouse_name: warehouseName,
        chamber_no: chamberNo || undefined,
        commodity,
        variety,
        gate_pass_no: gatePassNo || undefined,
        vehicle_no: vehicleNo || undefined,
        weight_slip_no: weightSlipNo || undefined,
        gross_weight_mt: grossWeightMt ? parseFloat(grossWeightMt) : undefined,
        tare_weight_mt: tareWeightMt ? parseFloat(tareWeightMt) : undefined,
        no_of_bags: noOfBags ? parseInt(noOfBags) : undefined,
        net_weight_mt: parseFloat(netWeightMt),
        rate_per_mt: parseFloat(ratePerMt),
        gross_amount: parseFloat(grossAmount),
        hlw_wheat: hlwWheat && commodity === 'Wheat' ? parseFloat(hlwWheat) : undefined,
        excess_hlw: excessHlw ? parseFloat(excessHlw) : undefined,
        deduction_amount_hlw: deductionAmountHlw ? parseFloat(deductionAmountHlw) : undefined,
        moisture_moi: moistureMoi ? parseFloat(moistureMoi) : undefined,
        excess_moisture: excessMoisture ? parseFloat(excessMoisture) : undefined,
        bddi: bddi ? parseFloat(bddi) : undefined,
        excess_bddi: excessBddi ? parseFloat(excessBddi) : undefined,
        moi_bddi: moiBddi ? parseFloat(moiBddi) : undefined,
        weight_deduction_kg: weightDeductionKg ? parseFloat(weightDeductionKg) : undefined,
        deduction_amount_moi_bddi: deductionAmountMoiBddi ? parseFloat(deductionAmountMoiBddi) : undefined,
        other_deductions: otherDeductions.filter(val => val && val > 0),
        net_amount: parseFloat(netAmount),
        remarks: remarks || undefined
      };

      const session = await api.auth.getSession();
      const token = session.data.session?.access_token;

      const url = initialData
        ? `${import.meta.env.VITE_API_URL}/supply-transactions/${initialData.id}`
        : `${import.meta.env.VITE_API_URL}/supply-transactions`;

      const response = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to save transaction');
      }

      setSuccess('Transaction saved successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateOtherDeduction = (index: number, value: string) => {
    const newDeductions = [...otherDeductions];
    newDeductions[index] = parseFloat(value) || 0;
    setOtherDeductions(newDeductions);
    calculateNetAmount();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {initialData ? 'Edit' : 'Add New'} Supply Transaction
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Transaction Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Transaction Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Transaction <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {states.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Warehouse Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Warehouse Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warehouse Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={warehouseName}
                  onChange={(e) => setWarehouseName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chamber No.
                </label>
                <input
                  type="text"
                  value={chamberNo}
                  onChange={(e) => setChamberNo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Commodity Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Commodity Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commodity <span className="text-red-500">*</span>
                </label>
                <select
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Commodity</option>
                  {commodities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variety <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  required
                  placeholder="e.g., Hybrid, Dara, Katarni"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Logistics Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Logistics Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gate Pass No.
                </label>
                <input
                  type="text"
                  value={gatePassNo}
                  onChange={(e) => setGatePassNo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle No.
                </label>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  placeholder="e.g., BR11GD-8172"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight Slip No.
                </label>
                <input
                  type="text"
                  value={weightSlipNo}
                  onChange={(e) => setWeightSlipNo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Weight Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              Weight Information
              <button
                type="button"
                onClick={calculateNetWeight}
                className="ml-auto text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 flex items-center gap-1"
              >
                <Calculator className="w-3 h-3" />
                Calculate Net Weight
              </button>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gross Weight (MT)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={grossWeightMt}
                  onChange={(e) => {
                    setGrossWeightMt(e.target.value);
                    calculateNetWeight();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tare Weight (MT)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={tareWeightMt}
                  onChange={(e) => {
                    setTareWeightMt(e.target.value);
                    calculateNetWeight();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No. of Bags
                </label>
                <input
                  type="number"
                  value={noOfBags}
                  onChange={(e) => setNoOfBags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Net Weight (MT) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={netWeightMt}
                  onChange={(e) => {
                    setNetWeightMt(e.target.value);
                    calculateGrossAmount();
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              Financial Information
              <button
                type="button"
                onClick={() => {
                  calculateGrossAmount();
                  calculateNetAmount();
                }}
                className="ml-auto text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 flex items-center gap-1"
              >
                <Calculator className="w-3 h-3" />
                Calculate Amounts
              </button>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate Per MT (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={ratePerMt}
                  onChange={(e) => {
                    setRatePerMt(e.target.value);
                    calculateGrossAmount();
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gross Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={grossAmount}
                  onChange={(e) => {
                    setGrossAmount(e.target.value);
                    calculateNetAmount();
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Net Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={netAmount}
                  onChange={(e) => setNetAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-green-50"
                />
              </div>
            </div>
          </div>

          {/* Quality Parameters - HLW (For Wheat only) */}
          {commodity === 'Wheat' && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">HLW (Hectolitre Weight) - Wheat</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HLW in Wheat
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={hlwWheat}
                    onChange={(e) => setHlwWheat(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Excess HLW
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={excessHlw}
                    onChange={(e) => setExcessHlw(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deduction Amount (HLW) ₹
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={deductionAmountHlw}
                    onChange={(e) => {
                      setDeductionAmountHlw(e.target.value);
                      calculateNetAmount();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quality Parameters - Moisture & BDDI */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quality Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moisture (MOI) %
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={moistureMoi}
                  onChange={(e) => setMoistureMoi(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Excess Moisture
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={excessMoisture}
                  onChange={(e) => setExcessMoisture(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  BDDI %
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bddi}
                  onChange={(e) => setBddi(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Excess BDDI
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={excessBddi}
                  onChange={(e) => setExcessBddi(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MOI+BDDI
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={moiBddi}
                  onChange={(e) => setMoiBddi(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight Deduction (KG)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={weightDeductionKg}
                  onChange={(e) => setWeightDeductionKg(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deduction Amount (MOI+BDDI) ₹
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={deductionAmountMoiBddi}
                  onChange={(e) => {
                    setDeductionAmountMoiBddi(e.target.value);
                    calculateNetAmount();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Other Deductions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Other Deductions</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Deduction {i + 1} ₹
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={otherDeductions[i] || ''}
                    onChange={(e) => updateOtherDeduction(i, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Remarks</h3>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional notes or remarks..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : initialData ? 'Update' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

