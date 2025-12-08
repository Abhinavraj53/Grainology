import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import LandingPage from './components/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import About from './pages/About';
import Services from './pages/Services';
import Features from './pages/Features';
import Contact from './pages/Contact';
import CustomerPanel from './components/CustomerPanel';
import AdminPanel from './components/AdminPanel';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

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
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function Dashboard() {
  const { profile, signOut } = useAuth();

  if (profile?.role === 'admin') {
    return <AdminPanel profile={profile} onSignOut={signOut} />;
  }

  return <CustomerPanel profile={profile} onSignOut={signOut} />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <>
            <Navigation />
            <LandingPage />
            <Footer />
          </>
        } />
        <Route path="/about" element={
          <>
            <Navigation />
            <About />
          </>
        } />
        <Route path="/services" element={
          <>
            <Navigation />
            <Services />
          </>
        } />
        <Route path="/features" element={
          <>
            <Navigation />
            <Features />
          </>
        } />
        <Route path="/contact" element={
          <>
            <Navigation />
            <Contact />
          </>
        } />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
