import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  UserCheck, 
  UserX, 
  Edit3, 
  Save, 
  X, 
  Trash2,
  TrendingUp
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  instagramId: string;
  batchLetter: string;
  earnings: number;
  isVerified: boolean;
  createdAt: string;
  totalClicks: number;
  likeClicks: number;
  likeCommentClicks: number;
  likeCommentShareClicks: number;
  totalWithdrawals: number;
}

interface EditingUser {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  instagramId: string;
  batchLetter: string;
  earnings: number;
  isVerified: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const usersPerPage = 20;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, batchFilter]);

  useEffect(() => {
    const start = (currentPage - 1) * usersPerPage;
    setTotalPages(Math.ceil(filteredUsers.length / usersPerPage));
  }, [filteredUsers, currentPage]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/admin/users`, {
        withCredentials: true,
      });
      setUsers(response.data.users);
      setFilteredUsers(response.data.users);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let result = [...users];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        user => 
          user.email.toLowerCase().includes(term) ||
          user.fullName.toLowerCase().includes(term) ||
          user.phone.includes(term) ||
          user.instagramId.toLowerCase().includes(term)
      );
    }
    
    if (batchFilter) {
      result = result.filter(user => user.batchLetter === batchFilter);
    }
    
    setFilteredUsers(result);
    setCurrentPage(1);
  };

  const handleToggleVerification = async (userId: number, currentStatus: boolean) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/users/${userId}/toggle-verification`,
        { isVerified: !currentStatus },
        { withCredentials: true }
      );
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isVerified: !user.isVerified } : user
      ));
      
      toast.success(`User ${!currentStatus ? 'verified' : 'unverified'} successfully`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update user verification status');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      instagramId: user.instagramId,
      batchLetter: user.batchLetter,
      earnings: user.earnings,
      isVerified: user.isVerified
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setIsUpdating(true);
      await axios.put(
        `${API_URL}/api/admin/users/${editingUser.id}/update`,
        editingUser,
        { withCredentials: true }
      );

      // Update the user in the local state
      setUsers(users.map(user => 
        user.id === editingUser.id 
          ? { 
              ...user, 
              email: editingUser.email,
              fullName: editingUser.fullName,
              phone: editingUser.phone,
              instagramId: editingUser.instagramId,
              batchLetter: editingUser.batchLetter,
              earnings: editingUser.earnings,
              isVerified: editingUser.isVerified
            } 
          : user
      ));

      setEditingUser(null);
      toast.success('User updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/admin/users/${userId}`, {
        withCredentials: true
      });

      setUsers(users.filter(user => user.id !== userId));
      toast.success('User deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const getPaginatedUsers = () => {
    const start = (currentPage - 1) * usersPerPage;
    const end = start + usersPerPage;
    return filteredUsers.slice(start, end);
  };

  const uniqueBatches = [...new Set(users.map(user => user.batchLetter))].sort();

  // Format click stats as L/L&C/L&C&S
  const getClickStats = (user: User) => {
    if (user.totalClicks === 0) return 'No clicks';
    
    const parts = [];
    if (user.likeClicks > 0) parts.push(`L:${user.likeClicks}`);
    if (user.likeCommentClicks > 0) parts.push(`L&C:${user.likeCommentClicks}`);
    if (user.likeCommentShareClicks > 0) parts.push(`L&C&S:${user.likeCommentShareClicks}`);
    
    return parts.join(' | ') || 'No clicks';
  };

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
              <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Total: {filteredUsers.length} users</span>
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {/* Search and Filter Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg shadow-md p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Users
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, phone, or Instagram ID"
                  className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Batch
              </label>
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Batches</option>
                {uniqueBatches.map(batch => (
                  <option key={batch} value={batch}>Batch {batch}</option>
                ))}
              </select>
            </div>
            
            <div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setBatchFilter('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </motion.div>
        
        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-lg shadow-md overflow-hidden"
        >
          <div className="overflow-x-auto">
            {filteredUsers.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instagram</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Click Stats</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getPaginatedUsers().map((user) => (
                    <tr key={user.id} className={!user.isVerified ? 'bg-gray-50' : ''}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.fullName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {user.phone}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {user.instagramId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {user.batchLetter}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        ₹{user.earnings.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        <div className="font-mono">
                          {getClickStats(user)}
                        </div>
                        <div className="text-gray-400 mt-1">
                          Total: {user.totalClicks}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.isVerified 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleToggleVerification(user.id, user.isVerified)}
                            className={`p-1 rounded ${
                              user.isVerified 
                                ? 'text-yellow-600 hover:bg-yellow-50' 
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={user.isVerified ? 'Unverify' : 'Verify'}
                          >
                            {user.isVerified ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-1 rounded text-blue-600 hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.fullName)}
                            className="p-1 rounded text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-gray-500">
                No users found. Try clearing filters or adding new users.
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <nav className="flex space-x-2" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              
              <div className="px-4 py-1 bg-white border border-gray-300 rounded-md">
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => !isUpdating && setEditingUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
                <button
                  onClick={() => !isUpdating && setEditingUser(null)}
                  disabled={isUpdating}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editingUser.fullName}
                    onChange={(e) => setEditingUser({...editingUser, fullName: e.target.value})}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram ID
                  </label>
                  <input
                    type="text"
                    value={editingUser.instagramId}
                    onChange={(e) => setEditingUser({...editingUser, instagramId: e.target.value})}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Letter
                  </label>
                  <select
                    value={editingUser.batchLetter}
                    onChange={(e) => setEditingUser({...editingUser, batchLetter: e.target.value})}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'].map(letter => (
                      <option key={letter} value={letter}>Batch {letter}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Earnings
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingUser.earnings}
                    onChange={(e) => setEditingUser({...editingUser, earnings: parseFloat(e.target.value) || 0})}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isVerified"
                    checked={editingUser.isVerified}
                    onChange={(e) => setEditingUser({...editingUser, isVerified: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <label htmlFor="isVerified" className="ml-2 text-sm text-gray-700">
                    Verified User
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditingUser(null)}
                  disabled={isUpdating}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateUser}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update User
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;