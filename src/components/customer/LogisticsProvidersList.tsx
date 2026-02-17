import { useState, useEffect } from 'react';
import { Truck, Search, MapPin, Phone, Mail } from 'lucide-react';
import { api } from '../../lib/client';

interface LogisticsProvider {
  id: string;
  company_name: string;
  mobile_number: string;
  email: string;
  address: string;
}

export default function LogisticsProvidersList() {
  const [providers, setProviders] = useState<LogisticsProvider[]>([]);
  const [filtered, setFiltered] = useState<LogisticsProvider[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(providers);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        providers.filter(
          (p) =>
            p.company_name.toLowerCase().includes(q) ||
            (p.address && p.address.toLowerCase().includes(q))
        )
      );
    }
  }, [providers, search]);

  const loadProviders = async () => {
    setLoading(true);
    const { data, error } = await api
      .from('logistics_providers')
      .select('*')
      .eq('is_active', true)
      .order('company_name', { ascending: true });

    if (!error && data) {
      setProviders(Array.isArray(data) ? data : []);
      setFiltered(Array.isArray(data) ? data : []);
    } else {
      setProviders([]);
      setFiltered([]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-green-600 border-solid" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
          <Truck className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Logistics Providers</h2>
          <p className="text-sm text-gray-600">
            Admin ke dwara add kiye gaye logistics providers. Contact details yahan dekhen.
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by name / address</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name or address..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((provider) => (
          <div
            key={provider.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-bold text-lg text-gray-900 mb-3">{provider.company_name}</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                <a href={`tel:${provider.mobile_number}`} className="hover:text-green-600">
                  {provider.mobile_number}
                </a>
              </div>
              {provider.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <a href={`mailto:${provider.email}`} className="truncate hover:text-green-600">
                    {provider.email}
                  </a>
                </div>
              )}
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{provider.address}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          {search
            ? 'Koi provider is filter se nahi mila.'
            : 'Abhi koi logistics provider available nahi hai.'}
        </div>
      )}
    </div>
  );
}
