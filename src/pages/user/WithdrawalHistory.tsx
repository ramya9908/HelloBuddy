// pages/user/WithdrawalHistory.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle,
  Gift,
  Smartphone,
  Wallet,
  History,
  DollarSign
} from 'lucide-react';
import { API_URL } from '../../utils/constants';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/common/Header';

interface UserWithdrawal {
  id: number;
  amount: number;
  method: 'paytm' | 'amazon' | 'phonepe';
  accountDetails: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: string;
  processedAt?: string;
  adminNotes?: string;
}

const WithdrawalHistory = () => {
  const [withdrawals, setWithdrawals] = useState<UserWithdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchWithdrawals = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/user/withdrawals`, {
        withCredentials: true,
      });
      setWithdrawals(response.data.withdrawals);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load withdrawal history');
    } finally {
      setIsLoading(false);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'paytm':
        return <Wallet className="h-5 w-5 text-blue-600" />;
      case 'amazon':
        return <Gift className="h-5 w-5 text-orange-600" />;
      case 'phonepe':
        return <Smartphone className="h-5 w-5 text-purple-600" />;
      default:
        return <DollarSign className="h-5 w-5 text-gray-600" />;
    }
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'paytm':
        return 'Paytm Wallet';
      case 'amazon':
        return 'Amazon Gift Card';
      case 'phonepe':
        return 'PhonePe';
      default:
        return method;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'declined':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'approved':
        return 'Approved & Paid';
      case 'declined':
        return 'Declined & Refunded';
      default:
        return status;
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center">
          <button 
            onClick={() => navigate('/dashboard')}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <History className="h-6 w-6 mr-2" />
            Withdrawal History
          </h1>
        </div>

        {/* Current Balance */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-blue-800 font-medium">Current Balance</p>
            <p className="text-2xl font-bold text-blue-700">₹{user?.earnings.toFixed(2)}</p>
          </div>
          <button
            onClick={() => navigate('/withdraw')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            New Withdrawal
          </button>
        </div>
        
        {withdrawals.length > 0 ? (
          <div className="space-y-4">
            {withdrawals.map((withdrawal) => (
              <motion.div
                key={withdrawal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {getMethodIcon(withdrawal.method)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          ₹{withdrawal.amount.toFixed(2)}
                        </h3>
                        <div className={`flex items-center px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(withdrawal.status)}`}>
                          {getStatusIcon(withdrawal.status)}
                          <span className="ml-1">{getStatusText(withdrawal.status)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Method:</span>
                          {getMethodName(withdrawal.method)}
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Account:</span>
                          <span className="font-mono">{withdrawal.accountDetails}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Requested:</span>
                          {new Date(withdrawal.createdAt).toLocaleString()}
                        </div>
                        {withdrawal.processedAt && (
                          <div className="flex items-center">
                            <span className="font-medium mr-2">Processed:</span>
                            {new Date(withdrawal.processedAt).toLocaleString()}
                          </div>
                        )}
                      </div>

                      {withdrawal.adminNotes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 mb-1">Admin Notes:</p>
                          <p className="text-sm text-gray-600">{withdrawal.adminNotes}</p>
                        </div>
                      )}

                      {withdrawal.status === 'pending' && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <Clock className="h-4 w-4 inline mr-1" />
                            Your withdrawal request is being reviewed. You'll be notified once it's processed.
                          </p>
                        </div>
                      )}

                      {withdrawal.status === 'declined' && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                          <p className="text-sm text-red-800">
                            <XCircle className="h-4 w-4 inline mr-1" />
                            This withdrawal was declined and the amount has been refunded to your wallet.
                          </p>
                        </div>
                      )}

                      {withdrawal.status === 'approved' && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-800">
                            <CheckCircle className="h-4 w-4 inline mr-1" />
                            Payment has been processed and sent to your {getMethodName(withdrawal.method)} account.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-md p-8 text-center"
          >
            <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No withdrawal history</h3>
            <p className="text-gray-600 mb-6">You haven't made any withdrawal requests yet.</p>
            <button
              onClick={() => navigate('/withdraw')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Make Your First Withdrawal
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default WithdrawalHistory;