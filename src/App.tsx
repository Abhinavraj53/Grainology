import { useAuth } from './hooks/useAuth';
import AuthPage from './components/AuthPage';
import CustomerPanel from './components/CustomerPanel';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthPage />;
  }

  if (profile.role === 'admin') {
    return <AdminPanel profile={profile} onSignOut={signOut} />;
  }

  return <CustomerPanel profile={profile} onSignOut={signOut} />;
}
