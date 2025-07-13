import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, X, Clock, User, ExternalLink, Calendar, CheckSquare, Square } from 'lucide-react';
import { API_URL } from '../../utils/constants';
import LoadingScreen from '../../components/common/LoadingScreen';

interface PendingClick {
  id: number;
  userId: number;
  postId: number;
  clickedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  user: {
    id: number;
    fullName: string;
    email: string;
    batchLetter: string;
    instagramId: string;
  };
  post: {
    id: number;
    title: string;
    socialLink: string;
    engagementType: string;
    rewardAmount: number;
  };
}

const AdminClickApproval = () => {
  const [pendingClicks, setPendingClicks] = useState<PendingClick[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingClick, setProcessingClick] = useState<number | null>(null);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedClicks, setSelectedClicks] = useState<Set<number>>(new Set());

  const fetchPendingClicks = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/admin/pending-clicks`, {
        withCredentials: true,
        timeout: 10000
      });
      setPendingClicks(response.data.clicks || []);
      setSelectedClicks(new Set()); // Clear selections when refreshing
    } catch (error: any) {
      console.error('Error fetching pending clicks:', error);
      toast.error(error.response?.data?.message || 'Failed to load pending clicks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleApproveClick = useCallback(async (clickId: number, rewardAmount: number, userFullName: string) => {
    if (!confirm(`Approve this task and add ₹${rewardAmount.toFixed(2)} to ${userFullName}'s wallet?`)) {
      return;
    }

    try {
      setProcessingClick(clickId);
      const response = await axios.post(`${API_URL}/api/admin/approve-click`, {
        clickId: clickId
      }, {
        withCredentials: true,
        timeout: 10000
      });

      if (response.data.success) {
        setPendingClicks(pendingClicks.map(click => 
          click.id === clickId 
            ? { ...click, status: 'approved' as const }
            : click
        ));

        // Remove from selected clicks
        setSelectedClicks(prev => {
          const newSet = new Set(prev);
          newSet.delete(clickId);
          return newSet;
        });

        toast.success(`Task approved! ₹${rewardAmount.toFixed(2)} added to ${userFullName}'s wallet`, {
          icon: '✅',
          duration: 4000
        });
      }
    } catch (error: any) {
      console.error('Error approving click:', error);
      toast.error(error.response?.data?.message || 'Failed to approve task');
    } finally {
      setProcessingClick(null);
    }
  }, [pendingClicks]);

  const handleRejectClick = useCallback(async (clickId: number, userFullName: string) => {
    if (!confirm(`Reject this task from ${userFullName}? No payment will be made.`)) {
      return;
    }

    try {
      setProcessingClick(clickId);
      const response = await axios.post(`${API_URL}/api/admin/reject-click`, {
        clickId: clickId
      }, {
        withCredentials: true,
        timeout: 10000
      });

      if (response.data.success) {
        setPendingClicks(pendingClicks.map(click => 
          click.id === clickId 
            ? { ...click, status: 'rejected' as const }
            : click
        ));

        // Remove from selected clicks
        setSelectedClicks(prev => {
          const newSet = new Set(prev);
          newSet.delete(clickId);
          return newSet;
        });

        toast.success(`Task rejected for ${userFullName}`, {
          icon: '❌',
          duration: 3000
        });
      }
    } catch (error: any) {
      console.error('Error rejecting click:', error);
      toast.error(error.response?.data?.message || 'Failed to reject task');
    } finally {
      setProcessingClick(null);
    }
  }, [pendingClicks]);

  const handleBatchApprove = useCallback(async () => {
    const clicksToApprove = pendingClicks.filter(click => 
      selectedClicks.has(click.id) && click.status === 'pending'
    );

    if (clicksToApprove.length === 0) {
      toast.error('No pending tasks selected for approval');
      return;
    }

    const totalAmount = clicksToApprove.reduce((sum, click) => sum + click.post.rewardAmount, 0);
    
    if (!confirm(`Approve ${clicksToApprove.length} selected tasks and pay ₹${totalAmount.toFixed(2)} total?`)) {
      return;
    }

    try {
      setProcessingBatch(true);
      let successCount = 0;
      let failedCount = 0;

      // Process each click individually
      for (const click of clicksToApprove) {
        try {
          const response = await axios.post(`${API_URL}/api/admin/approve-click`, {
            clickId: click.id
          }, {
            withCredentials: true,
            timeout: 10000
          });

          if (response.data.success) {
            successCount++;
            // Update state
            setPendingClicks(prev => prev.map(c => 
              c.id === click.id ? { ...c, status: 'approved' as const } : c
            ));
          } else {
            failedCount++;
          }
        } catch (error) {
          console.error(`Failed to approve click ${click.id}:`, error);
          failedCount++;
        }
      }

      // Clear selections
      setSelectedClicks(new Set());

      if (successCount > 0) {
        toast.success(`${successCount} task(s) approved successfully!`, {
          icon: '✅',
          duration: 4000
        });
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} task(s) failed to approve`, {
          duration: 4000
        });
      }

    } catch (error: any) {
      console.error('Batch approve error:', error);
      toast.error('Failed to process batch approval');
    } finally {
      setProcessingBatch(false);
    }
  }, [selectedClicks, pendingClicks]);

  const handleApproveAllPending = useCallback(async () => {
    const pendingTasks = pendingClicks.filter(click => click.status === 'pending');
    
    if (pendingTasks.length === 0) {
      toast.error('No pending tasks to approve');
      return;
    }

    const totalAmount = pendingTasks.reduce((sum, click) => sum + click.post.rewardAmount, 0);
    
    if (!confirm(`Approve ALL ${pendingTasks.length} pending tasks and pay ₹${totalAmount.toFixed(2)} total?`)) {
      return;
    }

    try {
      setProcessingBatch(true);
      let successCount = 0;
      let failedCount = 0;

      // Process each pending click
      for (const click of pendingTasks) {
        try {
          const response = await axios.post(`${API_URL}/api/admin/approve-click`, {
            clickId: click.id
          }, {
            withCredentials: true,
            timeout: 10000
          });

          if (response.data.success) {
            successCount++;
            // Update state
            setPendingClicks(prev => prev.map(c => 
              c.id === click.id ? { ...c, status: 'approved' as const } : c
            ));
          } else {
            failedCount++;
          }
        } catch (error) {
          console.error(`Failed to approve click ${click.id}:`, error);
          failedCount++;
        }
      }

      // Clear selections
      setSelectedClicks(new Set());

      if (successCount > 0) {
        toast.success(`${successCount} task(s) approved successfully!`, {
          icon: '✅',
          duration: 4000
        });
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} task(s) failed to approve`, {
          duration: 4000
        });
      }

    } catch (error: any) {
      console.error('Approve all error:', error);
      toast.error('Failed to approve all tasks');
    } finally {
      setProcessingBatch(false);
    }
  }, [pendingClicks]);

  const handleSelectClick = useCallback((clickId: number) => {
    setSelectedClicks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clickId)) {
        newSet.delete(clickId);
      } else {
        newSet.add(clickId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllPending = useCallback(() => {
    const pendingIds = pendingClicks
      .filter(click => click.status === 'pending')
      .map(click => click.id);
    setSelectedClicks(new Set(pendingIds));
  }, [pendingClicks]);

  const handleDeselectAll = useCallback(() => {
    setSelectedClicks(new Set());
  }, []);

  const getEngagementLabel = useCallback((type: string) => {
    switch (type) {
      case 'like': return 'Like Only';
      case 'like_comment': return 'Like & Comment';
      case 'like_comment_share': return 'Like, Comment & Share';
      default: return 'Engage';
    }
  }, []);

  const getEngagementColor = useCallback((type: string) => {
    switch (type) {
      case 'like': return 'bg-blue-100 text-blue-800';
      case 'like_comment': return 'bg-purple-100 text-purple-800';
      case 'like_comment_share': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const { filteredClicks, pendingCount, approvedCount, rejectedCount, selectedPendingCount, selectedTotalAmount } = useMemo(() => {
    const filtered = pendingClicks.filter(click => {
      if (filterStatus === 'all') return true;
      return click.status === filterStatus;
    });

    const pending = pendingClicks.filter(click => click.status === 'pending').length;
    const approved = pendingClicks.filter(click => click.status === 'approved').length;
    const rejected = pendingClicks.filter(click => click.status === 'rejected').length;

    const selectedPending = pendingClicks.filter(click => 
      selectedClicks.has(click.id) && click.status === 'pending'
    );
    const selectedTotal = selectedPending.reduce((sum, click) => sum + click.post.rewardAmount, 0);

    return {
      filteredClicks: filtered,
      pendingCount: pending,
      approvedCount: approved,
      rejectedCount: rejected,
      selectedPendingCount: selectedPending.length,
      selectedTotalAmount: selectedTotal
    };
  }, [pendingClicks, filterStatus, selectedClicks]);

  useEffect(() => {
    fetchPendingClicks();
  }, [fetchPendingClicks]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link to="/admin" className="text-gray-600 hover:text-gray-900 mr-4 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Task Approval</h1>
            </div>
            <button
              onClick={fetchPendingClicks}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <Check className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <X className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <User className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-blue-600">{pendingClicks.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Batch Action Controls */}
        {pendingCount > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {selectedPendingCount > 0 && (
                    <span className="font-medium text-blue-600">
                      {selectedPendingCount} selected (₹{selectedTotalAmount.toFixed(2)})
                    </span>
                  )}
                  {selectedPendingCount === 0 && <span>No tasks selected</span>}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={handleSelectAllPending}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Select All Pending
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={handleDeselectAll}
                    className="text-sm text-red-600 hover:text-red-800 transition-colors"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="flex space-x-3">
                {selectedPendingCount > 0 && (
                  <button
                    onClick={handleBatchApprove}
                    disabled={processingBatch}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {processingBatch ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Approve Selected ({selectedPendingCount})
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={handleApproveAllPending}
                  disabled={processingBatch || pendingCount === 0}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processingBatch ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Approve All Pending ({pendingCount})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { key: 'pending', label: 'Pending', count: pendingCount },
                { key: 'approved', label: 'Approved', count: approvedCount },
                { key: 'rejected', label: 'Rejected', count: rejectedCount },
                { key: 'all', label: 'All', count: pendingClicks.length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    filterStatus === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredClicks.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredClicks.map((click) => (
                <div
                  key={click.id}
                  className={`p-6 ${
                    click.status === 'pending' ? 'bg-orange-50' : 
                    click.status === 'approved' ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1 min-w-0">
                      {/* Selection Checkbox */}
                      {click.status === 'pending' && (
                        <div className="flex-shrink-0 pt-1">
                          <button
                            onClick={() => handleSelectClick(click.id)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {selectedClicks.has(click.id) ? (
                              <CheckSquare className="h-5 w-5" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {/* User Info */}
                        <div className="mb-3">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-md font-semibold text-gray-900">
                              {click.user.fullName}
                            </h4>
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                              Batch {click.user.batchLetter}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{click.user.email}</p>
                          {click.user.instagramId && (
                            <p className="text-sm text-gray-600">@{click.user.instagramId}</p>
                          )}
                        </div>

                        {/* Post Info */}
                        <div className="mb-3">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {click.post.title}
                          </h3>
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getEngagementColor(click.post.engagementType)}`}>
                              {getEngagementLabel(click.post.engagementType)}
                            </span>
                            <span className="text-sm font-semibold text-green-600">
                              ₹{click.post.rewardAmount.toFixed(2)}
                            </span>
                            <a
                              href={click.post.socialLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View Post
                            </a>
                          </div>
                        </div>

                        {/* Timing Info */}
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          Submitted: {new Date(click.clickedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="ml-6 flex items-center space-x-3">
                      {click.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveClick(click.id, click.post.rewardAmount, click.user.fullName)}
                            disabled={processingClick === click.id || processingBatch}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {processingClick === click.id ? (
                              <>
                                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                                Processing...
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Approve
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleRejectClick(click.id, click.user.fullName)}
                            disabled={processingClick === click.id || processingBatch}
                            className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </button>
                        </>
                      )}

                      {click.status === 'approved' && (
                        <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg">
                          <Check className="h-4 w-4 mr-2" />
                          Approved
                        </div>
                      )}

                      {click.status === 'rejected' && (
                        <div className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg">
                          <X className="h-4 w-4 mr-2" />
                          Rejected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {filterStatus === 'all' ? 'tasks' : filterStatus} tasks found
              </h3>
              <p className="text-gray-600">
                {filterStatus === 'pending' 
                  ? 'All tasks have been processed!' 
                  : `No ${filterStatus} tasks at the moment.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminClickApproval;