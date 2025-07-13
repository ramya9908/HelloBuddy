// src/pages/admin/AdminPosts.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Trash2, AlertTriangle, Target } from 'lucide-react';
import { API_URL } from '../../utils/constants';
import CreatePostForm from '../../components/admin/CreatePostForm';
import Button from '../../components/common/Button';
import LoadingScreen from '../../components/common/LoadingScreen';

interface Post {
  id: number;
  title: string;
  socialLink: string;
  engagementType: string;
  rewardAmount: number;
  targetBatches: string[];
  isActive: boolean;
  clickCount: number;
  clickLimit?: number;
  autoDeleteEnabled?: boolean;
  createdAt: string;
}

interface Batch {
  letter: string;
  userCount: number;
  isActive: boolean;
}

const AdminPosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [postsResponse, batchesResponse] = await Promise.all([
        axios.get(`${API_URL}/api/admin/posts`, { 
          withCredentials: true,
          timeout: 10000 
        }),
        axios.get(`${API_URL}/api/admin/batches`, { 
          withCredentials: true,
          timeout: 10000 
        }),
      ]);
      setPosts(postsResponse.data.posts);
      setBatches(batchesResponse.data.batches);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTogglePostStatus = useCallback(async (postId: number, currentStatus: boolean) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/posts/${postId}/toggle-status`,
        { isActive: !currentStatus },
        { withCredentials: true }
      );
      
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, isActive: !post.isActive } : post
      ));
      
      toast.success(`Post ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update post status');
    }
  }, [posts]);

  const handleDeletePost = useCallback(async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/api/admin/posts/${postId}`, {
        withCredentials: true,
      });
      
      setPosts(posts.filter(post => post.id !== postId));
      toast.success('Post deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete post');
    }
  }, [posts]);

  const handlePostCreated = useCallback(() => {
    fetchData();
    setShowCreateForm(false);
  }, [fetchData]);

  // Calculate click progress for posts with limits
  const getClickProgress = useCallback((post: Post) => {
    if (!post.autoDeleteEnabled || !post.clickLimit) return null;
    
    const progress = (post.clickCount / post.clickLimit) * 100;
    const remaining = post.clickLimit - post.clickCount;
    
    return {
      progress: Math.min(progress, 100),
      remaining: Math.max(remaining, 0),
      isNearLimit: remaining <= 50,
      isOverLimit: post.clickCount > post.clickLimit
    };
  }, []);

  // Memoized posts with warnings
  const postsWithWarnings = useMemo(() => {
    return posts.map(post => ({
      ...post,
      clickProgress: getClickProgress(post)
    }));
  }, [posts, getClickProgress]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center">
            <Link to="/admin" className="text-gray-600 hover:text-gray-900 mr-4 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Manage Posts</h1>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant={showCreateForm ? 'outline' : 'primary'}
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancel' : 'Create New Post'}
          </Button>
        </div>
        
        {showCreateForm && (
          <div className="mb-8">
            <CreatePostForm 
              batches={batches} 
              onPostCreated={handlePostCreated}
            />
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            {postsWithWarnings.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reward</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Batches</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks/Limit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {postsWithWarnings.map((post) => (
                    <tr key={post.id} className={!post.isActive ? 'bg-gray-50' : ''}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="max-w-xs truncate">{post.title}</div>
                        {post.clickProgress?.isNearLimit && (
                          <div className="flex items-center mt-1">
                            <AlertTriangle className="h-3 w-3 text-orange-500 mr-1" />
                            <span className="text-xs text-orange-600">Near limit</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {post.engagementType === 'like' 
                          ? 'Like Only' 
                          : post.engagementType === 'like_comment' 
                            ? 'Like & Comment' 
                            : 'Like, Comment & Share'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        ₹{post.rewardAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {post.targetBatches.map((batch) => (
                            <span 
                              key={batch} 
                              className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs"
                            >
                              {batch}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <span className={post.clickProgress?.isNearLimit ? 'text-orange-600 font-semibold' : ''}>
                              {post.clickCount}
                            </span>
                            {post.autoDeleteEnabled && post.clickLimit && (
                              <>
                                <span className="mx-1">/</span>
                                <span className="text-gray-500">{post.clickLimit}</span>
                                <Target className="h-3 w-3 text-blue-500 ml-1" />
                              </>
                            )}
                            {!post.autoDeleteEnabled && (
                              <span className="ml-1 text-gray-400">(∞)</span>
                            )}
                          </div>
                          {post.clickProgress && (
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div 
                                className={`h-1 rounded-full transition-all ${
                                  post.clickProgress.isNearLimit 
                                    ? 'bg-orange-500' 
                                    : 'bg-blue-500'
                                }`}
                                style={{ width: `${post.clickProgress.progress}%` }}
                              ></div>
                            </div>
                          )}
                          {post.clickProgress?.remaining !== undefined && (
                            <div className="text-xs text-gray-500">
                              {post.clickProgress.remaining} remaining
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="space-y-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            post.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {post.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {post.autoDeleteEnabled && (
                            <div className="text-xs text-blue-600">Auto-delete</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleTogglePostStatus(post.id, post.isActive)}
                            className={`p-1 rounded transition-colors ${
                              post.isActive 
                                ? 'text-yellow-600 hover:bg-yellow-50' 
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={post.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {post.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors"
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
                No posts available. Create your first post!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPosts;