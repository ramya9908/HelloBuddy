import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Mail, Key, Sparkles, ArrowRight } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_URL } from '../../utils/constants';
import Button from '../../components/common/Button';

const VerifyEmail = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [permanentCodeSent, setPermanentCodeSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [countdown, setCountdown] = useState(3);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  useEffect(() => {
    if (!email) {
      navigate('/register');
      return;
    }

    // Timer countdown
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, navigate]);

  // Countdown timer for redirect after verification
  useEffect(() => {
    if (isVerified && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isVerified && countdown === 0) {
      navigate('/login');
    }
  }, [isVerified, countdown, navigate]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace to focus previous input
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const verificationCode = code.join('');
    
    if (verificationCode.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await axios.post(
        `${API_URL}/api/auth/verify-email`,
        { email, code: verificationCode },
        { withCredentials: true }
      );
      
      setIsVerified(true);
      // Fix: Use the response data properly
      setPermanentCodeSent(response.data?.permanentCodeSent || false);
      
      toast.success('Email verified successfully!');
      
      // Start countdown for redirect
      setCountdown(5);
      
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setIsLoading(true);
      await axios.post(
        `${API_URL}/api/auth/resend-verification`,
        { email },
        { withCredentials: true }
      );
      setTimeLeft(900); // Reset timer
      toast.success('A new verification code has been sent to your email');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Success screen after verification
  if (isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
          className="sm:mx-auto sm:w-full sm:max-w-lg"
        >
          <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
            {/* Success Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: "spring", bounce: 0.5 }}
              className="text-center mb-6"
            >
              <div className="relative inline-block">
                <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="h-8 w-8 text-yellow-400" />
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                🎉 Registration Complete!
              </h2>
              <p className="text-gray-600 mb-6 text-lg">
                Your email has been verified successfully.
              </p>
            </motion.div>
            
            {/* Permanent Code Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200 mb-6"
            >
              <div className="flex items-center justify-center mb-3">
                <Key className="h-6 w-6 text-blue-600 mr-2" />
                <span className="font-bold text-blue-800 text-lg">Important!</span>
              </div>
              <div className="text-center">
                <p className="text-sm text-blue-700 mb-2">
                  A <strong className="text-blue-900">permanent 6-digit login code</strong> has been sent to your email!
                </p>
                <div className="bg-white/70 p-3 rounded-lg mb-3">
                  <p className="text-xs text-blue-600 font-medium">
                    📧 Check your email: <span className="font-bold">{email}</span>
                  </p>
                </div>
                {permanentCodeSent ? (
                  <div className="flex items-center justify-center text-xs text-green-600 mb-2">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Permanent code email sent successfully!
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-xs text-yellow-600 mb-2">
                    <Mail className="h-3 w-3 mr-1" />
                    Permanent code email is being sent...
                  </div>
                )}
                <p className="text-xs text-blue-600">
                  💡 Save this code - you can use it for <strong>instant login</strong> without email verification!
                </p>
              </div>
            </motion.div>

            {/* Benefits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="bg-green-50 p-4 rounded-lg border border-green-200 mb-6"
            >
              <h3 className="text-sm font-bold text-green-800 mb-2 flex items-center">
                <Sparkles className="h-4 w-4 mr-1" />
                What's Next?
              </h3>
              <ul className="text-xs text-green-700 space-y-1">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Login instantly with your permanent code
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Start engaging with social media posts
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Earn rewards for every interaction
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Withdraw earnings to your account
                </li>
              </ul>
            </motion.div>

            {/* Redirect countdown */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="text-center space-y-4"
            >
              <p className="text-sm text-gray-500">
                Redirecting to login page in <span className="font-bold text-blue-600">{countdown}</span> seconds...
              </p>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => navigate('/login')} 
                  variant="primary"
                  fullWidth
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Go to Login Now
                </Button>
                
                <button
                  onClick={() => setCountdown(0)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cancel auto-redirect
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main verification form
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring", bounce: 0.3 }}
          >
            <Mail className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          </motion.div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Verify your email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter the 6-digit code sent to <span className="font-medium text-blue-600">{email}</span>
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit}>
            <div className="flex justify-center space-x-2 mb-6">
              {code.map((digit, index) => (
                <motion.input
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  id={`code-${index}`}
                  type="text"
                  maxLength={1}
                  className="w-12 h-12 text-center text-xl font-semibold border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 hover:border-blue-400"
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <div className="text-center mb-6">
              <p className="text-sm text-gray-500">
                Code expires in <span className="font-medium text-red-600">{formatTime(timeLeft)}</span>
              </p>
              {timeLeft <= 60 && (
                <p className="text-xs text-red-500 mt-1 animate-pulse">
                  ⚠️ Code expiring soon!
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              fullWidth 
              isLoading={isLoading}
              disabled={code.join('').length !== 6}
              className="transition-all duration-200 hover:scale-105"
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </Button>

            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                onClick={handleResendCode}
                disabled={timeLeft > 0 || isLoading}
              >
                {timeLeft > 0 ? `Resend code in ${formatTime(timeLeft)}` : 'Resend code'}
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
              <Sparkles className="h-4 w-4 mr-1" />
              What happens next?
            </h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 mt-1 flex-shrink-0"></span>
                Email verification will be completed
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 mt-1 flex-shrink-0"></span>
                You'll receive a permanent 6-digit login code
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 mt-1 flex-shrink-0"></span>
                Use this code for instant future logins
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 mt-1 flex-shrink-0"></span>
                Start earning rewards immediately!
              </li>
            </ul>
          </div>

          {/* Help section */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Didn't receive the code? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;