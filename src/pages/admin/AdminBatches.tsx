import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../../utils/constants';
import Button from '../../components/common/Button';
import LoadingScreen from '../../components/common/LoadingScreen';

interface Batch {
  letter: string;
  userCount: number;
  isActive: boolean;
}

const AdminBatches = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/admin/batches`, {
        withCredentials: true,
      });
      setBatches(response.data.batches);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load batches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBatchStatus = async (batchLetter: string, currentStatus: boolean) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/batches/${batchLetter}/toggle-status`,
        { isActive: !currentStatus },
        { withCredentials: true }
      );
      
      setBatches(batches.map(batch => 
        batch.letter === batchLetter ? { ...batch, isActive: !batch.isActive } : batch
      ));
      
      toast.success(`Batch ${batchLetter} ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update batch status');
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center">
            <Link to="/admin" className="text-gray-600 hover:text-gray-900 mr-4">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Manage Batches</h1>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg shadow-md p-6 mb-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Batch Information</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchBatches}
            >
              Refresh
            </Button>
          </div>
          
          <p className="text-gray-600 mb-4">
            Users are automatically assigned to batches of 1000 users each. 
            Batches can be targeted for specific posts or deactivated if needed.
          </p>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">
                Current active batch: {batches.find(b => b.isActive && b.userCount < 1000)?.letter || 'None'}
              </span>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-lg shadow-md overflow-hidden"
        >
          <div className="overflow-x-auto">
            {batches.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {batches.map((batch) => (
                    <tr key={batch.letter} className={!batch.isActive ? 'bg-gray-50' : ''}>
                      <td className="px-4 py-3 whitespace-nowrap text-lg font-medium text-gray-900">
                        {batch.letter}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {batch.userCount}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="w-48 bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${(batch.userCount / 1000) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {((batch.userCount / 1000) * 100).toFixed(1)}% full
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          batch.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {batch.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleToggleBatchStatus(batch.letter, batch.isActive)}
                          className={`p-1 rounded ${
                            batch.isActive 
                              ? 'text-yellow-600 hover:bg-yellow-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={batch.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {batch.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-gray-500">
                No batches available yet. Batches will be created as users register.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminBatches;