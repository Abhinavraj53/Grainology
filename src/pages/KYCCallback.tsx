import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function KYCCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');
  const aadhaar = searchParams.get('aadhaar');

  useEffect(() => {
    // If opened as a popup, close it so the opener can continue
    if (window.opener) {
      window.close();
    } else {
      // If opened as a full page (e.g., popup blocked), go back to register with context
      const target = ref && aadhaar
        ? `/register?ref=${encodeURIComponent(ref)}&aadhaar=${encodeURIComponent(aadhaar)}`
        : '/register';
      navigate(target, { replace: true });
    }
  }, [navigate, ref, aadhaar]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing verification...</p>
      </div>
    </div>
  );
}

