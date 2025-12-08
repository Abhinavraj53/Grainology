import { useState } from 'react';
import { Shield, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase, Profile } from '../lib/supabase';

interface KYCVerificationProps {
  profile: Profile;
  onVerificationComplete: () => void;
}

export default function KYCVerification({ profile, onVerificationComplete }: KYCVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [aadhaar, setAadhaar] = useState('');
  const [pan, setPan] = useState('');
  const [gst, setGst] = useState('');
  const [companyPan, setCompanyPan] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');

  const isCompany = profile.entity_type === 'company';

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/kyc/verify`;
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      if (isCompany) {
        const primaryDoc = companyPan || gst;
        const verificationType = companyPan ? 'company_pan' : 'gst';

        if (!primaryDoc) {
          setError('Please provide Company PAN or GST number');
          setLoading(false);
          return;
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            verificationType,
            documentNumber: primaryDoc,
          }),
        });

        const result = await response.json();

        if (result.verified) {
          setSuccess('Company verification successful!');
          onVerificationComplete();
        } else {
          setError(result.error || 'Verification failed. Please check your details.');
        }
      } else {
        const primaryDoc = aadhaar || pan;
        const verificationType = aadhaar ? 'aadhaar' : 'pan';

        if (!primaryDoc) {
          setError('Please provide Aadhaar or PAN number');
          setLoading(false);
          return;
        }

        const requestBody: any = {
          verificationType,
          documentNumber: primaryDoc,
        };

        if (verificationType === 'pan') {
          requestBody.name = name;
          requestBody.dob = dob;
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (result.verified) {
          setSuccess('Verification successful!');
          onVerificationComplete();
        } else {
          setError(result.error || 'Verification failed. Please check your details.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (profile.kyc_status) {
      case 'verified':
        return (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Verified</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 px-4 py-2 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Pending Verification</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 px-4 py-2 rounded-lg">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Verification Failed</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-gray-700 bg-gray-50 px-4 py-2 rounded-lg">
            <Shield className="w-5 h-5" />
            <span className="font-medium">Not Verified</span>
          </div>
        );
    }
  };

  if (profile.kyc_status === 'verified') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">KYC Status</h3>
              <p className="text-sm text-gray-600">Your identity is verified</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            Your account has been successfully verified. You can now access all features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">KYC Verification</h3>
            <p className="text-sm text-gray-600">
              {isCompany ? 'Verify your company' : 'Verify your identity'}
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <form onSubmit={handleVerification} className="space-y-4">
        {isCompany ? (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                Please provide either <strong>Company PAN</strong> or <strong>GST Number</strong> to verify your business.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company PAN
              </label>
              <input
                type="text"
                value={companyPan}
                onChange={(e) => setCompanyPan(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., AAACR5055K"
                maxLength={10}
              />
            </div>

            <div className="text-center text-gray-500 font-medium">OR</div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST Number (GSTIN)
              </label>
              <input
                type="text"
                value={gst}
                onChange={(e) => setGst(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 29AAACU1901H1ZK"
                maxLength={15}
              />
            </div>
          </>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                Please provide either <strong>Aadhaar</strong> or <strong>PAN</strong> to verify your identity.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aadhaar Number
              </label>
              <input
                type="text"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 1234 5678 9012"
                maxLength={12}
              />
            </div>

            <div className="text-center text-gray-500 font-medium">OR</div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PAN Number
              </label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., ABCDE1234F"
                maxLength={10}
              />
            </div>

            {pan && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name (as per PAN)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Verifying...' : 'Verify Identity'}
        </button>
      </form>
    </div>
  );
}
