// pages/admin/AdminDashboard.tsx
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Users, FileText, MousePointerClick, DollarSign, LogOut, RefreshCw } from 'lucide-react';
import { API_URL } from '../../utils/constants';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import LoadingScreen from '../../components/common/LoadingScreen';

interface AnalyticsData {
  totalUsers: number;
  totalPosts: number;
  totalClicks: number;
  totalEarnings: number;
  usersByBatch: {
    batchLetter: string;
    count: number;
  }[];
  recentPosts: {
    id: number;
    title: string;
    engagementType: string;
    clickCount: number;
  }[];
  engagementStats: {
    engagement_type: string;
    post_count: number;
    total_clicks: number;
  }[];
}

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_URL}/api/admin/analytics`, {
        withCredentials: true,
        timeout: 10000
      });
      
      if (response.data && typeof response.data === 'object') {
        const data: AnalyticsData = {
          totalUsers: response.data.totalUsers || 0,
          totalPosts: response.data.totalPosts || 0,
          totalClicks: response.data.totalClicks || 0,
          totalEarnings: response.data.totalEarnings || 0,
          usersByBatch: response.data.usersByBatch || [],
          recentPosts: response.data.recentPosts || [],
          engagementStats: response.data.engagementStats || []
        };
        
        setAnalytics(data);
      } else {
        throw new Error('Invalid analytics data format');
      }
      
    } catch (error: any) {
      console.error('Analytics fetch error:', error);
      setError(error.response?.data?.message || 'Failed to load analytics');
      toast.error(error.response?.data?.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout?')) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-blue-600">SocialEarn Admin</h1>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
              <p className="text-gray-700 mb-4">{error}</p>
              <button
                onClick={fetchAnalytics}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-blue-600">SocialEarn Admin</h1>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-700">No analytics data available. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-600">SocialEarn Admin</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchAnalytics}
                className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <div className="text-gray-700 hidden sm:block">
                Logged in as <span className="font-medium">{user?.fullName || user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalUsers}</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Total Posts</h3>
                  <FileText className="h-5 w-5 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalPosts}</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Total Clicks</h3>
                  <MousePointerClick className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalClicks}</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Total Earnings</h3>
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">₹{analytics.totalEarnings.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Recent Posts */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Posts</h2>
                <Link 
                  to="/admin/posts" 
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  View All
                </Link>
              </div>
              
              {analytics.recentPosts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analytics.recentPosts.map((post) => (
                        <tr key={post.id}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            <div className="max-w-xs truncate">{post.title}</div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                            {post.engagementType === 'like' 
                              ? 'Like Only' 
                              : post.engagementType === 'like_comment' 
                                ? 'Like & Comment' 
                                : 'Like, Comment & Share'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{post.clickCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No posts available.</p>
              )}
            </div>

            {/* Engagement Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Engagement Type Breakdown</h2>
              
              {analytics.engagementStats.length > 0 ? (
                <div className="space-y-4">
                  {analytics.engagementStats.map((stat) => (
                    <div key={stat.engagement_type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {stat.engagement_type === 'like' 
                            ? 'Like Only' 
                            : stat.engagement_type === 'like_comment' 
                              ? 'Like & Comment' 
                              : 'Like, Comment & Share'}
                        </h3>
                        <p className="text-sm text-gray-600">{stat.post_count} posts</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">{stat.total_clicks}</p>
                        <p className="text-sm text-gray-600">total clicks</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No engagement data available.</p>
              )}
            </div>
          </div>
          
          <div className="lg:col-span-1">
            {/* Users by Batch */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Users by Batch</h2>
                <Link 
                  to="/admin/batches" 
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Manage
                </Link>
              </div>
              
              {analytics.usersByBatch.length > 0 ? (
                <div className="space-y-3">
                  {analytics.usersByBatch.slice(0, 10).map((batchData) => (
                    <div key={batchData.batchLetter} className="flex items-center">
                      <div className="w-10 text-center font-medium">
                        {batchData.batchLetter}
                      </div>
                      <div className="flex-1 ml-2">
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-4 bg-blue-600 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min(100, Math.max(5, (batchData.count / Math.max(analytics.totalUsers / 10, 1)) * 100))}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="w-16 text-right text-sm font-medium">
                        {batchData.count}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No batch data available.</p>
              )}
            </div>
            
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              
              <div className="space-y-3">
                <Link 
                  to="/admin/posts" 
                  className="block w-full py-2 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors text-center"
                >
                  Manage Posts
                </Link>
                
                <Link 
                  to="/admin/users" 
                  className="block w-full py-2 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors text-center"
                >
                  Manage Users
                </Link>
                
                <Link 
                  to="/admin/batches" 
                  className="block w-full py-2 px-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors text-center"
                >
                  Manage Batches
                </Link>

                <Link 
                  to="/admin/withdrawals" 
                  className="block w-full py-2 px-4 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg transition-colors text-center"
                >
                  View Withdrawals
                </Link>

                {/* Logout Button in Quick Actions */}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="block w-full py-2 px-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors text-center disabled:opacity-50"
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;