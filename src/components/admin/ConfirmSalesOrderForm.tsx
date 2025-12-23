import { useState, useEffect } from 'react';
import { FileText, Save, Upload, FileSpreadsheet, Download } from 'lucide-react';
import { COMMODITY_VARIETIES } from '../../constants/commodityVarieties';
import { useToastContext } from '../../contexts/ToastContext';

interface User {
  id: string;
  name: string;
  email: string;
}

export default function ConfirmSalesOrderForm() {
  const { showSuccess, showError } = useToastContext();
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'manual' | 'upload'>('manual');

  // Form fields
  const [customerId, setCustomerId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [state, setState] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [location, setLocation] = useState('');
  const [warehouseName, setWarehouseName] = useState('');
  const [chamberNo, setChamberNo] = useState('');
  const [commodity, setCommodity] = useState('Paddy');
  const [variety, setVariety] = useState('');
  const [gatePassNo, setGatePassNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [weightSlipNo, setWeightSlipNo] = useState('');
  const [grossWeightMt, setGrossWeightMt] = useState<number>(0);
  const [tareWeightMt, setTareWeightMt] = useState<number>(0);
  const [noOfBags, setNoOfBags] = useState<number>(0);
  const [netWeightMt, setNetWeightMt] = useState<number>(0);
  const [ratePerMt, setRatePerMt] = useState<number>(0);
  const [grossAmount, setGrossAmount] = useState<number>(0);
  
  // Quality parameters
  const [hlwWheat, setHlwWheat] = useState<number>(0);
  const [excessHlw, setExcessHlw] = useState<number>(0);
  const [deductionAmountHlw, setDeductionAmountHlw] = useState<number>(0);
  const [moistureMoi, setMoistureMoi] = useState<number>(0);
  const [excessMoisture, setExcessMoisture] = useState<number>(0);
  const [bdoi, setBdoi] = useState<number>(0);
  const [excessBdoi, setExcessBdoi] = useState<number>(0);
  const [moiBdoi, setMoiBdoi] = useState<number>(0);
  const [weightDeductionKg, setWeightDeductionKg] = useState<number>(0);
  const [deductionAmountMoiBdoi, setDeductionAmountMoiBdoi] = useState<number>(0);
  const [otherDeductions, setOtherDeductions] = useState<Array<{ amount: number; remarks: string }>>([{ amount: 0, remarks: '' }]);
  
  const [qualityReport, setQualityReport] = useState<Record<string, string>>({});
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [remarks, setRemarks] = useState('');

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Calculate net weight
    const net = grossWeightMt - tareWeightMt;
    setNetWeightMt(net > 0 ? net : 0);
  }, [grossWeightMt, tareWeightMt]);

  useEffect(() => {
    // Calculate gross amount
    const amount = netWeightMt * ratePerMt;
    setGrossAmount(amount);
  }, [netWeightMt, ratePerMt]);

  useEffect(() => {
    // Calculate MOI+BDOI
    const total = excessMoisture + excessBdoi;
    setMoiBdoi(total);
  }, [excessMoisture, excessBdoi]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('auth_token');

      if (!token) {
        showError('Authentication required. Please sign in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${apiUrl}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data = await response.json();
      // Filter to show only customers (farmers, traders, etc., not admins)
      const customerList = data.filter((user: any) => user.role !== 'admin');
      setCustomers(customerList);
    } catch (err: any) {
      showError(err.message || 'Failed to fetch customers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('auth_token');

      if (!token) {
        showError('Authentication required. Please sign in again.');
        setSubmitting(false);
        return;
      }

      // Validate other deductions - if amount is filled, remarks is required
      for (const ded of otherDeductions) {
        if (ded.amount > 0 && !ded.remarks.trim()) {
          showError('Remarks are required for all deductions with an amount greater than 0');
          setSubmitting(false);
          return;
        }
      }

      // Filter out empty deductions and calculate total
      const validDeductions = otherDeductions.filter(ded => ded.amount > 0);
      const otherDeductionsTotal = validDeductions.reduce((sum, ded) => sum + (ded.amount || 0), 0);
      
      // Calculate total deduction
      const totalDeduction = 
        deductionAmountHlw +
        deductionAmountMoiBdoi +
        otherDeductionsTotal;

      const netAmount = grossAmount - totalDeduction;

      const orderData = {
        customer_id: customerId,
        invoice_number: invoiceNumber,
        transaction_date: transactionDate,
        state,
        seller_name: sellerName,
        location,
        warehouse_name: warehouseName,
        chamber_no: chamberNo,
        commodity,
        variety,
        gate_pass_no: gatePassNo,
        vehicle_no: vehicleNo,
        weight_slip_no: weightSlipNo,
        gross_weight_mt: grossWeightMt,
        tare_weight_mt: tareWeightMt,
        no_of_bags: noOfBags,
        net_weight_mt: netWeightMt,
        rate_per_mt: ratePerMt,
        gross_amount: grossAmount,
        hlw_wheat: hlwWheat,
        excess_hlw: excessHlw,
        deduction_amount_hlw: deductionAmountHlw,
        moisture_moi: moistureMoi,
        excess_moisture: excessMoisture,
        bdoi,
        excess_bdoi: excessBdoi,
        moi_bdoi: moiBdoi,
        weight_deduction_kg: weightDeductionKg,
        deduction_amount_moi_bdoi: deductionAmountMoiBdoi,
        other_deductions: validDeductions,
        total_deduction: totalDeduction,
        net_amount: netAmount,
        quality_report: qualityReport,
        delivery_location: deliveryLocation,
        remarks,
      };

      const response = await fetch(`${apiUrl}/confirmed-sales-orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create confirmed sales order');
      }

      showSuccess('Confirmed sales order created successfully!');
      // Reset form after a short delay
      setTimeout(() => {
        resetForm();
      }, 1000);
    } catch (err: any) {
      showError(err.message || 'Failed to create confirmed sales order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerId('');
    setInvoiceNumber('');
    setTransactionDate('');
    setState('');
    setSellerName('');
    setLocation('');
    setWarehouseName('');
    setChamberNo('');
    setCommodity('Paddy');
    setVariety('');
    setGatePassNo('');
    setVehicleNo('');
    setWeightSlipNo('');
    setGrossWeightMt(0);
    setTareWeightMt(0);
    setNoOfBags(0);
    setNetWeightMt(0);
    setRatePerMt(0);
    setGrossAmount(0);
    setHlwWheat(0);
    setExcessHlw(0);
    setDeductionAmountHlw(0);
    setMoistureMoi(0);
    setExcessMoisture(0);
    setBdoi(0);
    setExcessBdoi(0);
    setMoiBdoi(0);
    setWeightDeductionKg(0);
    setDeductionAmountMoiBdoi(0);
    setOtherDeductions([{ amount: 0, remarks: '' }]);
    setQualityReport({});
    setDeliveryLocation('');
    setRemarks('');
  };

  const varieties = COMMODITY_VARIETIES[commodity] || [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <FileText className="w-8 h-8 text-green-600" />
          Confirm Sales Order
        </h1>
        <p className="text-gray-600">Fill in all the details to confirm a sales order</p>
      </div>

      {/* Upload Mode Toggle */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Entry Mode</h3>
            <p className="text-sm text-gray-600">Choose to enter data manually or upload CSV/Excel file</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setUploadMode('manual')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                uploadMode === 'manual'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Manual Entry
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('upload')}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                uploadMode === 'upload'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              CSV/Excel Upload
            </button>
          </div>
        </div>
      </div>

      {uploadMode === 'upload' ? (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-green-600" />
              Bulk Upload Confirmed Sales Orders
            </h2>
            <p className="text-gray-600">Upload a CSV or Excel file to create multiple confirmed sales orders at once</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload File (CSV or Excel) <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-green-400 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="file-upload-sales" className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500">
                      <span>Upload a file</span>
                      <input
                        id="file-upload-sales"
                        name="file-upload-sales"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const ext = file.name.split('.').pop()?.toLowerCase();
                            if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
                              setUploadFile(file);
                            } else {
                              showError('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
                            }
                          }
                        }}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">CSV, XLSX, XLS up to 10MB</p>
                  {uploadFile && (
                    <p className="text-sm text-green-600 mt-2">
                      Selected: {uploadFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-blue-900">File Format Requirements:</h4>
                <button
                  type="button"
                  onClick={() => {
                    // Create sample CSV
                    const sampleData = [
                      ['Invoice Number', 'Transaction Date', 'State', 'Seller Name', 'Location', 'Warehouse Name', 'Chamber No', 'Commodity', 'Variety', 'Gate Pass No', 'Vehicle No', 'Weight Slip No', 'Gross Weight (MT)', 'Tare Weight (MT)', 'No of Bags', 'Net Weight (MT)', 'Rate per MT', 'Gross Amount', 'HLW', 'Excess HLW', 'Deduction Amount HLW', 'Moisture', 'Excess Moisture', 'BDOI', 'Excess BDOI', 'MOI+BDOI', 'Weight Deduction (KG)', 'Deduction Amount MOI+BDOI', 'Delivery Location', 'Remarks'],
                      ['INV-001', '2024-01-15', 'Bihar', 'ABC Traders', 'Patna', 'Warehouse 1', 'CH-01', 'Paddy', 'Katarni', 'GP-123', 'BR-01-AB-1234', 'WS-456', '10.5', '0.5', '100', '10.0', '2500', '25000', '78.5', '0', '0', '14', '0', '2', '0', '0', '0', '0', 'Patna', 'Sample order'],
                      ['INV-002', '2024-01-16', 'Bihar', 'XYZ Suppliers', 'Patna', 'Warehouse 2', 'CH-02', 'Wheat', 'Milling Quality', 'GP-124', 'BR-01-CD-5678', 'WS-457', '15.0', '0.5', '150', '14.5', '2800', '40600', '80.0', '0', '0', '12', '0', '1.5', '0', '0', '0', '0', 'Patna', 'Sample order 2']
                    ];
                    const csvContent = sampleData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', 'sample_confirmed_sales_order.csv');
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  Download Sample CSV
                </button>
              </div>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>First row should contain column headers</li>
                <li>Required columns: Vehicle No, Net Weight (MT), Rate per MT</li>
                <li>Optional columns: Invoice Number, Transaction Date, Commodity, Variety, Gross Weight (MT), Tare Weight (MT), No of Bags, Gross Amount, and all quality parameters</li>
                <li>Each row represents one confirmed sales order</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={async () => {
                if (!customerId) {
                  showError('Please select a customer first');
                  return;
                }
                if (!uploadFile) {
                  showError('Please select a file to upload');
                  return;
                }

                setUploading(true);
                try {
                  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                  const token = localStorage.getItem('auth_token');

                  if (!token) {
                    showError('Authentication required. Please sign in again.');
                    setUploading(false);
                    return;
                  }

                  const formData = new FormData();
                  formData.append('file', uploadFile);
                  formData.append('customer_id', customerId);

                  const response = await fetch(`${apiUrl}/confirmed-sales-orders/bulk-upload`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                    },
                    body: formData,
                  });

                  const result = await response.json();

                  if (!response.ok) {
                    throw new Error(result.error || result.message || 'Upload failed');
                  }

                  if (result.errors && result.errors.length > 0) {
                    showError(`Upload completed with ${result.count} orders. Some errors: ${result.errors.slice(0, 3).join(', ')}`);
                  } else {
                    showSuccess(`Successfully uploaded ${result.count} confirmed sales orders!`);
                  }

                  // Reset form
                  setUploadFile(null);
                  setCustomerId('');
                  const fileInput = document.getElementById('file-upload-sales') as HTMLInputElement;
                  if (fileInput) fileInput.value = '';
                } catch (err: any) {
                  showError(err.message || 'Failed to upload file. Please try again.');
                } finally {
                  setUploading(false);
                }
              }}
              disabled={uploading || !customerId || !uploadFile}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload & Submit
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-8">
        {/* Customer & Basic Info */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Customer & Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter invoice number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select State</option>
                {indianStates.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Seller Name</label>
              <input
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter seller name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse Name</label>
              <input
                type="text"
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter warehouse name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chamber No.</label>
              <input
                type="text"
                value={chamberNo}
                onChange={(e) => setChamberNo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter chamber number"
              />
            </div>
          </div>
        </div>

        {/* Commodity Information */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Commodity Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commodity <span className="text-red-500">*</span>
              </label>
              <select
                value={commodity}
                onChange={(e) => {
                  setCommodity(e.target.value);
                  setVariety('');
                }}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="Paddy">Paddy</option>
                <option value="Maize">Maize</option>
                <option value="Wheat">Wheat</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Variety</label>
              <select
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Variety</option>
                {varieties.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gate Pass No.</label>
              <input
                type="text"
                value={gatePassNo}
                onChange={(e) => setGatePassNo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter gate pass number"
              />
            </div>
          </div>
        </div>

        {/* Vehicle & Weight Information */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Vehicle & Weight Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle No. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter vehicle number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weight Slip No. (RST)</label>
              <input
                type="text"
                value={weightSlipNo}
                onChange={(e) => setWeightSlipNo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter weight slip number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gross Weight (MT)</label>
              <input
                type="number"
                step="0.01"
                value={grossWeightMt || ''}
                onChange={(e) => setGrossWeightMt(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tare Weight (MT)</label>
              <input
                type="number"
                step="0.01"
                value={tareWeightMt || ''}
                onChange={(e) => setTareWeightMt(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">No. of Bags</label>
              <input
                type="number"
                value={noOfBags || ''}
                onChange={(e) => setNoOfBags(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Net Weight (MT) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                value={netWeightMt || ''}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-bold"
                placeholder="Auto-calculated"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rate Per MT <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                value={ratePerMt || ''}
                onChange={(e) => setRatePerMt(Number(e.target.value))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gross Amount</label>
              <input
                type="number"
                step="0.01"
                value={grossAmount || ''}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-bold"
                placeholder="Auto-calculated"
              />
            </div>
          </div>
        </div>

        {/* Quality Parameters & Deductions */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quality Parameters & Deductions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">HLW (Wheat)</label>
              <input
                type="number"
                step="0.01"
                value={hlwWheat || ''}
                onChange={(e) => setHlwWheat(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter Hectolitre Weight (e.g., 78.5)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Excess HLW</label>
              <input
                type="number"
                step="0.01"
                value={excessHlw || ''}
                onChange={(e) => setExcessHlw(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter excess HLW value (e.g., 2.5)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Deduction Amount (HLW) ₹</label>
              <input
                type="number"
                step="0.01"
                value={deductionAmountHlw || ''}
                onChange={(e) => setDeductionAmountHlw(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter deduction amount in ₹ (e.g., 500.00)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Moisture (MOI)</label>
              <input
                type="number"
                step="0.01"
                value={moistureMoi || ''}
                onChange={(e) => setMoistureMoi(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter moisture percentage (e.g., 14.5)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Excess Moisture</label>
              <input
                type="number"
                step="0.01"
                value={excessMoisture || ''}
                onChange={(e) => setExcessMoisture(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter excess moisture value (e.g., 1.5)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">BDOI</label>
              <input
                type="number"
                step="0.01"
                value={bdoi || ''}
                onChange={(e) => setBdoi(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter BDOI value (Broken, Damage, Discolour, Immature)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Excess BDOI</label>
              <input
                type="number"
                step="0.01"
                value={excessBdoi || ''}
                onChange={(e) => setExcessBdoi(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter excess BDOI value (e.g., 2.0)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">MOI+BDOI</label>
              <input
                type="number"
                step="0.01"
                value={moiBdoi || ''}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-bold"
                placeholder="Auto-calculated (Excess Moisture + Excess BDOI)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weight Deduction (KG)</label>
              <input
                type="number"
                step="0.01"
                value={weightDeductionKg || ''}
                onChange={(e) => setWeightDeductionKg(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter weight deduction in KG (e.g., 50.00)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Deduction Amount (MOI+BDOI) ₹</label>
              <input
                type="number"
                step="0.01"
                value={deductionAmountMoiBdoi || ''}
                onChange={(e) => setDeductionAmountMoiBdoi(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter deduction amount in ₹ (e.g., 750.00)"
              />
            </div>
          </div>

          {/* Other Deductions */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Other Deductions</h3>
            <div className="space-y-4">
              {otherDeductions.map((deduction, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Other Deduction {index + 1} Amount ₹ {deduction.amount > 0 && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={deduction.amount || ''}
                        onChange={(e) => {
                          const updated = [...otherDeductions];
                          updated[index].amount = Number(e.target.value) || 0;
                          setOtherDeductions(updated);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Remarks {deduction.amount > 0 && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={deduction.remarks}
                        onChange={(e) => {
                          const updated = [...otherDeductions];
                          updated[index].remarks = e.target.value;
                          setOtherDeductions(updated);
                        }}
                        required={deduction.amount > 0}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter remarks for this deduction"
                      />
                    </div>
                  </div>
                  {otherDeductions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = otherDeductions.filter((_, i) => i !== index);
                        setOtherDeductions(updated);
                      }}
                      className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setOtherDeductions([...otherDeductions, { amount: 0, remarks: '' }])}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <span className="text-xl">+</span>
                Add Another Deduction
              </button>
            </div>
          </div>
        </div>

        {/* Final Amounts */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Final Amounts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Deduction ₹</label>
              <input
                type="number"
                step="0.01"
                value={
                  deductionAmountHlw +
                  deductionAmountMoiBdoi +
                  otherDeductions.reduce((sum, ded) => sum + (ded.amount || 0), 0)
                }
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-yellow-50 font-bold text-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Net Amount ₹ <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                value={grossAmount - (
                  deductionAmountHlw +
                  deductionAmountMoiBdoi +
                  otherDeductions.reduce((sum, ded) => sum + (ded.amount || 0), 0)
                )}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-green-50 font-bold text-lg text-green-700"
              />
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Additional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Location</label>
              <input
                type="text"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter delivery location"
              />
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="pb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Enter any additional remarks or notes"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {submitting ? 'Submitting...' : 'Confirm Sales Order'}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}

