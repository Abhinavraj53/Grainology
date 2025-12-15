import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import AuthPage from '../components/AuthPage';

export default function Register() {
  return (
    <div className="min-h-screen">
      <AuthPage initialMode="register" />
    </div>
  );
}

