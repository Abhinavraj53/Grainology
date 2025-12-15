import AuthPage from '../components/AuthPage';

export default function Login() {
  return (
    <div className="min-h-screen">
      <AuthPage initialMode="login" />
    </div>
  );
}

