import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Check, 
  X, 
  Eye,
  Clock,
  User,
  CreditCard,
  DollarSign,
  AlertTriangle,
  Gift,
  Smartphone,
  Wallet,
  Calculator,
  Minus
} from 'lucide-react';
import { API_URL } from '../../utils/constants';

interface Withdrawal {
  id: number;
  userId: number;
  amount: number;
  method: 'paytm' | 'amazon' | 'phonepe';
  accountDetails: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: string;
  processedAt?: string;
  user: {
    name: string;
    email: string;
    batch: string;
  };
}

const WITHDRAWAL_CHARGE_RATE = 0.05; // 5%

const AdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  // Calculate withdrawal charges and final amount
  const calculateCharges = (withdrawalAmount: number) => {
    const charges = withdrawalAmount * WITHDRAWAL_CHARGE_RATE;
    const finalAmount = withdrawalAmount - charges;
    return { charges, finalAmount };
  };

  const fetchWithdrawals = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/admin/withdrawals`, {
        withCredentials: true,
      });
      setWithdrawals(response.data.withdrawals);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load withdrawals');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleProcessWithdrawal = async (withdrawalId: number, status: 'approved' | 'declined') => {
    if (!confirm(`Are you sure you want to ${status === 'approved' ? 'approve' : 'decline'} this withdrawal?`)) {
      return;
    }

    try {
      setProcessingId(withdrawalId);
      await axios.put(
        `${API_URL}/api/admin/withdrawals/${withdrawalId}/process`,
        { 
          status, 
          notes: adminNotes || undefined 
        },
        { withCredentials: true }
      );
      
      toast.success(`Withdrawal ${status} successfully`);
      setAdminNotes('');
      setShowDetailsModal(false);
      setSelectedWithdrawal(null);
      await fetchWithdrawals(); // Refresh the list
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${status} withdrawal`);
    } finally {
      setProcessingId(null);
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
        return <CreditCard className="h-5 w-5 text-gray-600" />;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const openDetailsModal = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setShowDetailsModal(true);
    setAdminNotes('');
  };

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const processedWithdrawals = withdrawals.filter(w => w.status !== 'pending');

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link to="/admin" className="text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Withdrawal Requests</h1>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {pendingWithdrawals.length} pending
              </span>
              <span>Total: {withdrawals.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Charges Info Banner */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <Calculator className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
            <div>
              <p className="text-blue-800 font-medium">Processing Charges: 5%</p>
              <p className="text-sm text-blue-700 mt-1">
                All withdrawal amounts include 5% processing charges that have been pre-deducted. 
                The "Amount to Pay" is what should be transferred to the user.
              </p>
            </div>
          </div>
        </div>

        {/* Pending Withdrawals */}
        {pendingWithdrawals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Pending Approval</h2>
              <span className="ml-2 bg-yellow-100 text-yellow-800 text-sm px-2 py-1 rounded-full">
                {pendingWithdrawals.length}
              </span>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount Breakdown</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Details</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingWithdrawals.map((withdrawal) => {
                      const { charges, finalAmount } = calculateCharges(withdrawal.amount);
                      return (
                        <tr key={withdrawal.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {withdrawal.user.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {withdrawal.user.email}
                                </div>
                                <div className="text-xs text-gray-400">
                                  Batch {withdrawal.user.batch}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <span className="w-20">Requested:</span>
                                <span className="font-medium">₹{withdrawal.amount.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center text-sm text-red-600">
                                <Minus className="h-3 w-3 mr-1" />
                                <span className="w-16">Charges:</span>
                                <span>₹{charges.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center text-lg font-bold text-green-600 border-t pt-1">
                                <span className="w-20 text-sm">Pay:</span>
                                <span>₹{finalAmount.toFixed(2)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              {getMethodIcon(withdrawal.method)}
                              <span className="ml-2 text-sm text-gray-900">
                                {getMethodName(withdrawal.method)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-mono">
                              {withdrawal.accountDetails}
                            </div>
                            <div className="text-xs text-gray-500">
                              {withdrawal.method === 'amazon' ? 'Email' : 'Phone Number'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {new Date(withdrawal.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => openDetailsModal(withdrawal)}
                                className="p-1 rounded text-blue-600 hover:bg-blue-50"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleProcessWithdrawal(withdrawal.id, 'approved')}
                                disabled={processingId === withdrawal.id}
                                className="p-1 rounded text-green-600 hover:bg-green-50 disabled:opacity-50"
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleProcessWithdrawal(withdrawal.id, 'declined')}
                                disabled={processingId === withdrawal.id}
                                className="p-1 rounded text-red-600 hover:bg-red-50 disabled:opacity-50"
                                title="Decline"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Processed Withdrawals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Processed Withdrawals</h2>
          
          {processedWithdrawals.length > 0 ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount Breakdown</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Processed</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {processedWithdrawals.map((withdrawal) => {
                      const { charges, finalAmount } = calculateCharges(withdrawal.amount);
                      return (
                        <tr key={withdrawal.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {withdrawal.user.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Batch {withdrawal.user.batch}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <span className="w-20">Requested:</span>
                                <span>₹{withdrawal.amount.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center text-sm text-red-600">
                                <Minus className="h-3 w-3 mr-1" />
                                <span className="w-16">Charges:</span>
                                <span>₹{charges.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center font-semibold text-green-600">
                                <span className="w-20 text-sm">
                                  {withdrawal.status === 'approved' ? 'Paid:' : 'Refunded:'}
                                </span>
                                <span>
                                  ₹{withdrawal.status === 'approved' ? finalAmount.toFixed(2) : withdrawal.amount.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              {getMethodIcon(withdrawal.method)}
                              <span className="ml-2 text-sm text-gray-900">
                                {getMethodName(withdrawal.method)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                              {withdrawal.status === 'approved' ? 'Approved' : 'Declined'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {withdrawal.processedAt ? new Date(withdrawal.processedAt).toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <button
                              onClick={() => openDetailsModal(withdrawal)}
                              className="p-1 rounded text-blue-600 hover:bg-blue-50"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
              No processed withdrawals yet.
            </div>
          )}
        </motion.div>

        {/* No withdrawals message */}
        {withdrawals.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No withdrawal requests</h3>
            <p className="text-gray-600">Withdrawal requests will appear here when users submit them.</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedWithdrawal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowDetailsModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Withdrawal Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* User Info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">User Information</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Name:</strong> {selectedWithdrawal.user.name}</div>
                  <div><strong>Email:</strong> {selectedWithdrawal.user.email}</div>
                  <div><strong>Batch:</strong> {selectedWithdrawal.user.batch}</div>
                </div>
              </div>

              {/* Withdrawal Info */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Withdrawal Information</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Requested Amount:</strong> ₹{selectedWithdrawal.amount.toFixed(2)}</div>
                  <div><strong>Processing Charges (5%):</strong> 
                    <span className="text-red-600"> -₹{calculateCharges(selectedWithdrawal.amount).charges.toFixed(2)}</span>
                  </div>
                  <div><strong>Amount to Pay:</strong> 
                    <span className="text-green-600 font-semibold"> ₹{calculateCharges(selectedWithdrawal.amount).finalAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div><strong>Method:</strong> {getMethodName(selectedWithdrawal.method)}</div>
                    <div><strong>Account Details:</strong> {selectedWithdrawal.accountDetails}</div>
                    <div><strong>Status:</strong> 
                      <span className={`ml-1 px-2 py-0.5 rounded text-xs ${getStatusColor(selectedWithdrawal.status)}`}>
                        {selectedWithdrawal.status}
                      </span>
                    </div>
                    <div><strong>Requested:</strong> {new Date(selectedWithdrawal.createdAt).toLocaleString()}</div>
                    {selectedWithdrawal.processedAt && (
                      <div><strong>Processed:</strong> {new Date(selectedWithdrawal.processedAt).toLocaleString()}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin Notes (for pending withdrawals) */}
              {selectedWithdrawal.status === 'pending' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add any notes about this withdrawal..."
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Action Buttons (for pending withdrawals) */}
            {selectedWithdrawal.status === 'pending' && (
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => handleProcessWithdrawal(selectedWithdrawal.id, 'declined')}
                  disabled={processingId === selectedWithdrawal.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {processingId === selectedWithdrawal.id ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Decline & Refund
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleProcessWithdrawal(selectedWithdrawal.id, 'approved')}
                  disabled={processingId === selectedWithdrawal.id}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                >
                  {processingId === selectedWithdrawal.id ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Approve & Pay ₹{calculateCharges(selectedWithdrawal.amount).finalAmount.toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminWithdrawals;