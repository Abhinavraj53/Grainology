import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Sprout, Shield, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
}

export default function AuthPage({ initialMode = 'login' }: AuthPageProps = {}) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [pincode, setPincode] = useState('');
  const [role, setRole] = useState<'farmer' | 'trader' | 'fpo' | 'corporate' | 'miller' | 'financer' | 'admin'>('farmer');
  const [entityType, setEntityType] = useState<'individual' | 'company'>('individual');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<'private_limited' | 'partnership' | 'proprietorship' | 'llp'>('private_limited');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // KYC Verification state (Cashfree)
  const [verificationMethod, setVerificationMethod] = useState<'pan' | 'aadhaar' | 'gst' | 'cin' | ''>('');
  const [panNumber, setPanNumber] = useState('');
  const [panName, setPanName] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [cinNumber, setCinNumber] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [kycVerifying, setKycVerifying] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);
  const [kycVerificationData, setKycVerificationData] = useState<any>(null);
  const [autoFilledData, setAutoFilledData] = useState<any>(null);

  const { signIn } = useAuth();

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Handle navigation between steps for registration
    if (!isLogin && step < 5) {
      if (step === 1) {
        // Step 1: Validate role selection
        if (!role || role === '') {
          setError('Please select your role to continue');
          return;
        }
        setStep(2);
        return;
      } else if (step === 2) {
        // Step 2: Validate verification method selection
        if (!verificationMethod) {
          setError('Please select a verification method to continue');
          return;
        }
        setStep(3);
        return;
      } else if (step === 3) {
        // Step 3: Validate document details before verification
        // Validation will be done in the verification function
        // Just proceed to next step after verification is complete
        return;
      } else if (step === 4) {
        // Step 4: Auto-filled details - just proceed to review
        setStep(5);
        return;
      }
      return;
    }

    // If on step 5 (final step) or login, proceed with account creation/sign in
    if (!isLogin && step !== 5) {
      return; // Don't proceed if not on final step
    }

    // Final validation for step 5
    if (!isLogin && step === 5) {
      if (!email || !password) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }
      if (!mobileNumber || mobileNumber.length !== 10) {
        setError('Please enter a valid 10-digit mobile number');
        setLoading(false);
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        // Complete signup with verified KYC data
        const { data: authData, error: signUpError } = await api.auth.signUp({
          email,
          password,
          name: autoFilledData?.name || name,
          mobile_number: mobileNumber,
          preferred_language: preferredLanguage,
          address_line1: autoFilledData?.address || addressLine1,
          address_line2: addressLine2,
          district: district,
          state: state,
          country: country,
          pincode: pincode,
          role,
          entity_type: entityType,
          business_name: entityType === 'company' ? businessName : undefined,
          business_type: entityType === 'company' ? businessType : undefined,
          kyc_verification_data: kycVerified ? {
            verificationMethod: verificationMethod,
            ...kycVerificationData,
            autoFilledData: autoFilledData,
          } : undefined,
        });

        if (signUpError) throw signUpError;
        if (!authData?.user) throw new Error('Failed to create user');
      }
    } catch (err: any) {
      setError(err.message || err.error?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-green-600 rounded-full mb-3 md:mb-4">
            <Sprout className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">Grainology</h1>
          <p className="text-sm sm:text-base text-gray-600">Digital Agri-Marketplace</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-5 sm:p-6 md:p-8">
          <div className="flex gap-2 mb-4 sm:mb-5 md:mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-medium transition-colors ${
                isLogin
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-medium transition-colors ${
                !isLogin
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Register
            </button>
          </div>

          {!isLogin && step <= 5 && (
            <div className="mb-4 flex justify-between">
              <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-green-600' : 'bg-gray-200'} mr-1`}></div>
              <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-green-600' : 'bg-gray-200'} mr-1`}></div>
              <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-green-600' : 'bg-gray-200'} mr-1`}></div>
              <div className={`flex-1 h-2 rounded-full ${step >= 4 ? 'bg-green-600' : 'bg-gray-200'} mr-1`}></div>
              <div className={`flex-1 h-2 rounded-full ${step >= 5 ? 'bg-green-600' : 'bg-gray-200'}`}></div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {!isLogin && step === 1 && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-blue-900 mb-1">Step 1: Who Are You?</p>
                  <p className="text-xs text-blue-800">Select your role to get started</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    I am a <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const newRole = e.target.value as any;
                      setRole(newRole);
                      // Auto-set entity_type based on role
                      if (newRole === 'farmer' || newRole === 'trader') {
                        setEntityType('individual');
                      } else if (newRole === 'fpo' || newRole === 'corporate' || newRole === 'miller' || newRole === 'financer') {
                        setEntityType('company');
                      }
                    }}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select your role</option>
                    <option value="farmer">Farmer</option>
                    <option value="trader">Trader</option>
                    <option value="fpo">FPO (Farmer Producer Organization)</option>
                    <option value="corporate">Corporate</option>
                    <option value="miller">Miller/Processor</option>
                    <option value="financer">Financer</option>
                  </select>
                </div>
              </>
            )}

            {!isLogin && step === 2 && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">Step 2: Choose Verification Method</p>
                  </div>
                  <p className="text-xs text-blue-800">Select how you want to verify your identity</p>
                </div>

                {entityType === 'individual' ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Select Verification Method <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setVerificationMethod('pan')}
                          className={`p-4 border-2 rounded-lg text-center transition-colors ${
                            verificationMethod === 'pan'
                              ? 'border-green-600 bg-green-50 text-green-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="font-medium text-sm">PAN Card</div>
                          <div className="text-xs text-gray-600 mt-1">Verify with PAN</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVerificationMethod('aadhaar')}
                          className={`p-4 border-2 rounded-lg text-center transition-colors ${
                            verificationMethod === 'aadhaar'
                              ? 'border-green-600 bg-green-50 text-green-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="font-medium text-sm">Aadhaar Card</div>
                          <div className="text-xs text-gray-600 mt-1">Verify with Aadhaar</div>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Select Verification Method <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setVerificationMethod('gst')}
                          className={`p-4 border-2 rounded-lg text-center transition-colors ${
                            verificationMethod === 'gst'
                              ? 'border-green-600 bg-green-50 text-green-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="font-medium text-sm">GST Number</div>
                          <div className="text-xs text-gray-600 mt-1">Verify with GST</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVerificationMethod('cin')}
                          className={`p-4 border-2 rounded-lg text-center transition-colors ${
                            verificationMethod === 'cin'
                              ? 'border-green-600 bg-green-50 text-green-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="font-medium text-sm">CIN Number</div>
                          <div className="text-xs text-gray-600 mt-1">Verify with CIN</div>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Back
                </button>
              </>
            )}

            {!isLogin && step === 3 && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">Step 3: Document Verification</p>
                  </div>
                  <p className="text-xs text-blue-800">Enter your document details and verify via Cashfree</p>
                </div>

                {verificationMethod === 'pan' && (
                  <>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        PAN Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="ABCDE1234F"
                        maxLength={10}
                      />
                      <p className="text-xs text-gray-500 mt-1">Format: ABCDE1234F</p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Full Name (as on PAN) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={panName}
                        onChange={(e) => setPanName(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!panNumber || !panName) {
                          setError('Please enter PAN number and name');
                          return;
                        }
                        setKycVerifying(true);
                        setError('');
                        try {
                          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/cashfree/kyc/verify-pan`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ pan: panNumber.trim().toUpperCase(), name: panName.trim() }),
                          });
                          
                          const result = await response.json();
                          
                          if (!response.ok) {
                            // Handle error responses
                            const errorMessage = result.message || result.error || 'PAN verification failed';
                            setError(errorMessage);
                            console.error('PAN verification error:', result);
                            return;
                          }
                          
                          if (result.success && result.verified) {
                            setKycVerified(true);
                            setKycVerificationData(result);
                            setAutoFilledData({
                              name: result.name || panName,
                              documentNumber: panNumber.toUpperCase(),
                              documentType: 'PAN',
                              verifiedDetails: result,
                            });
                            setStep(4);
                          } else {
                            const errorMessage = result.message || result.error || 'PAN verification failed. Please check your PAN number and name.';
                            setError(errorMessage);
                          }
                        } catch (err: any) {
                          console.error('PAN verification network error:', err);
                          setError(err.message || 'Network error. Please check your connection and try again.');
                        } finally {
                          setKycVerifying(false);
                        }
                      }}
                      disabled={kycVerifying || !panNumber || !panName}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {kycVerifying ? 'Verifying...' : 'Verify PAN'}
                    </button>
                  </>
                )}

                {verificationMethod === 'aadhaar' && (
                  <>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Aadhaar Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={aadhaarNumber}
                        onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter 12-digit Aadhaar number"
                        maxLength={12}
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter your 12-digit Aadhaar number</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!aadhaarNumber || aadhaarNumber.length !== 12) {
                          setError('Please enter a valid 12-digit Aadhaar number');
                          return;
                        }
                        setKycVerifying(true);
                        setError('');
                        try {
                          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/cashfree/kyc/verify-aadhaar-number`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ aadhaar_number: aadhaarNumber }),
                          });
                          const result = await response.json();
                          if (result.success) {
                            // If DigiLocker verification URL is provided, open it
                            if (result.verification_url && !result.verified) {
                              // Open DigiLocker verification in new window
                              const digilockerWindow = window.open(
                                result.verification_url,
                                'digilocker_verification',
                                'width=600,height=700,scrollbars=yes'
                              );
                              
                              // Poll for verification status
                              const checkStatus = async () => {
                                try {
                                  const statusResponse = await fetch(
                                    `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/cashfree/kyc/digilocker-status/${result.reference_id}?aadhaar=${aadhaarNumber}`
                                  );
                                  const statusResult = await statusResponse.json();
                                  
                                  if (statusResult.verified && statusResult.name) {
                                    // Verification successful with details
                                    setKycVerified(true);
                                    setKycVerificationData(statusResult);
                                    setAutoFilledData({
                                      name: statusResult.name,
                                      dateOfBirth: statusResult.date_of_birth,
                                      address: statusResult.address,
                                      aadhaarNumber: statusResult.aadhaar_number || aadhaarNumber,
                                      documentType: 'Aadhaar',
                                      verification_method: 'digilocker',
                                      verifiedDetails: statusResult,
                                    });
                                    if (digilockerWindow) digilockerWindow.close();
                                    setStep(4);
                                  } else if (statusResult.status === 'failed') {
                                    setError('DigiLocker verification failed. Please try again.');
                                    if (digilockerWindow) digilockerWindow.close();
                                  } else {
                                    // Continue polling
                                    setTimeout(checkStatus, 3000);
                                  }
                                } catch (err) {
                                  console.error('Status check error:', err);
                                  setTimeout(checkStatus, 3000);
                                }
                              };
                              
                              // Start polling after a delay
                              setTimeout(checkStatus, 5000);
                              
                              setError('Please complete verification in the popup window. We will fetch your details once verified.');
                              return;
                            }
                            
                            // If already verified with details
                            if (result.verified && result.name) {
                              setKycVerified(true);
                              setKycVerificationData(result);
                              setAutoFilledData({
                                name: result.name,
                                dateOfBirth: result.date_of_birth,
                                address: result.address,
                                aadhaarNumber: result.aadhaar_number,
                                documentType: 'Aadhaar',
                                verification_method: result.verification_method || 'digilocker',
                                verifiedDetails: result,
                              });
                              setStep(4);
                            } else {
                              // Format validation only - NOT verified
                              setError(result.error || result.message || 'Aadhaar format validated, but full verification is required. Please complete DigiLocker verification to fetch your details.');
                            }
                          } else {
                            setError(result.error || 'Aadhaar verification failed');
                          }
                        } catch (err: any) {
                          setError(err.message || 'Verification failed');
                        } finally {
                          setKycVerifying(false);
                        }
                      }}
                      disabled={kycVerifying || !aadhaarNumber}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {kycVerifying ? 'Verifying...' : 'Verify Aadhaar'}
                    </button>
                  </>
                )}

                {(verificationMethod === 'gst' || verificationMethod === 'cin') && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> GST and CIN verification will be implemented soon. Please contact support for company verification.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    setKycVerified(false);
                    setKycVerificationData(null);
                    setAutoFilledData(null);
                  }}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors mt-4"
                >
                  Back
                </button>
              </>
            )}

            {!isLogin && step === 4 && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">Step 4: Verified Details</p>
                  </div>
                  <p className="text-xs text-blue-800">Review the details extracted from your verified document (read-only)</p>
                </div>

                {autoFilledData && (
                  <div className="space-y-4">
                    {autoFilledData.name ? (
                      <>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-green-800 mb-2">
                            <CheckCircle className="w-5 h-5" />
                            <p className="font-medium">Verification Successful!</p>
                          </div>
                          <p className="text-xs text-green-700">These details were extracted from your verified document and cannot be edited.</p>
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={autoFilledData.name || ''}
                            readOnly
                            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-yellow-800 mb-2">
                          <Shield className="w-5 h-5" />
                          <p className="font-medium">Verification Not Complete</p>
                        </div>
                        <p className="text-xs text-yellow-700 mb-3">
                          Document number format validated, but full verification is required to fetch your details automatically.
                        </p>
                        <p className="text-xs text-yellow-600">
                          Please go back and complete DigiLocker verification to auto-fill your details.
                        </p>
                      </div>
                    )}
                    
                    {!autoFilledData.name && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                    )}

                    {autoFilledData.dateOfBirth && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="text"
                          value={autoFilledData.dateOfBirth || ''}
                          readOnly
                          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                        />
                      </div>
                    )}

                    {autoFilledData.address && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Address (from document)
                        </label>
                        <textarea
                          value={autoFilledData.address || ''}
                          readOnly
                          rows={3}
                          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Document Type
                      </label>
                      <input
                        type="text"
                        value={autoFilledData.documentType || ''}
                        readOnly
                        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Document Number
                      </label>
                      <input
                        type="text"
                        value={autoFilledData.documentNumber || autoFilledData.aadhaarNumber || ''}
                        readOnly
                        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Create a password"
                      required
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors mt-4"
                >
                  Back
                </button>
              </>
            )}

            {!isLogin && step === 5 && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-blue-900 mb-1">Step 5: Review & Create Account</p>
                  <p className="text-xs text-blue-800">Review all your information before creating your account</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Account Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Role:</span> <span className="capitalize">{role}</span></div>
                      <div><span className="font-medium">Name:</span> {autoFilledData?.name || name || 'N/A'}</div>
                      <div><span className="font-medium">Email:</span> {email || 'N/A'}</div>
                      <div><span className="font-medium">Mobile:</span> {mobileNumber || 'N/A'}</div>
                      {autoFilledData?.documentType && (
                        <div><span className="font-medium">Verified Document:</span> {autoFilledData.documentType}</div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors mt-4"
                >
                  Back
                </button>
              </>
            )}

            {/* Email and Password fields only for Login */}
            {isLogin && (
              <>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your password"
                  />
                </div>
              </>
            )}

            {error && (
              <div className={`border px-4 py-3 rounded-lg ${
                error.includes('skip') || 
                error.includes('Skip') || 
                error.includes('unavailable') || 
                error.includes('DigiLocker')
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium">{error}</span>
                </div>
                {(error.includes('unavailable') || 
                  error.includes('DigiLocker') ||
                  error.includes('verification')) && (
                  <div className="mt-3 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-yellow-900">
                      <span>💡</span>
                      <span><strong>Tip:</strong> Please try again. If DigiLocker verification is unavailable, you can skip verification for now and complete it later from your profile settings.</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Continue buttons for steps 1, 2, and 4 */}
            {!isLogin && (step === 1 || step === 2 || step === 4) && (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            )}

            {/* Submit button for login or step 5 (final step) */}
            {(isLogin || step === 5) && (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
              </button>
            )}
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">Getting Started:</p>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>Click "Register" to create a new account</li>
              <li>Choose your role: Farmer, Trader, FPO, Corporate, Miller, Financer, or Admin</li>
              <li>Use any email address (confirmation not required)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
