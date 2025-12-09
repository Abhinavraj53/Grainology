import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Sprout, Shield, CheckCircle } from 'lucide-react';
// @ts-ignore - JS module without types
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
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingMaxTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (pollingStartTimeoutRef.current) {
        clearTimeout(pollingStartTimeoutRef.current);
      }
      if (pollingMaxTimeoutRef.current) {
        clearTimeout(pollingMaxTimeoutRef.current);
      }
    };
  }, []);

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
        if (!role) {
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
      if (!email || !email.trim()) {
        setError('Email is required');
        setLoading(false);
        return;
      }
      if (!password || password.length < 6) {
        setError('Password is required and must be at least 6 characters');
        setLoading(false);
        return;
      }
      // Ensure name is available (from auto-filled data or manual input)
      const finalName = autoFilledData?.name || name;
      if (!finalName || !finalName.trim()) {
        setError('Name is required. Please complete KYC verification or enter your name manually.');
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
        // Redirect to dashboard after successful login
        navigate('/dashboard');
      } else {
        // Complete signup with verified KYC data
        // Ensure we have a valid name
        const finalName = autoFilledData?.name || name;
        if (!finalName || !finalName.trim()) {
          setError('Name is required. Please complete KYC verification or enter your name manually.');
          setLoading(false);
          return;
        }

        const signUpPayload: any = {
          email: email.trim(),
          password,
          name: finalName.trim(),
          mobile_number: mobileNumber?.trim() || undefined,
          preferred_language: preferredLanguage || 'English',
          address_line1: autoFilledData?.address || addressLine1 || undefined,
          address_line2: addressLine2 || undefined,
          district: district || undefined,
          state: state || undefined,
          country: country || 'India',
          pincode: pincode || undefined,
          role: role || 'farmer',
          entity_type: entityType || 'individual',
          business_name: entityType === 'company' ? businessName : undefined,
          business_type: entityType === 'company' ? businessType : undefined,
        };

        // Add KYC data if verified
        if (kycVerified && kycVerificationData) {
          signUpPayload.kyc_verification_data = {
            verificationMethod: verificationMethod,
            verification_id: kycVerificationData.verification_id,
            aadhaar_data: {
              name: autoFilledData?.name,
              date_of_birth: autoFilledData?.dateOfBirth,
              gender: autoFilledData?.gender || kycVerificationData.gender,
              address: autoFilledData?.address,
              aadhaar_number: autoFilledData?.aadhaarNumber,
              father_name: autoFilledData?.father_name || kycVerificationData.father_name,
              verified_at: autoFilledData?.verifiedAt || new Date().toISOString(),
            },
            ...kycVerificationData,
            autoFilledData: autoFilledData,
          };
        }

        console.log('Signup payload:', { ...signUpPayload, password: '***' }); // Log without password

        const { data: authData, error: signUpError } = await api.auth.signUp(signUpPayload);

        if (signUpError) {
          // Extract error message from signup error
          const errorMessage = signUpError.message || 
                               signUpError.error?.message || 
                               signUpError.details || 
                               'An error occurred while creating an account';
          console.error('Signup error:', signUpError);
          setError(errorMessage);
          setLoading(false);
          return;
        }
        
        if (!authData?.user) {
          setError('Failed to create user. Please try again.');
          setLoading(false);
          return;
        }
        
        // Show success message
        console.log('✅ Account created successfully with Aadhaar verification!');
        console.log('Aadhaar data stored:', kycVerificationData);
        
        // Automatically sign in the user after successful registration
        try {
          await signIn(email, password);
          // Redirect to dashboard after successful sign in
          console.log('✅ Sign in successful, redirecting to dashboard...');
          navigate('/dashboard');
        } catch (signInError: any) {
          console.error('Sign in error after signup:', signInError);
          // Even if sign in fails, redirect to dashboard (user is already created)
          // The dashboard will handle authentication state
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const errorMessage = err.message || 
                          err.error?.message || 
                          err.details || 
                          'An error occurred';
      setError(errorMessage);
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
                        
                        // Clear any existing polling
                        if (pollingIntervalRef.current) {
                          clearInterval(pollingIntervalRef.current);
                          pollingIntervalRef.current = null;
                        }
                        if (pollingStartTimeoutRef.current) {
                          clearTimeout(pollingStartTimeoutRef.current);
                          pollingStartTimeoutRef.current = null;
                        }
                        if (pollingMaxTimeoutRef.current) {
                          clearTimeout(pollingMaxTimeoutRef.current);
                          pollingMaxTimeoutRef.current = null;
                        }
                        
                        setKycVerifying(true);
                        setError('');
                        let timeoutId: NodeJS.Timeout | null = null;
                        const controller = new AbortController();
                        
                        try {
                          // Increase timeout to 60 seconds for initial request (backend might be slow)
                          timeoutId = setTimeout(() => {
                            if (!controller.signal.aborted) {
                              controller.abort();
                            }
                          }, 60000);
                          
                          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/cashfree/kyc/verify-aadhaar-number`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ aadhaar_number: aadhaarNumber }),
                            signal: controller.signal
                          });
                          
                          // Clear timeout immediately after fetch completes
                          if (timeoutId) {
                            clearTimeout(timeoutId);
                            timeoutId = null;
                          }
                          
                          // Check if response is OK before parsing JSON
                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
                            throw new Error(errorData.error || `Server error: ${response.status}`);
                          }
                          
                          const result = await response.json();
                          console.log('Aadhaar verification response:', result);
                          
                          if (result.success) {
                            // If DigiLocker verification URL is provided, open it
                            if (result.verification_url && !result.verified) {
                              console.log('Opening DigiLocker URL:', result.verification_url);
                              
                              // IMPORTANT: Use verification_id (not reference_id) for status checks
                              // Cashfree requires verification_id for status API calls
                              const verificationId = result.verification_id || result.reference_id;
                              const referenceId = result.reference_id; // Keep for reference
                              
                              if (!verificationId) {
                                setError('Missing verification ID. Please try again.');
                                setKycVerifying(false);
                                return;
                              }
                              
                              // Store verification_id for polling (this is what Cashfree needs)
                              const storedVerificationId = verificationId;
                              
                              // Open popup immediately (must be in direct response to user action)
                              // Use window.open synchronously - don't wrap in setTimeout
                              let digilockerWindow: Window | null = null;
                              
                              try {
                                // Open popup with proper features
                                digilockerWindow = window.open(
                                result.verification_url,
                                'digilocker_verification',
                                  'width=900,height=700,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=yes,status=yes'
                                );
                                
                                // Check if popup was blocked (must check immediately)
                                if (!digilockerWindow || digilockerWindow.closed) {
                                  console.warn('Popup was blocked, trying new tab...');
                                  // Popup blocked - try new tab
                                  const newTab = window.open(result.verification_url, '_blank');
                                  if (newTab) {
                                    setError('Popup was blocked. Opened DigiLocker verification in a new tab. Please complete it there, we will automatically fetch your details once verified.');
                                    digilockerWindow = newTab;
                                  } else {
                                    // Even new tab was blocked - show URL with copy option
                                    navigator.clipboard?.writeText(result.verification_url).then(() => {
                                      setError(`Popup blocked. Verification URL copied to clipboard. Please paste it in a new browser tab/window.`);
                                    }).catch(() => {
                                      setError(`Popup blocked. Please manually open this URL: ${result.verification_url}`);
                                    });
                                  }
                                } else {
                                  console.log('Popup opened successfully');
                                  setError('Please complete verification in the popup window. We will automatically fetch your details once verified.');
                                }
                              } catch (openError) {
                                console.error('Error opening popup:', openError);
                                // Fallback: try new tab
                                const newTab = window.open(result.verification_url, '_blank');
                                if (newTab) {
                                  setError('Opened DigiLocker verification in a new tab. Please complete it there.');
                                  digilockerWindow = newTab;
                                } else {
                                  setError(`Please manually open this URL: ${result.verification_url}`);
                                }
                              }

                              let pollCount = 0;
                              const maxPolls = 120; // Poll for up to 6 minutes (120 * 3 seconds = 6 minutes)
                              
                              // Poll for verification status
                              const checkStatus = async () => {
                                try {
                                  pollCount++;
                                  console.log(`Checking DigiLocker status (poll ${pollCount}/${maxPolls})...`);
                                  
                                  // Use verification_id in query parameter (required by Cashfree)
                                  const statusResponse = await fetch(
                                    `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/cashfree/kyc/digilocker-status/${storedVerificationId}?aadhaar=${aadhaarNumber}&verification_id=${storedVerificationId}`
                                  );
                                  
                                  if (!statusResponse.ok) {
                                    throw new Error(`Status check failed: ${statusResponse.status}`);
                                  }
                                  
                                  const statusResult = await statusResponse.json();
                                  console.log('DigiLocker status result:', statusResult);
                                  
                                  // Handle statuses according to Cashfree documentation:
                                  // PENDING, AUTHENTICATED, EXPIRED, CONSENT_DENIED
                                  const currentStatus = statusResult.status || statusResult.verification_status || 'PENDING';
                                  
                                  if (currentStatus === 'AUTHENTICATED' || statusResult.verified === true) {
                                    // User has authenticated and given consent - fetch document
                                    if (statusResult.name) {
                                    // Verification successful with details
                                      if (pollingIntervalRef.current) {
                                        clearInterval(pollingIntervalRef.current);
                                        pollingIntervalRef.current = null;
                                      }
                                      if (pollingStartTimeoutRef.current) {
                                        clearTimeout(pollingStartTimeoutRef.current);
                                        pollingStartTimeoutRef.current = null;
                                      }
                                      if (pollingMaxTimeoutRef.current) {
                                        clearTimeout(pollingMaxTimeoutRef.current);
                                        pollingMaxTimeoutRef.current = null;
                                      }
                                      
                                      // Store complete Aadhaar verification data
                                      const aadhaarData = {
                                      name: statusResult.name,
                                        dateOfBirth: statusResult.date_of_birth || statusResult.dob,
                                        gender: statusResult.gender,
                                        address: statusResult.address || statusResult.full_address,
                                      aadhaarNumber: statusResult.aadhaar_number || aadhaarNumber,
                                        father_name: statusResult.father_name,
                                      documentType: 'Aadhaar',
                                      verification_method: 'digilocker',
                                        verification_id: storedVerificationId,
                                      verifiedDetails: statusResult,
                                        verifiedAt: new Date().toISOString(),
                                      };
                                      
                                      setKycVerified(true);
                                      setKycVerificationData({
                                        ...statusResult,
                                        verification_id: storedVerificationId,
                                      });
                                      setAutoFilledData(aadhaarData);
                                      
                                      if (digilockerWindow && !digilockerWindow.closed) {
                                        digilockerWindow.close();
                                      }
                                      setKycVerifying(false);
                                      setError('');
                                      
                                      // Show success message
                                      console.log('✅ Aadhaar verification successful!', aadhaarData);
                                      
                                      // Proceed to next step (review and account creation)
                                    setStep(4);
                                      return;
                                    } else if (statusResult.error === 'eaadhaar_not_available') {
                                      // Aadhaar document not available in DigiLocker
                                      if (pollingIntervalRef.current) {
                                        clearInterval(pollingIntervalRef.current);
                                        pollingIntervalRef.current = null;
                                      }
                                      if (pollingStartTimeoutRef.current) {
                                        clearTimeout(pollingStartTimeoutRef.current);
                                        pollingStartTimeoutRef.current = null;
                                      }
                                      if (pollingMaxTimeoutRef.current) {
                                        clearTimeout(pollingMaxTimeoutRef.current);
                                        pollingMaxTimeoutRef.current = null;
                                      }
                                      setError('Aadhaar document not available in DigiLocker. Please log in to DigiLocker and link your Aadhaar document, then try again.');
                                      setKycVerifying(false);
                                      if (digilockerWindow && !digilockerWindow.closed) {
                                        digilockerWindow.close();
                                      }
                                      return;
                                    }
                                    // Status is AUTHENTICATED but no name yet - continue polling
                                  } else if (currentStatus === 'EXPIRED') {
                                    // Link expired
                                    if (pollingIntervalRef.current) {
                                      clearInterval(pollingIntervalRef.current);
                                      pollingIntervalRef.current = null;
                                    }
                                    if (pollingStartTimeoutRef.current) {
                                      clearTimeout(pollingStartTimeoutRef.current);
                                      pollingStartTimeoutRef.current = null;
                                    }
                                    if (pollingMaxTimeoutRef.current) {
                                      clearTimeout(pollingMaxTimeoutRef.current);
                                      pollingMaxTimeoutRef.current = null;
                                    }
                                    setError('DigiLocker verification link has expired. Please start the verification process again.');
                                    setKycVerifying(false);
                                    if (digilockerWindow && !digilockerWindow.closed) {
                                      digilockerWindow.close();
                                    }
                                    return;
                                  } else if (currentStatus === 'CONSENT_DENIED') {
                                    // User denied consent
                                    if (pollingIntervalRef.current) {
                                      clearInterval(pollingIntervalRef.current);
                                      pollingIntervalRef.current = null;
                                    }
                                    if (pollingStartTimeoutRef.current) {
                                      clearTimeout(pollingStartTimeoutRef.current);
                                      pollingStartTimeoutRef.current = null;
                                    }
                                    if (pollingMaxTimeoutRef.current) {
                                      clearTimeout(pollingMaxTimeoutRef.current);
                                      pollingMaxTimeoutRef.current = null;
                                    }
                                    setError('You denied consent to share documents. Please try again and provide consent to complete verification.');
                                    setKycVerifying(false);
                                    if (digilockerWindow && !digilockerWindow.closed) {
                                      digilockerWindow.close();
                                    }
                                    return;
                                  } else if (currentStatus === 'PENDING') {
                                    // Still pending - continue polling
                                    console.log('Verification still pending, continuing to poll...');
                                  } else if (pollCount >= maxPolls) {
                                    // Max polls reached - stop polling
                                    if (pollingIntervalRef.current) {
                                      clearInterval(pollingIntervalRef.current);
                                      pollingIntervalRef.current = null;
                                    }
                                    if (pollingStartTimeoutRef.current) {
                                      clearTimeout(pollingStartTimeoutRef.current);
                                      pollingStartTimeoutRef.current = null;
                                    }
                                    if (pollingMaxTimeoutRef.current) {
                                      clearTimeout(pollingMaxTimeoutRef.current);
                                      pollingMaxTimeoutRef.current = null;
                                    }
                                    setError('Verification is taking longer than expected. Please check if you completed the DigiLocker process or try again later.');
                                    setKycVerifying(false);
                                    if (digilockerWindow && !digilockerWindow.closed) {
                                      digilockerWindow.close();
                                    }
                                    return;
                                  }
                                  // Otherwise continue polling (status is still PENDING)
                                } catch (err) {
                                  console.error('Status check error:', err);
                                  // Continue polling on error unless we've reached max polls
                                  if (pollCount >= maxPolls) {
                                    if (pollingIntervalRef.current) {
                                      clearInterval(pollingIntervalRef.current);
                                      pollingIntervalRef.current = null;
                                    }
                                    if (pollingStartTimeoutRef.current) {
                                      clearTimeout(pollingStartTimeoutRef.current);
                                      pollingStartTimeoutRef.current = null;
                                    }
                                    if (pollingMaxTimeoutRef.current) {
                                      clearTimeout(pollingMaxTimeoutRef.current);
                                      pollingMaxTimeoutRef.current = null;
                                    }
                                    setError('Error checking verification status. Please try again.');
                                    setKycVerifying(false);
                                  }
                                }
                              };
                              
                              // Start polling after 3 seconds, then every 3 seconds
                              pollingStartTimeoutRef.current = setTimeout(() => {
                                checkStatus(); // First check
                                pollingIntervalRef.current = setInterval(checkStatus, 3000); // Then every 3 seconds
                              }, 3000);
                              
                              // Set max polling duration (6 minutes total)
                              pollingMaxTimeoutRef.current = setTimeout(() => {
                                if (pollingIntervalRef.current) {
                                  clearInterval(pollingIntervalRef.current);
                                  pollingIntervalRef.current = null;
                                }
                                setError('Verification timeout. Please check if you completed the DigiLocker process or try again.');
                                setKycVerifying(false);
                                if (digilockerWindow && !digilockerWindow.closed) {
                                  digilockerWindow.close();
                                }
                              }, 360000); // 6 minutes
                              
                              // Keep kycVerifying true while polling
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
                              setKycVerifying(false);
                              setStep(4);
                            } else {
                              // Format validation only - NOT verified
                              setError(result.error || result.message || 'Aadhaar format validated, but full verification is required. Please complete DigiLocker verification to fetch your details.');
                              setKycVerifying(false);
                            }
                          } else {
                            setError(result.error || 'Aadhaar verification failed');
                            setKycVerifying(false);
                          }
                        } catch (err: any) {
                          // Always clear timeout in catch block
                          if (timeoutId) {
                            clearTimeout(timeoutId);
                            timeoutId = null;
                          }
                          
                          // Handle different error types
                          if (err.name === 'AbortError' || err.message?.includes('aborted') || controller.signal.aborted) {
                            setError('Verification request timed out (60s). The server may be slow. Please try again.');
                          } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
                            setError('Network error. Please check your internet connection and try again.');
                          } else {
                            setError(err.message || 'Verification failed. Please try again.');
                          }
                          console.error('Aadhaar verification error:', err);
                          setKycVerifying(false);
                        } finally {
                          // Ensure timeout is always cleared
                          if (timeoutId) {
                            clearTimeout(timeoutId);
                            timeoutId = null;
                          }
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
                        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-2 text-green-800 mb-2">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            <p className="font-bold text-lg">✅ Aadhaar Verification Successful!</p>
                          </div>
                          <p className="text-sm text-green-700 mb-2">
                            Your Aadhaar has been successfully verified via DigiLocker. Your details have been automatically extracted and will be saved when you create your account.
                          </p>
                          <p className="text-xs text-green-600">
                            Please review the details below and proceed to create your account.
                          </p>
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
