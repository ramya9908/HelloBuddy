import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Gift, Smartphone, ArrowLeft, AlertCircle, Wallet, Mail, Shield, Clock, History } from 'lucide-react';
import { API_URL } from '../../utils/constants';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

// Updated withdrawal methods with Paytm and new limits
const WITHDRAWAL_METHODS = [
  {
    id: 'paytm',
    name: 'Paytm Wallet',
    description: 'Instant transfer to Paytm wallet',
    minAmount: 30,
    icon: Wallet,
    color: 'text-blue-600'
  },
  {
    id: 'amazon',
    name: 'Amazon Gift Card',
    description: 'Receive Amazon gift card via email',
    minAmount: 100,
    icon: Gift,
    color: 'text-orange-600'
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    description: 'Direct transfer to PhonePe account',
    minAmount: 500,
    icon: Smartphone,
    color: 'text-purple-600'
  }
];

// Minimum withdrawal amount (global minimum)
const MIN_WITHDRAWAL_AMOUNT = 30;
const WITHDRAWAL_CHARGE_RATE = 0.05; // 5%

const WithdrawEarnings = () => {
  const [selectedMethod, setSelectedMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [accountDetails, setAccountDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [withdrawalData, setWithdrawalData] = useState<any>(null);
  const navigate = useNavigate();
  const { user, checkAuth } = useAuth();

  // Calculate withdrawal charges and final amount
  const calculateCharges = (withdrawalAmount: number) => {
    const charges = withdrawalAmount * WITHDRAWAL_CHARGE_RATE;
    const finalAmount = withdrawalAmount - charges;
    return { charges, finalAmount };
  };

  const getSelectedMethod = () => {
    return WITHDRAWAL_METHODS.find(m => m.id === selectedMethod);
  };

  const getAccountDetailsLabel = () => {
    switch (selectedMethod) {
      case 'amazon':
        return 'Email Address';
      case 'phonepe':
        return 'PhonePe Number';
      case 'paytm':
        return 'Paytm Number';
      default:
        return 'Account Details';
    }
  };

  const getAccountDetailsPlaceholder = () => {
    switch (selectedMethod) {
      case 'amazon':
        return 'Enter your email address';
      case 'phonepe':
        return 'Enter your PhonePe number';
      case 'paytm':
        return 'Enter your Paytm number';
      default:
        return 'Enter account details';
    }
  };

  // Start OTP timer
  const startOtpTimer = () => {
    setOtpTimer(60); 
    const timer = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  //OTP for withdrawal
  const sendWithdrawalOtp = async () => {
    try {
      setIsOtpLoading(true);
      const response = await axios.post(
        `${API_URL}/api/user/send-withdrawal-otp`,
        { email: user?.email },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        toast.success('OTP sent to your email');
        startOtpTimer();
      } else {
        toast.error('Failed to send OTP');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsOtpLoading(false);
    }
  };

  // Verify OTP and process withdrawal
  const verifyOtpAndWithdraw = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(
        `${API_URL}/api/user/verify-withdrawal-otp`,
        {
          otp,
          withdrawalData
        },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        toast.success('Withdrawal request submitted! Money deducted from wallet and pending admin approval.');
        await checkAuth(); // Refresh user data with updated earnings
        navigate('/dashboard');
      } else {
        toast.error(response.data.message || 'OTP verification failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMethod) {
      toast.error('Please select a withdrawal method');
      return;
    }
    
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    // Check global minimum
    if (withdrawalAmount < MIN_WITHDRAWAL_AMOUNT) {
      toast.error(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL_AMOUNT}`);
      return;
    }
    
    const selectedWithdrawalMethod = getSelectedMethod();
    
    if (!selectedWithdrawalMethod) {
      toast.error('Invalid withdrawal method');
      return;
    }
    
    
    if (withdrawalAmount < selectedWithdrawalMethod.minAmount) {
      toast.error(`Minimum amount for ${selectedWithdrawalMethod.name} is ₹${selectedWithdrawalMethod.minAmount}`);
      return;
    }
    
    if (user && withdrawalAmount > user.earnings) {
      toast.error('Insufficient balance');
      return;
    }
    
    if (!accountDetails) {
      toast.error(`Please enter your ${getAccountDetailsLabel().toLowerCase()}`);
      return;
    }
    
    // Validate account details format
    if (selectedMethod === 'amazon' && !accountDetails.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if ((selectedMethod === 'phonepe' || selectedMethod === 'paytm') && !/^\d{10}$/.test(accountDetails)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    
    // Store withdrawal data and proceed to OTP verification
    const withdrawalRequestData = {
      method: selectedMethod,
      amount: withdrawalAmount,
      accountDetails,
    };
    
    setWithdrawalData(withdrawalRequestData);
    setShowOtpStep(true);
    await sendWithdrawalOtp();
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    await sendWithdrawalOtp();
  };

  const withdrawalAmount = parseFloat(amount) || 0;
  const { charges, finalAmount } = calculateCharges(withdrawalAmount);
  const isValidAmount = withdrawalAmount >= MIN_WITHDRAWAL_AMOUNT && withdrawalAmount <= (user?.earnings || 0);
  const selectedMethodData = getSelectedMethod();
  const isValidForMethod = selectedMethodData ? withdrawalAmount >= selectedMethodData.minAmount : false;

  // If showing OTP step
  if (showOtpStep) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center">
            <button 
              onClick={() => setShowOtpStep(false)}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Verify Email - Withdrawal</h1>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h2>
              <p className="text-gray-600">
                We've sent a 6-digit verification code to
              </p>
              <p className="font-medium text-gray-900">{user?.email}</p>
            </div>

            {/* Withdrawal Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Withdrawal Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span>{selectedMethodData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span>₹{withdrawalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Charges:</span>
                  <span className="text-red-600">-₹{charges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>You'll receive:</span>
                  <span className="text-green-600">₹{finalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); verifyOtpAndWithdraw(); }}>
              <Input
                label="Enter 6-digit code"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                maxLength={6}
                required
                className="text-center text-lg tracking-widest"
              />

              <Button 
                type="submit" 
                variant="primary" 
                fullWidth 
                isLoading={isLoading}
                disabled={isLoading || otp.length !== 6}
                className="mt-4"
              >
                {isLoading ? 'Verifying...' : 'Verify & Withdraw'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Didn't receive the code?{' '}
                <button
                  onClick={handleResendOtp}
                  disabled={otpTimer > 0 || isOtpLoading}
                  className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend code'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/dashboard')}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Withdraw Earnings</h1>
          </div>
          {/* Add Withdrawal History Button */}
          <button
            onClick={() => navigate('/withdrawal-history')}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <History className="h-4 w-4 mr-2" />
            View History
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
          {/* Current Balance */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg flex items-start justify-between">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
              <div>
                <p className="text-blue-800 font-medium">Your Current Balance</p>
                <p className="text-2xl font-bold text-blue-700">₹{user?.earnings.toFixed(2)}</p>
              </div>
            </div>
            {/* Quick History Link */}
            <button
              onClick={() => navigate('/withdrawal-history')}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Check Status
            </button>
          </div>

          {/* Details Verification Warning */}
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">⚠️ Important: Verify Your Details</p>
                <p className="text-sm text-red-700 mt-1">
                  Please ensure all account details are correct and match your registered information. 
                  Requests with incorrect details will be declined and may result in processing delays.
                </p>
              </div>
            </div>
          </div>

          {/* Withdrawal Info */}
          <div className="mb-6 p-4 bg-amber-50 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">Withdrawal Information</p>
                <ul className="text-sm text-amber-700 mt-1 space-y-1">
                  <li>• 5% processing charges apply to all withdrawals</li>
                  <li>• Minimum withdrawal: ₹30</li>
                  <li>• Paytm: ₹30+ | Amazon: ₹100+ | PhonePe: ₹500+</li>
                  <li>• Email verification required for security</li>
                </ul>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            {/* Withdrawal Methods */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Withdrawal Method
              </label>
              
              <div className="grid grid-cols-1 gap-4">
                {WITHDRAWAL_METHODS.map(method => {
                  const IconComponent = method.icon;
                  return (
                    <motion.div
                      key={method.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`
                        p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${selectedMethod === method.id 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <IconComponent className={`h-6 w-6 ${method.color} mr-3`} />
                          <div>
                            <h3 className="font-medium text-gray-900">{method.name}</h3>
                            <p className="text-sm text-gray-500">{method.description}</p>
                            <p className="text-xs font-medium text-gray-700 mt-1">
                              Min: ₹{method.minAmount}
                            </p>
                          </div>
                        </div>
                        {selectedMethod === method.id && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            
            {/* Amount Input */}
            <div className="mb-4">
              <Input
                label="Withdrawal Amount (₹)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                required
                min={MIN_WITHDRAWAL_AMOUNT}
                max={user?.earnings || 0}
                step="0.01"
              />
            </div>

            {/* Charges Breakdown */}
            {withdrawalAmount > 0 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Withdrawal Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Withdrawal Amount:</span>
                    <span className="font-medium">₹{withdrawalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processing Charges (5%):</span>
                    <span className="font-medium text-red-600">-₹{charges.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">You'll Receive:</span>
                      <span className="font-bold text-green-600">₹{finalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Account Details */}
            <div className="mb-6">
              <Input
                label={getAccountDetailsLabel()}
                type={selectedMethod === 'amazon' ? 'email' : 'tel'}
                value={accountDetails}
                onChange={(e) => setAccountDetails(e.target.value)}
                placeholder={getAccountDetailsPlaceholder()}
                required
                disabled={!selectedMethod}
              />
            </div>
            
            {/* Submit Button */}
            <div className="mt-8">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                disabled={
                  !selectedMethod || 
                  !amount || 
                  !accountDetails ||
                  !isValidAmount ||
                  !isValidForMethod
                }
              >
                {isLoading ? 'Processing...' : `Proceed to Email Verification`}
              </Button>
              
              {/* Validation Messages */}
              {amount && !isValidAmount && (
                <p className="mt-2 text-sm text-red-600">
                  {withdrawalAmount < MIN_WITHDRAWAL_AMOUNT 
                    ? `Minimum withdrawal is ₹${MIN_WITHDRAWAL_AMOUNT}`
                    : 'Insufficient balance'
                  }
                </p>
              )}
              
              {amount && selectedMethodData && !isValidForMethod && isValidAmount && (
                <p className="mt-2 text-sm text-red-600">
                  Minimum for {selectedMethodData.name} is ₹{selectedMethodData.minAmount}
                </p>
              )}
            </div>

            {/* Additional History Link at Bottom */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navigate('/withdrawal-history')}
                className="text-blue-600 hover:text-blue-800 text-sm underline flex items-center justify-center mx-auto"
              >
                <History className="h-4 w-4 mr-1" />
                View your withdrawal history and status
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WithdrawEarnings;