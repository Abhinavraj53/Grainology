import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import AuthPage from '../components/AuthPage';

export default function Register() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100 to-yellow-50">
      <Navigation />
      <div className="py-8">
        <AuthPage initialMode="register" />
      </div>
      <Footer />
    </div>
  );
}

