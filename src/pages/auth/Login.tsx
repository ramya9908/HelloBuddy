// pages/auth/Login.tsx
import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Key, ArrowRight, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    permanentCode: ''
  });
  const [loginMethod, setLoginMethod] = useState('email');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, loginWithPermanentCode } = useAuth();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleEmailLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
        
    if (!formData.email) {
      toast.error('Please enter your email address');
      return;
    }
        
    try {
      setIsLoading(true);
      const response = await login(formData.email);
      
      if (response?.hasPermanentCode) {
        toast('You have a permanent login code! Use it for instant login.', {
          icon: '💡',
          duration: 4000,
          style: { background: '#3b82f6', color: 'white' },
        });
        setLoginMethod('code');
        return;
      }
      
      toast.success('Verification code sent to your email');
      navigate('/verify-login', { state: { email: formData.email } });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  }, [formData.email, login, navigate]);

  const handlePermanentCodeLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
        
    if (!formData.permanentCode) {
      toast.error('Please enter your 6-digit permanent code');
      return;
    }

    if (formData.permanentCode.length !== 6) {
      toast.error('Permanent code must be 6 digits');
      return;
    }
        
    try {
      setIsLoading(true);
      await loginWithPermanentCode(formData.permanentCode);
      toast.success('Login successful!');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid permanent code');
    } finally {
      setIsLoading(false);
    }
  }, [formData.permanentCode, loginWithPermanentCode, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Earn rewards by engaging with social media posts
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Login Method Toggle */}
          <div className="mb-6">
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'email'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setLoginMethod('email')}
              >
                Email Login
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'code'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setLoginMethod('code')}
              >
                Permanent Code
              </button>
            </div>
          </div>

          {loginMethod === 'email' ? (
            <form className="space-y-6" onSubmit={handleEmailLogin}>
              <Input
                id="email"
                name="email"
                label="Email address"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                autoComplete="email"
                required
                icon={<Mail className="h-5 w-5 text-gray-400" />}
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
              >
                Send verification code
              </Button>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Have a permanent code?</strong> Switch to "Permanent Code" tab for instant login!
                    </p>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handlePermanentCodeLogin}>
              <Input
                id="permanentCode"
                name="permanentCode"
                label="6-Digit Permanent Code"
                type="text"
                value={formData.permanentCode}
                onChange={handleChange}
                placeholder="Enter your 6-digit code"
                maxLength={6}
                required
                icon={<Key className="h-5 w-5 text-gray-400" />}
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                disabled={formData.permanentCode.length !== 6}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Login Instantly
              </Button>

              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex">
                  <Key className="h-5 w-5 text-green-400 mt-0.5" />
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      <strong>Quick Login:</strong> Use the 6-digit code sent to your email after registration.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-700"
                  onClick={() => setLoginMethod('email')}
                >
                  Don't have a permanent code? Use email login
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Don't have an account?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link to="/register">
                <Button variant="outline" fullWidth>
                  Register now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;