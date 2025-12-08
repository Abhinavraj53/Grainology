import { useState, useEffect } from 'react';
import { Truck, Plus, Edit2, Trash2, Search, CheckCircle, XCircle, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LogisticsProvider {
  id: string;
  company_name: string;
  contact_person: string;
  mobile_number: string;
  email: string;
  pickup_city: string;
  delivery_city: string;
  service_areas: string[];
  vehicle_types: string[];
  rate_per_km: number;
  kyc_verified: boolean;
  pan_number: string;
  gst_number: string;
  address: string;
  is_active: boolean;
  notes: string;
}

export default function LogisticsProviderManagement() {
  const [providers, setProviders] = useState<LogisticsProvider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<LogisticsProvider[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LogisticsProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [searchPickupCity, setSearchPickupCity] = useState('');
  const [searchDeliveryCity, setSearchDeliveryCity] = useState('');
  const [searchCompany, setSearchCompany] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>(['Truck']);
  const [ratePerKm, setRatePerKm] = useState<number>(0);
  const [kycVerified, setKycVerified] = useState(false);
  const [panNumber, setPanNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  const cities = [
    'Patna, Bihar',
    'Bharalpur, Bihar',
    'Motihari, Bihar',
    'Muzaffarpur, Bihar',
    'Gaya, Bihar',
    'Bhagalpur, Bihar',
    'Raxaul, Bihar',
    'Bettiah, Bihar',
    'Sitamarhi, Bihar',
    'Darbhanga, Bihar'
  ];

  const availableVehicleTypes = ['Truck', 'Mini Truck', 'Tempo', 'Container', 'Trailer'];

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    filterProviders();
  }, [providers, searchPickupCity, searchDeliveryCity, searchCompany]);

  const loadProviders = async () => {
    const { data, error } = await supabase
      .from('logistics_providers')
      .select('*')
      .order('company_name', { ascending: true });

    if (!error && data) {
      setProviders(data);
    }
  };

  const filterProviders = () => {
    let filtered = [...providers];

    if (searchPickupCity) {
      filtered = filtered.filter(p =>
        p.pickup_city.toLowerCase().includes(searchPickupCity.toLowerCase())
      );
    }

    if (searchDeliveryCity) {
      filtered = filtered.filter(p =>
        p.delivery_city.toLowerCase().includes(searchDeliveryCity.toLowerCase())
      );
    }

    if (searchCompany) {
      filtered = filtered.filter(p =>
        p.company_name.toLowerCase().includes(searchCompany.toLowerCase())
      );
    }

    setFilteredProviders(filtered);
  };

  const resetForm = () => {
    setCompanyName('');
    setContactPerson('');
    setMobileNumber('');
    setEmail('');
    setPickupCity('');
    setDeliveryCity('');
    setServiceAreas([]);
    setVehicleTypes(['Truck']);
    setRatePerKm(0);
    setKycVerified(false);
    setPanNumber('');
    setGstNumber('');
    setAddress('');
    setIsActive(true);
    setNotes('');
    setEditingProvider(null);
    setShowForm(false);
  };

  const handleEdit = (provider: LogisticsProvider) => {
    setEditingProvider(provider);
    setCompanyName(provider.company_name);
    setContactPerson(provider.contact_person);
    setMobileNumber(provider.mobile_number);
    setEmail(provider.email || '');
    setPickupCity(provider.pickup_city);
    setDeliveryCity(provider.delivery_city);
    setServiceAreas(provider.service_areas || []);
    setVehicleTypes(provider.vehicle_types || ['Truck']);
    setRatePerKm(provider.rate_per_km);
    setKycVerified(provider.kyc_verified);
    setPanNumber(provider.pan_number || '');
    setGstNumber(provider.gst_number || '');
    setAddress(provider.address);
    setIsActive(provider.is_active);
    setNotes(provider.notes || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!companyName || !contactPerson || !mobileNumber || !pickupCity || !deliveryCity || !address) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      const providerData = {
        company_name: companyName,
        contact_person: contactPerson,
        mobile_number: mobileNumber,
        email,
        pickup_city: pickupCity,
        delivery_city: deliveryCity,
        service_areas: serviceAreas,
        vehicle_types: vehicleTypes,
        rate_per_km: ratePerKm,
        kyc_verified: kycVerified,
        pan_number: panNumber,
        gst_number: gstNumber,
        address,
        is_active: isActive,
        notes,
      };

      if (editingProvider) {
        const { error: updateError } = await supabase
          .from('logistics_providers')
          .update(providerData)
          .eq('id', editingProvider.id);

        if (updateError) throw updateError;
        setSuccess('Logistics provider updated successfully!');
      } else {
        const { error: insertError } = await supabase
          .from('logistics_providers')
          .insert(providerData);

        if (insertError) throw insertError;
        setSuccess('Logistics provider added successfully!');
      }

      await loadProviders();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save logistics provider');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this logistics provider?')) return;

    const { error } = await supabase
      .from('logistics_providers')
      .delete()
      .eq('id', id);

    if (!error) {
      setSuccess('Logistics provider deleted successfully!');
      await loadProviders();
    }
  };

  const toggleVehicleType = (type: string) => {
    if (vehicleTypes.includes(type)) {
      setVehicleTypes(vehicleTypes.filter(t => t !== type));
    } else {
      setVehicleTypes([...vehicleTypes, type]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-100 border-l-4 border-yellow-600 p-4">
        <h2 className="text-xl font-bold text-gray-900">
          7. Logistics
        </h2>
        <p className="text-sm text-gray-700 mt-1">
          Logistics provider companies will be onboarded in the App platform with proper KYC
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Logistics Provider Management</h3>
              <p className="text-sm text-gray-600">Manage KYC-verified logistics service providers</p>
            </div>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Logistics Provider
          </button>
        </div>

        {/* Search Filters */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-5 h-5 text-gray-600" />
            <h4 className="font-semibold text-gray-900">Search option</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pick Up City Location</label>
              <select
                value={searchPickupCity}
                onChange={(e) => setSearchPickupCity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-yellow-50"
              >
                <option value="">Select from scroll down</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery City Location</label>
              <select
                value={searchDeliveryCity}
                onChange={(e) => setSearchDeliveryCity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-yellow-50"
              >
                <option value="">Select from scroll down</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={searchCompany}
                onChange={(e) => setSearchCompany(e.target.value)}
                placeholder="Search by company name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2 italic">
            Information of Logistics service provider within that location will be provided like Contact details including their service area
          </p>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-lg border-2 border-green-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              {editingProvider ? 'Edit Logistics Provider' : 'Add New Logistics Provider'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name*</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder="Bihar Transport Services"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person*</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  required
                  placeholder="Rajesh Kumar"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number*</label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  required
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@logistics.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pick Up City*</label>
                <select
                  value={pickupCity}
                  onChange={(e) => setPickupCity(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-yellow-50"
                >
                  <option value="">Select City</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery City*</label>
                <select
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-yellow-50"
                >
                  <option value="">Select City</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate per KM (₹)</label>
                <input
                  type="number"
                  value={ratePerKm || ''}
                  onChange={(e) => setRatePerKm(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  placeholder="15.50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  placeholder="10ABCDE1234F1Z5"
                  maxLength={15}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address*</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                rows={2}
                placeholder="Complete address with city and pincode"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Types</label>
              <div className="flex flex-wrap gap-2">
                {availableVehicleTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleVehicleType(type)}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                      vehicleTypes.includes(type)
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-green-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Additional notes about the logistics provider..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="mt-4 flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={kycVerified}
                  onChange={(e) => setKycVerified(e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">KYC Verified</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {success}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingProvider ? 'Update Provider' : 'Add Provider'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Providers List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(searchPickupCity || searchDeliveryCity || searchCompany ? filteredProviders : providers).map((provider) => (
            <div key={provider.id} className="bg-white border-2 border-gray-300 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-gray-900">{provider.company_name}</h4>
                  <p className="text-sm text-gray-600">{provider.contact_person}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {provider.kyc_verified ? (
                    <CheckCircle className="w-5 h-5 text-green-600" title="KYC Verified" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" title="KYC Pending" />
                  )}
                  {!provider.is_active && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Inactive</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Pickup:</span>
                  <span className="bg-yellow-100 px-2 py-0.5 rounded">{provider.pickup_city}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Delivery:</span>
                  <span className="bg-yellow-100 px-2 py-0.5 rounded">{provider.delivery_city}</span>
                </div>
              </div>

              <div className="space-y-2 mb-3 text-sm">
                <p className="text-gray-700">
                  <span className="font-medium">Contact:</span> {provider.mobile_number}
                </p>
                {provider.email && (
                  <p className="text-gray-700 truncate">
                    <span className="font-medium">Email:</span> {provider.email}
                  </p>
                )}
                {provider.rate_per_km > 0 && (
                  <p className="text-gray-700">
                    <span className="font-medium">Rate:</span> ₹{provider.rate_per_km}/km
                  </p>
                )}
              </div>

              {provider.vehicle_types && provider.vehicle_types.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">Vehicle Types:</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.vehicle_types.map((type, idx) => (
                      <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <button
                  onClick={() => handleEdit(provider)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(provider.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}

          {(searchPickupCity || searchDeliveryCity || searchCompany ? filteredProviders : providers).length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              {searchPickupCity || searchDeliveryCity || searchCompany
                ? 'No logistics providers found matching your search criteria.'
                : 'No logistics providers added yet. Add your first provider above.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
