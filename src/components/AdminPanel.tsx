import { useState, useEffect } from 'react';
import { Profile, supabase, Order, Offer } from '../lib/supabase';
import { LayoutDashboard, LogOut, Users, Package, Truck, TrendingUp, Cloud, FileText, ShoppingBag, Menu, X } from 'lucide-react';
// Commented out unused imports - can be restored if needed
// import { ClipboardCheck, Calculator, PackageCheck } from 'lucide-react';
import EnhancedDashboard from './admin/EnhancedDashboard';
import UserManagement from './admin/UserManagement';
import MandiBhaav from './MandiBhaav';
import WeatherForecast from './WeatherForecast';
import LogisticsProviderManagement from './admin/LogisticsProviderManagement';
import AllPurchaseOrders from './admin/AllPurchaseOrders';
import AllSaleOrders from './admin/AllSaleOrders';
import ConfirmSalesOrderForm from './admin/ConfirmSalesOrderForm';
import ConfirmPurchaseOrderForm from './admin/ConfirmPurchaseOrderForm';
import AllConfirmedOrders from './admin/AllConfirmedOrders';
import CommodityVarietyManagement from './admin/CommodityVarietyManagement';
import WarehouseManagement from './admin/WarehouseManagement';
import { DashboardCache } from '../lib/sessionStorage';
// Commented out unused component imports - can be restored if needed
// import OrderManagementEnhanced from './admin/OrderManagementEnhanced';
// import OfferOversight from './admin/OfferOversight';
// import QualityManagement from './admin/QualityManagement';
// import LogisticsManagement from './admin/LogisticsManagement';
// import Reports from './admin/Reports';
// import SupplierCommodityManagement from './admin/SupplierCommodityManagement';
// import CustomerCommoditySales from './admin/CustomerCommoditySales';
// import SupplyTransactionsView from './admin/SupplyTransactionsView';

type View = 'dashboard' | 'orders' | 'users' | 'offers' | 'quality' | 'logistics' | 'mandi' | 'weather' | 'reports' | 'supplier-commodity' | 'customer-sales' | 'logistics-providers' | 'supply-transactions' | 'all-purchase-orders' | 'all-sale-orders' | 'confirm-sales-order' | 'confirm-purchase-order' | 'all-confirmed-orders' | 'commodity-variety-management' | 'warehouse-management';

interface AdminPanelProps {
  profile: Profile;
  onSignOut: () => void;
}

export default function AdminPanel({ profile, onSignOut }: AdminPanelProps) {
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalFarmers: 0,
    totalTraders: 0,
    verifiedUsers: 0,
    totalPurchaseOrders: 0,
    totalSaleOrders: 0,
    totalConfirmedSalesOrders: 0,
    totalConfirmedPurchaseOrders: 0,
    totalConfirmedSalesAmount: 0,
    totalConfirmedPurchaseAmount: 0,
  });

  useEffect(() => {
    // Check cache first
    const cached = DashboardCache.getAdminData(profile.id);
    if (cached) {
      // Note: Admin dashboard data (shipments, vendorPerformance) is loaded in EnhancedDashboard
      // We'll still load stats, orders, offers, users from API
      loadData();
    } else {
      loadData();
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        console.error('No authentication token found');
        setErrorMessage('You are not authenticated. Please sign in again.');
        setLoading(false);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      console.log('Fetching from API:', apiUrl);

      // Fetch stats from backend API
      const statsResponse = await fetch(`${apiUrl}/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('Stats received:', statsData);
        // Ensure all required fields are present with defaults
        setStats({
          totalUsers: statsData.totalUsers || 0,
          totalFarmers: statsData.totalFarmers || 0,
          totalTraders: statsData.totalTraders || 0,
          verifiedUsers: statsData.verifiedUsers || 0,
          totalPurchaseOrders: statsData.totalPurchaseOrders || 0,
          totalSaleOrders: statsData.totalSaleOrders || 0,
          totalConfirmedSalesOrders: statsData.totalConfirmedSalesOrders || 0,
          totalConfirmedPurchaseOrders: statsData.totalConfirmedPurchaseOrders || 0,
          totalConfirmedSalesAmount: statsData.totalConfirmedSalesAmount || 0,
          totalConfirmedPurchaseAmount: statsData.totalConfirmedPurchaseAmount || 0,
        });
      } else {
        const errorData = await statsResponse.json().catch(() => ({}));
        console.error('Stats fetch error:', statsResponse.status, errorData);
        setErrorMessage(`Unable to load dashboard stats (${statsResponse.status}). Please check API/auth.`);
        // Set default stats to prevent crashes
        setStats({
          totalUsers: 0,
          totalFarmers: 0,
          totalTraders: 0,
          verifiedUsers: 0,
          totalPurchaseOrders: 0,
          totalSaleOrders: 0,
          totalConfirmedSalesOrders: 0,
          totalConfirmedPurchaseOrders: 0,
          totalConfirmedSalesAmount: 0,
          totalConfirmedPurchaseAmount: 0,
        });
      }

      // Fetch users from backend API
      const usersResponse = await fetch(`${apiUrl}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        console.log('Users received:', usersData.length, 'users');
        setUsers(usersData);
      } else {
        const errorData = await usersResponse.json().catch(() => ({}));
        console.error('Users fetch error:', usersResponse.status, errorData);
        setErrorMessage('Unable to load users. Please check API/auth.');
      }

      // Fetch orders and offers using the API client
      const [ordersData, offersData] = await Promise.all([
        supabase
          .from('orders')
          .select('*, offer:offers(*, seller:profiles!offers_seller_id_fkey(name)), buyer:profiles!orders_buyer_id_fkey(name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('offers')
          .select('*, seller:profiles!offers_seller_id_fkey(name)')
          .order('created_at', { ascending: false }),
      ]);

      if (!ordersData.error && ordersData.data) {
        setOrders(ordersData.data as any);
      }

      if (!offersData.error && offersData.data) {
        setOffers(offersData.data as any);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setErrorMessage('Failed to load dashboard data. Please check your connection and API.');
    } finally {
      setLoading(false);
    }
  };


  const handleViewChange = (view: View) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-800 to-slate-900 shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Grainology</h1>
              <p className="text-sm text-slate-300 mt-1">{profile?.name || 'Admin User'}</p>
              <p className="text-xs text-slate-400 capitalize">{profile?.role || 'admin'} Panel</p>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-white hover:bg-slate-700 p-2 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {/* 1. Dashboard */}
          <button
            onClick={() => handleViewChange('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'dashboard'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </button>

          {/* 2. User Management */}
          <button
            onClick={() => handleViewChange('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'users'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">User Management</span>
          </button>

          {/* 3. All Purchase Orders */}
          <button
            onClick={() => handleViewChange('all-purchase-orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'all-purchase-orders'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="font-medium">All Purchase Orders</span>
          </button>

          {/* 4. All Sale Orders */}
          <button
            onClick={() => handleViewChange('all-sale-orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'all-sale-orders'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="font-medium">All Sale Orders</span>
          </button>

          {/* 5. Confirm Sales Order Form */}
          <button
            onClick={() => handleViewChange('confirm-sales-order')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'confirm-sales-order'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="font-medium">Confirm Sales Order</span>
          </button>

          {/* 6. Confirm Purchase Order Form */}
          <button
            onClick={() => handleViewChange('confirm-purchase-order')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'confirm-purchase-order'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="font-medium">Confirm Purchase Order</span>
          </button>

          {/* 7. All Confirmed Orders */}
          <button
            onClick={() => handleViewChange('all-confirmed-orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'all-confirmed-orders'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="font-medium">All Confirmed Orders</span>
          </button>

          {/* 8. Mandi Bhav */}
          <button
            onClick={() => handleViewChange('mandi')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'mandi'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="font-medium">Mandi Bhaav</span>
          </button>

          {/* 9. Weather Forecast */}
          <button
            onClick={() => handleViewChange('weather')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'weather'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Cloud className="w-5 h-5" />
            <span className="font-medium">Weather Forecast</span>
          </button>

          {/* 10. Logistics Provider Management */}
          <button
            onClick={() => handleViewChange('logistics-providers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'logistics-providers'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Truck className="w-5 h-5" />
            <span className="font-medium">Logistics Provider Management</span>
          </button>

          {/* 11. Commodity & Variety Management */}
          <button
            onClick={() => handleViewChange('commodity-variety-management')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'commodity-variety-management'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="font-medium">Commodity & Variety</span>
          </button>

          {/* 12. Warehouse Management */}
          <button
            onClick={() => handleViewChange('warehouse-management')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'warehouse-management'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="font-medium">Warehouse Management</span>
          </button>

          {/* ========== COMMENTED OUT - NOT IN USE ========== */}
          {/* 
          <button
            onClick={() => handleViewChange('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'orders'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <ClipboardCheck className="w-5 h-5" />
            <span className="font-medium">Orders & QC</span>
            {stats.pendingOrders > 0 && (
              <span className="ml-auto bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {stats.pendingOrders}
              </span>
            )}
          </button>

          <button
            onClick={() => handleViewChange('offers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'offers'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="font-medium">Offer Oversight</span>
          </button>

          <button
            onClick={() => handleViewChange('quality')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'quality'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Calculator className="w-5 h-5" />
            <span className="font-medium">Quality & Deductions</span>
          </button>

          <button
            onClick={() => handleViewChange('logistics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'logistics'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Truck className="w-5 h-5" />
            <span className="font-medium">Logistics</span>
          </button>

          <button
            onClick={() => handleViewChange('supplier-commodity')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'supplier-commodity'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <PackageCheck className="w-5 h-5" />
            <span className="font-medium">Supplier Commodity</span>
          </button>

          <button
            onClick={() => handleViewChange('supply-transactions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'supply-transactions'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="font-medium">Supply Transactions</span>
          </button>

          <button
            onClick={() => handleViewChange('customer-sales')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'customer-sales'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="font-medium">Customer Sales</span>
          </button>

          <button
            onClick={() => handleViewChange('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'reports'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="font-medium">Reports</span>
          </button>
          */}
          {/* ========== END COMMENTED OUT ========== */}
        </nav>

        <div className="p-4 border-t border-slate-700 flex-shrink-0">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-slate-700/50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden text-gray-600 hover:text-gray-900 p-2 -ml-2"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex-1">
            {currentView === 'dashboard' && 'Admin Dashboard'}
            {currentView === 'users' && 'User Management'}
            {currentView === 'all-purchase-orders' && 'All Purchase Orders'}
            {currentView === 'all-sale-orders' && 'All Sale Orders'}
            {currentView === 'confirm-sales-order' && 'Confirm Sales Order'}
            {currentView === 'confirm-purchase-order' && 'Confirm Purchase Order'}
            {currentView === 'all-confirmed-orders' && 'All Confirmed Orders'}
            {currentView === 'mandi' && 'Mandi Bhaav - Market Prices'}
            {currentView === 'weather' && 'Weather Forecast'}
            {currentView === 'logistics-providers' && 'Logistics Provider Management'}
            {currentView === 'commodity-variety-management' && 'Commodity & Variety Management'}
            {currentView === 'warehouse-management' && 'Warehouse Management'}
            {/* Commented out header titles for unused views */}
            {/* {currentView === 'orders' && 'Order Management & Quality Control'} */}
            {/* {currentView === 'offers' && 'Offer Oversight & Inventory'} */}
            {/* {currentView === 'quality' && 'Quality Management & Deductions'} */}
            {/* {currentView === 'logistics' && 'Logistics Management'} */}
            {/* {currentView === 'supplier-commodity' && 'Supplier Commodity Management'} */}
            {/* {currentView === 'supply-transactions' && 'Supply Transactions (Demo Data)'} */}
            {/* {currentView === 'customer-sales' && 'Customer Commodity Sales'} */}
            {/* {currentView === 'reports' && 'Reports & Analytics'} */}
            </h2>
          </div>
        </header>

        <div className="p-4 md:p-6">
          {loading && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 p-4">
              Loading dashboard data...
            </div>
          )}
          {errorMessage && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 p-4">
              {errorMessage}
            </div>
          )}
          {currentView === 'dashboard' && (
            <EnhancedDashboard stats={stats} orders={orders} offers={offers} />
          )}
          {currentView === 'users' && (
            <UserManagement users={users} onRefresh={loadData} />
          )}
          {currentView === 'all-purchase-orders' && (
            <AllPurchaseOrders />
          )}
          {currentView === 'all-sale-orders' && (
            <AllSaleOrders />
          )}
          {currentView === 'confirm-sales-order' && (
            <ConfirmSalesOrderForm />
          )}
          {currentView === 'confirm-purchase-order' && (
            <ConfirmPurchaseOrderForm />
          )}
          {currentView === 'all-confirmed-orders' && (
            <AllConfirmedOrders />
          )}
          {currentView === 'mandi' && (
            <MandiBhaav />
          )}
          {currentView === 'weather' && (
            <WeatherForecast />
          )}
          {currentView === 'logistics-providers' && (
            <LogisticsProviderManagement />
          )}
          {currentView === 'commodity-variety-management' && (
            <CommodityVarietyManagement />
          )}
          {currentView === 'warehouse-management' && (
            <WarehouseManagement />
          )}
          {/* ========== COMMENTED OUT - NOT IN USE ========== */}
          {/* 
          {currentView === 'orders' && (
            <OrderManagementEnhanced orders={orders} onRefresh={loadData} />
          )}
          {currentView === 'offers' && (
            <OfferOversight offers={offers} onRefresh={loadData} />
          )}
          {currentView === 'quality' && (
            <QualityManagement />
          )}
          {currentView === 'logistics' && (
            <LogisticsManagement />
          )}
          {currentView === 'supplier-commodity' && (
            <SupplierCommodityManagement />
          )}
          {currentView === 'supply-transactions' && (
            <SupplyTransactionsView />
          )}
          {currentView === 'customer-sales' && (
            <CustomerCommoditySales />
          )}
          {currentView === 'reports' && (
            <Reports />
          )}
          */}
          {/* ========== END COMMENTED OUT ========== */}
        </div>
      </main>
    </div>
  );
}
