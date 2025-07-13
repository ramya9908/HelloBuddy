import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Phone, Instagram, AlertCircle, Globe, MapPin, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    instagramId: '',
    // Optional fields
    facebookId: '',
    twitterId: '',
    linkedinId: '',
    city: '',
    dateOfBirth: '',
    website: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    instagramId: ''
  });
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear field error when user starts typing
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {
      email: '',
      instagramId: ''
    };

    // Basic validation for required fields
    if (!formData.email || !formData.fullName || !formData.phone || !formData.instagramId) {
      toast.error('Please fill in all required fields');
      return false;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Instagram ID validation (alphanumeric, dots, underscores)
    const instagramRegex = /^[a-zA-Z0-9._]+$/;
    if (!instagramRegex.test(formData.instagramId)) {
      errors.instagramId = 'Instagram username can only contain letters, numbers, dots, and underscores';
    }

    // Optional field validations
    if (formData.facebookId && !/^[a-zA-Z0-9._]+$/.test(formData.facebookId)) {
      toast.error('Facebook username can only contain letters, numbers, dots, and underscores');
      return false;
    }

    if (formData.twitterId && !/^[a-zA-Z0-9._]+$/.test(formData.twitterId)) {
      toast.error('Twitter username can only contain letters, numbers, dots, and underscores');
      return false;
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      toast.error('Website must be a valid URL starting with http:// or https://');
      return false;
    }

    // Check if there are any errors
    if (errors.email || errors.instagramId) {
      setFieldErrors(errors);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form first
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      setFieldErrors({ email: '', instagramId: '' });
      
      // Filter out empty optional fields
      const submissionData = {
        ...formData,
        facebookId: formData.facebookId.trim() || null,
        twitterId: formData.twitterId.trim() || null,
        linkedinId: formData.linkedinId.trim() || null,
        city: formData.city.trim() || null,
        dateOfBirth: formData.dateOfBirth || null,
        website: formData.website.trim() || null
      };
      
      await register(submissionData);
      toast.success('Registration successful! Please verify your email');
      navigate('/verify-email', { state: { email: formData.email } });
    } catch (error: any) {
      console.error('Registration error:', error);
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Registration failed';
      
      // Handle specific validation errors from backend
      if (error.response?.status === 400) {
        if (errorMessage.toLowerCase().includes('email')) {
          if (errorMessage.toLowerCase().includes('already') || errorMessage.toLowerCase().includes('exists')) {
            setFieldErrors(prev => ({ ...prev, email: 'Email address is already registered' }));
            toast.error('Email address is already registered');
          } else {
            setFieldErrors(prev => ({ ...prev, email: errorMessage }));
            toast.error(errorMessage);
          }
        } else if (errorMessage.toLowerCase().includes('instagram')) {
          if (errorMessage.toLowerCase().includes('already') || errorMessage.toLowerCase().includes('exists')) {
            setFieldErrors(prev => ({ ...prev, instagramId: 'Instagram username is already taken' }));
            toast.error('Instagram username is already taken');
          } else {
            setFieldErrors(prev => ({ ...prev, instagramId: errorMessage }));
            toast.error(errorMessage);
          }
        } else {
          toast.error(errorMessage);
        }
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Start earning rewards through social media engagement
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Required Fields */}
            <div>
              <Input
                id="email"
                name="email"
                label="Email address *"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Your email address"
                autoComplete="email"
                required
                icon={<Mail className="h-5 w-5 text-gray-400" />}
                className={fieldErrors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
              />
              {fieldErrors.email && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 flex items-center text-sm text-red-600"
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {fieldErrors.email}
                </motion.div>
              )}
            </div>

            <Input
              id="fullName"
              name="fullName"
              label="Full name *"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Your full name"
              autoComplete="name"
              required
              icon={<User className="h-5 w-5 text-gray-400" />}
            />

            <Input
              id="phone"
              name="phone"
              label="Phone number *"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Your phone number"
              autoComplete="tel"
              required
              icon={<Phone className="h-5 w-5 text-gray-400" />}
            />

            <div>
              <Input
                id="instagramId"
                name="instagramId"
                label="Instagram username *"
                type="text"
                value={formData.instagramId}
                onChange={handleChange}
                placeholder="Your Instagram username (without @)"
                required
                icon={<Instagram className="h-5 w-5 text-gray-400" />}
                className={fieldErrors.instagramId ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
              />
              {fieldErrors.instagramId && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 flex items-center text-sm text-red-600"
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {fieldErrors.instagramId}
                </motion.div>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Enter your Instagram username without the @ symbol
              </p>
            </div>

            {/* Optional Fields Toggle */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showOptionalFields ? 'Hide' : 'Show'} additional profile information (optional)
                <motion.div
                  animate={{ rotate: showOptionalFields ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-1"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.div>
              </button>
            </div>

            {/* Optional Fields */}
            <motion.div
              initial={false}
              animate={{ 
                height: showOptionalFields ? 'auto' : 0,
                opacity: showOptionalFields ? 1 : 0
              }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {showOptionalFields && (
                <div className="space-y-4 pt-4">
                  <div className="text-sm text-gray-600 mb-4">
                    <p className="font-medium">Additional Social Media Profiles</p>
                    <p className="text-xs">Add your other social media accounts to increase your earning opportunities</p>
                  </div>

                  <Input
                    id="facebookId"
                    name="facebookId"
                    label="Medium username"
                    type="text"
                    value={formData.facebookId}
                    onChange={handleChange}
                    placeholder="Your Facebook username (optional)"
                    icon={<Globe className="h-5 w-5 text-gray-400" />}
                  />

                  <Input
                    id="twitterId"
                    name="twitterId"
                    label="Twitter/X username"
                    type="text"
                    value={formData.twitterId}
                    onChange={handleChange}
                    placeholder="Your Twitter username (optional)"
                    icon={<Globe className="h-5 w-5 text-gray-400" />}
                  />

                  <Input
                    id="linkedinId"
                    name="linkedinId"
                    label="Dev.too Id"
                    type="text"
                    value={formData.linkedinId}
                    onChange={handleChange}
                    placeholder="Your LinkedIn username (optional)"
                    icon={<Globe className="h-5 w-5 text-gray-400" />}
                  />

                  <div className="text-sm text-gray-600 mb-4 pt-4 border-t border-gray-100">
                    <p className="font-medium">Personal Information</p>
                    <p className="text-xs">Help us personalize your experience</p>
                  </div>

                  <Input
                    id="city"
                    name="city"
                    label="City"
                    type="text"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Your city (optional)"
                    icon={<MapPin className="h-5 w-5 text-gray-400" />}
                  />

                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    label="Date of Birth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    icon={<Calendar className="h-5 w-5 text-gray-400" />}
                  />

                  <Input
                    id="website"
                    name="website"
                    label="Personal Website"
                    type="url"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://yourwebsite.com (optional)"
                    icon={<Globe className="h-5 w-5 text-gray-400" />}
                  />
                </div>
              )}
            </motion.div>

            <Button 
              type="submit" 
              variant="primary" 
              fullWidth 
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Register'}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Already have an account?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link to="/login">
                <Button variant="outline" fullWidth>
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;