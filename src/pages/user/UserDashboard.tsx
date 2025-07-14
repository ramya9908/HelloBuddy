import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Info, LogOut, User, Wallet, ChevronDown, ChevronUp, Settings, Edit2, Save, X, Globe, MapPin, Calendar, Instagram, Phone, Mail, Crown, MessageCircle, Share2, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Post {
  id: number;
  title: string;
  socialLink: string;
  engagementType: 'like' | 'like_comment' | 'like_comment_share' | 'vip';
  rewardAmount: number;
  postMessage?: string;
}

interface ClickedPost {
  postId: number;
  clickedAt: number;
  status: 'approved' | 'rejected';
}

interface User {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  instagramId: string;
  facebookId?: string;
  twitterId?: string;
  linkedinId?: string;
  city?: string;
  dateOfBirth?: string;
  website?: string;
  batchLetter: string;
  earnings: number;
  createdAt: string;
}
// change if backend deploy changes in env file with api url
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Post section configurations
const POST_SECTIONS = {
  like: {
    title: 'Standard Tasks',
    icon: Heart,
    color: 'blue',
    emoji: '👍',
    description: 'LIKE FOR THE POSTS TO EARN REWARDS'
  },
  like_comment: {
    title: 'Engagement Tasks',
    icon: MessageCircle,
    color: 'purple',
    emoji: '👍💬',
    description: 'LIKE AND COMMENT FOR THE POSTS TO EARN REWARDS'
  },
  like_comment_share: {
    title: 'Premium Tasks',
    icon: Share2,
    color: 'green',
    emoji: '👍💬🔄',
    description: 'LIKE AND COMMENT AND SHARE FOR THE POSTS TO EARN REWARDS'
  },
  vip: {
    title: 'VIP Exclusive',
    icon: Crown,
    color: 'yellow',
    emoji: '👑',
    description: 'Special VIP tasks with premium rewards'
  }
};

const UserDashboard = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingPost, setProcessingPost] = useState<number | null>(null);
  const [clickedPosts, setClickedPosts] = useState<ClickedPost[]>([]);
  const [userEarnings, setUserEarnings] = useState<number>(0);
  const [user, setUser] = useState<User | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState<Partial<User>>({});
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const navigate = useNavigate();

  // Initialize user earnings when user loads
  useEffect(() => {
    if (user?.earnings) {
      setUserEarnings(user.earnings);
    }
  }, [user?.earnings]);

  // Function to refresh user earnings using session auth
  const refreshUserData = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/user/profile`, {
        withCredentials: true // This will send cookies including sessionId
      });
      
      if (response.data && response.data.user) {
        const userData = response.data.user;
        setUserEarnings(userData.earnings || 0);
        setUser(userData);
        setProfileData(userData);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Session expired, redirect to login
        navigate('/login');
      }
      console.error('Error refreshing user data:', error);
    }
  }, [navigate]);

  // Load data from localStorage (keeping this for compatibility)
  const loadClickedPosts = useCallback(() => {
    try {
      const saved = localStorage.getItem(`clickedPosts_${user?.id || 'guest'}`);
      if (saved) {
        setClickedPosts(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading clicked posts:', error);
    }
  }, [user?.id]);

  const saveClickedPosts = useCallback((newClickedPosts: ClickedPost[]) => {
    try {
      localStorage.setItem(`clickedPosts_${user?.id || 'guest'}`, JSON.stringify(newClickedPosts));
      setClickedPosts(newClickedPosts);
    } catch (error) {
      console.error('Error saving clicked posts:', error);
    }
  }, [user?.id]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const response = await axios.get(`${API_URL}/api/user/dashboard`, {
        withCredentials: true
      });
      
      const data = response.data;
      
      if (data && data.posts && Array.isArray(data.posts)) {
        setPosts(data.posts);
        
        // Update clicked posts status from server
        if (data.userClicks) {
          const serverClicks = data.userClicks.map((click: any) => ({
            postId: click.postId,
            clickedAt: new Date(click.clickedAt).getTime(),
            status: 'approved' // All clicks are auto-approved
          }));
          setClickedPosts(serverClicks);
          localStorage.setItem(`clickedPosts_${user?.id || 'guest'}`, JSON.stringify(serverClicks));
        }
        
        if (data.posts.length === 0) {
          console.log('No posts available at the moment');
        }
      } else {
        setPosts([]);
        console.error('Invalid response format from server');
      }
      
    } catch (error: any) {
      console.error('Dashboard fetch error:', error);
      setPosts([]);
      
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        console.error('Failed to load dashboard data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, navigate]);

  const handlePostClick = useCallback(async (post: Post) => {
    const isClicked = clickedPosts.some(cp => cp.postId === post.id);
    if (isClicked || processingPost === post.id) return;

    try {
      setProcessingPost(post.id);

      // Submit click to backend with auto-approval
      const response = await axios.post(`${API_URL}/api/user/submit-click`, {
        postId: post.id,
        socialLink: post.socialLink,
        autoApprove: true
      }, {
        withCredentials: true
      });

      const data = response.data;

      if (data.success) {
        // Open the social media link
        window.open(post.socialLink, '_blank', 'noopener,noreferrer');

        // Add to clicked posts with approved status
        const newClickedPost: ClickedPost = {
          postId: post.id,
          clickedAt: Date.now(),
          status: 'approved'
        };

        const updatedClickedPosts = [...clickedPosts, newClickedPost];
        saveClickedPosts(updatedClickedPosts);

        // Refresh user data to get updated earnings
        await refreshUserData();

        toast.success(data.message);
      }

    } catch (error: any) {
      console.error('Error processing click:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to submit task');
      }
    } finally {
      setProcessingPost(null);
    }
  }, [clickedPosts, saveClickedPosts, refreshUserData, navigate]);

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, {
        withCredentials: true
      });
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error: any) {
      toast.error('Error logging out');
      navigate('/login');
    }
  };

  const handleWalletClick = () => {
    navigate('/withdraw');
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setIsUpdatingProfile(true);
      
      const response = await axios.put(`${API_URL}/api/user/profile`, profileData, {
        withCredentials: true
      });

      if (response.data.success) {
        setUser(response.data.user);
        setEditingProfile(false);
        toast.success('Profile updated successfully!');
        await refreshUserData();
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to update profile');
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileData(user || {});
    setEditingProfile(false);
  };

  // Group posts by engagement type with custom messages
  const getPostsByType = (type: string) => {
    return posts.filter(post => {
      const isNotClicked = !clickedPosts.some(cp => cp.postId === post.id);
      return post.engagementType === type && isNotClicked;
    });
  };

  // Get section color classes
  const getSectionColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        button: 'bg-blue-600 hover:bg-blue-700'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        button: 'bg-purple-600 hover:bg-purple-700'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        button: 'bg-green-600 hover:bg-green-700'
      },
      yellow: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        button: 'bg-yellow-600 hover:bg-yellow-700'
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  // Render post section
  const renderPostSection = (type: string) => {
    const sectionPosts = getPostsByType(type);
    const sectionConfig = POST_SECTIONS[type as keyof typeof POST_SECTIONS];
    const colorClasses = getSectionColorClasses(sectionConfig.color);
   

    // Get custom message from any post in this section
    const customMessage = sectionPosts.find(post => post.postMessage)?.postMessage;

    return (
      <div key={type} className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === type ? null : type)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <div className="text-2xl mr-3">{sectionConfig.emoji}</div>
            <div className="text-left">
              <h3 className={`text-lg font-semibold ${sectionConfig.color === 'yellow' ? 'text-yellow-600' : `text-${sectionConfig.color}-700`}`}>
                {sectionConfig.title}
              </h3>
              <p className="text-sm text-gray-600">{sectionPosts.length} available tasks</p>
              <p className="text-xs text-gray-500 mt-1">{sectionConfig.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {type === 'vip' && <Crown className="h-5 w-5 text-yellow-500" />}
            {expandedSection === type ? 
              <ChevronUp className="h-5 w-5 text-gray-400" /> : 
              <ChevronDown className="h-5 w-5 text-gray-400" />
            }
          </div>
        </button>
        
        {expandedSection === type && (
          <div className="border-t">
            {/* Custom Message Display */}
            {customMessage && (
              <div className={`px-6 py-3 ${colorClasses.bg} ${colorClasses.border} border-b`}>
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p className={`text-sm ${colorClasses.text} font-medium`}>
                    {customMessage}
                  </p>
                </div>
              </div>
            )}
            
            <div className="divide-y divide-gray-200">
              {sectionPosts.length > 0 ? (
                sectionPosts.map((post) => (
                  <div key={post.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {post.title}
                        </h4>
                        <p className="text-sm text-green-600 font-semibold mt-1">
                          ₹{post.rewardAmount.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => handlePostClick(post)}
                        disabled={processingPost === post.id}
                        className={`ml-4 inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${colorClasses.button} focus:ring-${sectionConfig.color}-500`}
                      >
                        {processingPost === post.id ? (
                          <>
                            <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Complete Task
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-4 text-center text-gray-500">
                  No tasks available in this category
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    refreshUserData().then(() => {
      loadClickedPosts();
      fetchDashboardData();
    });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="h-6 w-6 text-gray-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">
                Welcome, {user?.fullName || 'User'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Settings className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-blue-600 font-medium">Profile</span>
              </button>
              <button
                onClick={handleWalletClick}
                className="flex items-center bg-green-50 px-3 py-2 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
              >
                <Wallet className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-lg font-semibold text-green-600">
                  ₹{userEarnings?.toFixed(2) || '0.00'}
                </span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Profile Section */}
        <AnimatePresence>
          {showProfile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-lg shadow-sm border mb-6 overflow-hidden"
            >
              <div className="px-6 py-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
                  <div className="flex items-center gap-2">
                    {!editingProfile ? (
                      <button
                        onClick={() => setEditingProfile(true)}
                        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Profile
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveProfile}
                          disabled={isUpdatingProfile}
                          className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {isUpdatingProfile ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isUpdatingProfile}
                          className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-800 border-b pb-2">Basic Information</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      {editingProfile ? (
                        <input
                          type="text"
                          name="fullName"
                          value={profileData.fullName || ''}
                          onChange={handleProfileChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-900">{user?.fullName}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      {editingProfile ? (
                        <input
                          type="email"
                          name="email"
                          value={profileData.email || ''}
                          onChange={handleProfileChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-900">{user?.email}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      {editingProfile ? (
                        <input
                          type="tel"
                          name="phone"
                          value={profileData.phone || ''}
                          onChange={handleProfileChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-900">{user?.phone}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      {editingProfile ? (
                        <input
                          type="text"
                          name="city"
                          value={profileData.city || ''}
                          onChange={handleProfileChange}
                          placeholder="Enter your city"
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-900">{user?.city || 'Not specified'}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      {editingProfile ? (
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={profileData.dateOfBirth || ''}
                          onChange={handleProfileChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-900">
                            {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not specified'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Social Media & Additional Info */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-800 border-b pb-2">Social Media & Additional Info</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Instagram Username</label>
                      {editingProfile ? (
                        <input
                          type="text"
                          name="instagramId"
                          value={profileData.instagramId || ''}
                          onChange={handleProfileChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="flex items-center">
                          <Instagram className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-900">@{user?.instagramId}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Medium Username</label>
                      {editingProfile ? (
                        <input
                          type="text"
                          name="facebookId"
                          value={profileData.facebookId || ''}
                          onChange={handleProfileChange}
                          placeholder="Enter Facebook username"
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="flex items-center">
                          <Globe className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-900">{user?.facebookId ? `@${user.facebookId}` : 'Not specified'}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Twitter Username</label>
                      {editingProfile ? (
                        <input
                          type="text"
                          name="twitterId"
                          value={profileData.twitterId || ''}
                          onChange={handleProfileChange}
                          placeholder="Enter Twitter username"
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="flex items-center">
                          <Globe className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-900">{user?.twitterId ? `@${user.twitterId}` : 'Not specified'}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Profile</label>
                      {editingProfile ? (
                        <input
                          type="text"
                          name="linkedinId"
                          value={profileData.linkedinId || ''}
                          onChange={handleProfileChange}
                          placeholder="Enter LinkedIn username"
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="flex items-center">
                          <Globe className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-900">{user?.linkedinId ? `@${user.linkedinId}` : 'Not specified'}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Personal Website</label>
                      {editingProfile ? (
                        <input
                          type="url"
                          name="website"
                          value={profileData.website || ''}
                          onChange={handleProfileChange}
                          placeholder="https://yourwebsite.com"
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="flex items-center">
                          <Globe className="h-4 w-4 text-gray-400 mr-2" />
                          {user?.website ? (
                            <a 
                              href={user.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {user.website}
                            </a>
                          ) : (
                            <span className="text-gray-900">Not specified</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Stats */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-md font-medium text-gray-800 mb-4">Account Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">₹{userEarnings?.toFixed(2) || '0.00'}</div>
                      <div className="text-sm text-green-700">Total Earnings</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">{clickedPosts.length}</div>
                      <div className="text-sm text-blue-700">Tasks Completed</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">{posts.length}</div>
                      <div className="text-sm text-purple-700">Available Tasks</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {user?.createdAt ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                      </div>
                      <div className="text-sm text-orange-700">Days Active</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bot Verification Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Important: Bot Verification System Active
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Your earnings are added instantly, but may be adjusted after our automated bot verifies your engagement on social media. 
                Fake clicks will be detected and reversed.
              </p>
            </div>
          </div>
        </div>

        {/* Task Sections */}
        <div className="space-y-4">
          {/* Render all post sections */}
          {Object.keys(POST_SECTIONS).map(type => renderPostSection(type))}
        </div>

        {/* No Posts Available */}
        {posts.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center mt-6">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts available</h3>
            <p className="text-gray-600">Check back later for new earning opportunities!</p>
            <button
              onClick={fetchDashboardData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        )}

        {/* All Tasks Completed */}
        {posts.length > 0 && Object.keys(POST_SECTIONS).every(type => getPostsByType(type).length === 0) && (
          <div className="bg-green-50 rounded-lg border border-green-200 p-8 text-center mt-6">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-lg font-medium text-green-900 mb-2">All available tasks completed!</h3>
            <p className="text-green-700">Great job! You've completed all available tasks.</p>
            <p className="text-green-600 font-semibold mt-2">
              Total earned: ₹{userEarnings?.toFixed(2) || '0.00'}
            </p>
            <button
              onClick={fetchDashboardData}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Check for New Tasks
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;