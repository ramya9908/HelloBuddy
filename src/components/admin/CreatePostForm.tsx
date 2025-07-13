// src/components/admin/CreatePostForm.tsx
import { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, Trash2, Upload } from 'lucide-react';
import { API_URL } from '../../utils/constants';
import Button from '../common/Button';
import Input from '../common/Input';

// Define engagement types with proper typing
const ENGAGEMENT_TYPES = {
  LIKE: { reward: 0.10 },
  LIKE_COMMENT: { reward: 0.15 },
  LIKE_COMMENT_SHARE: { reward: 0.20 },
  VIP: { reward: 0.50 }
} as const;

interface Batch {
  letter: string;
  userCount: number;
  isActive: boolean;
}

interface CreatePostFormProps {
  batches: Batch[];
  onPostCreated: () => void;
}

const CreatePostForm = ({ batches, onPostCreated }: CreatePostFormProps) => {
  const [formData, setFormData] = useState({
    title: '',
    socialLinks: [''], // Array of social links
    engagementType: 'like',
    rewardAmount: 0.10,
    targetBatches: [] as string[],
    clickLimit: 100,
    autoDeleteEnabled: true,
    postMessage: '', // New field for post message
  });
  const [isLoading, setIsLoading] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Memoized active batches for better performance
  const activeBatches = useMemo(() => 
    batches.filter(batch => batch.isActive && batch.userCount > 0), 
    [batches]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'engagementType') {
      let rewardAmount: number;
      switch (value) {
        case 'like_comment':
          rewardAmount = ENGAGEMENT_TYPES.LIKE_COMMENT.reward;
          break;
        case 'like_comment_share':
          rewardAmount = ENGAGEMENT_TYPES.LIKE_COMMENT_SHARE.reward;
          break;
        case 'vip':
          rewardAmount = ENGAGEMENT_TYPES.VIP.reward;
          break;
        default:
          rewardAmount = ENGAGEMENT_TYPES.LIKE.reward;
          break;
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        rewardAmount,
      }));
    } else if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: target.checked,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value,
      }));
    }
  }, []);

  // Handle social link changes
  const handleSocialLinkChange = useCallback((index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link, i) => i === index ? value : link)
    }));
  }, []);

  // Add new social link
  const addSocialLink = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, '']
    }));
  }, []);

  // Remove social link
  const removeSocialLink = useCallback((index: number) => {
    if (formData.socialLinks.length > 1) {
      setFormData(prev => ({
        ...prev,
        socialLinks: prev.socialLinks.filter((_, i) => i !== index)
      }));
    }
  }, [formData.socialLinks.length]);

  const handleBatchChange = useCallback((batchLetter: string) => {
    setFormData(prev => {
      const targetBatches = [...prev.targetBatches];
      if (targetBatches.includes(batchLetter)) {
        return {
          ...prev,
          targetBatches: targetBatches.filter(b => b !== batchLetter),
        };
      } else {
        return {
          ...prev,
          targetBatches: [...targetBatches, batchLetter],
        };
      }
    });
  }, []);

  const handleSelectAllBatches = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      targetBatches: activeBatches.map(b => b.letter),
    }));
  }, [activeBatches]);

  const handleDeselectAllBatches = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      targetBatches: [],
    }));
  }, []);

  const parseBulkText = useCallback(() => {
    if (!bulkText.trim()) {
      toast.error('Please enter some links to parse');
      return;
    }

    const lines = bulkText.trim().split('\n').filter(line => line.trim());
    const validLinks = lines.map(line => line.trim()).filter(line => {
      try {
        new URL(line);
        return true;
      } catch {
        return false;
      }
    });

    if (validLinks.length > 0) {
      setFormData(prev => ({
        ...prev,
        socialLinks: validLinks
      }));
      setBulkText('');
      setBulkMode(false);
      toast.success(`${validLinks.length} links added from bulk input`);
    } else {
      toast.error('No valid links found in the input');
    }
  }, [bulkText]);

  const validateForm = useCallback(() => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return false;
    }

    const validLinks = formData.socialLinks.filter(link => link.trim());
    if (validLinks.length === 0) {
      toast.error('At least one social link is required');
      return false;
    }

    // Validate each link
    for (let i = 0; i < validLinks.length; i++) {
      try {
        new URL(validLinks[i]);
      } catch {
        toast.error(`Link ${i + 1} is not a valid URL`);
        return false;
      }
    }

    if (formData.targetBatches.length === 0) {
      toast.error('Please select at least one batch');
      return false;
    }

    if (formData.autoDeleteEnabled && (!formData.clickLimit || formData.clickLimit < 1)) {
      toast.error('Please enter a valid click limit (minimum 1)');
      return false;
    }

    return true;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const validLinks = formData.socialLinks.filter(link => link.trim());
    
    setIsLoading(true);
    
    try {
      // Create individual posts for each link with the same settings
      const posts = validLinks.map((link, index) => ({
        title: validLinks.length > 1 ? `${formData.title} (${index + 1})` : formData.title,
        socialLink: link.trim(),
        engagementType: formData.engagementType,
        rewardAmount: formData.rewardAmount,
        targetBatches: formData.targetBatches,
        clickLimit: formData.clickLimit,
        autoDeleteEnabled: formData.autoDeleteEnabled,
        postMessage: formData.postMessage.trim() || null,
      }));

      if (posts.length === 1) {
        // Single post submission
        await axios.post(`${API_URL}/api/admin/posts`, posts[0], {
          withCredentials: true,
          timeout: 10000
        });
        toast.success('Post created successfully!');
      } else {
        // Bulk post submission
        await axios.post(`${API_URL}/api/admin/posts/bulk`, { posts }, {
          withCredentials: true,
          timeout: 30000
        });
        toast.success(`${posts.length} posts created successfully!`);
      }
      
      // Reset form
      setFormData({
        title: '',
        socialLinks: [''],
        engagementType: 'like',
        rewardAmount: 0.10,
        targetBatches: [],
        clickLimit: 100,
        autoDeleteEnabled: true,
        postMessage: '',
      });
      setBulkMode(false);
      setBulkText('');
      
      onPostCreated();
    } catch (error: any) {
      if (error.response?.status === 207) {
        // Partial success
        const data = error.response.data;
        toast.success(`${data.created}/${data.total} posts created successfully`);
        if (data.errors && data.errors.length > 0) {
          data.errors.forEach((err: any) => {
            toast.error(`Post ${err.postIndex + 1}: ${err.error}`);
          });
        }
        onPostCreated();
      } else {
        toast.error(error.response?.data?.error || 'Failed to create posts');
      }
    } finally {
      setIsLoading(false);
    }
  }, [formData, validateForm, onPostCreated]);

  // Calculate estimated budget
  const estimatedBudget = useMemo(() => {
    if (!formData.autoDeleteEnabled || !formData.clickLimit) return 0;
    const validLinksCount = formData.socialLinks.filter(link => link.trim()).length;
    return formData.rewardAmount * formData.clickLimit * validLinksCount;
  }, [formData.rewardAmount, formData.clickLimit, formData.autoDeleteEnabled, formData.socialLinks]);

  const validLinksCount = formData.socialLinks.filter(link => link.trim()).length;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Create New Post{validLinksCount > 1 ? `s (${validLinksCount})` : ''}
        </h2>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setBulkMode(!bulkMode)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {bulkMode ? 'Manual Mode' : 'Bulk Links'}
          </Button>
        </div>
      </div>

      {bulkMode && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-medium text-blue-900 mb-3">Bulk Link Input</h3>
          <p className="text-sm text-blue-700 mb-3">
            Enter one social media link per line. All links will use the same post settings.
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="https://instagram.com/p/example1
https://facebook.com/post/example2
https://twitter.com/user/status/example3"
            className="w-full h-32 p-3 border border-blue-200 rounded-md resize-none focus:border-blue-500 focus:ring-blue-500"
          />
          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              onClick={parseBulkText}
              disabled={!bulkText.trim()}
            >
              Add Links ({bulkText.trim().split('\n').filter(l => l.trim()).length} found)
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {setBulkText(''); setBulkMode(false);}}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Input
          label="Post Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter a title for the post(s)"
          required
        />
        
        {/* Social Media Links Section */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Social Media Links ({validLinksCount} link{validLinksCount !== 1 ? 's' : ''})
          </label>
          
          <div className="space-y-3">
            {formData.socialLinks.map((link, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => handleSocialLinkChange(index, e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                    placeholder={`https://instagram.com/p/... (Link ${index + 1})`}
                    required={index === 0 || link.trim() !== ''}
                  />
                </div>
                
                <div className="flex gap-1">
                  {formData.socialLinks.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSocialLink(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSocialLink}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add More Link
            </Button>
          </div>
          
          {validLinksCount > 1 && (
            <p className="mt-2 text-sm text-blue-600">
              {validLinksCount} separate posts will be created with the same settings
            </p>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Engagement Type
          </label>
          <select
            name="engagementType"
            value={formData.engagementType}
            onChange={handleChange}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
          >
            <option value="like">Like Only (₹{ENGAGEMENT_TYPES.LIKE.reward.toFixed(2)})</option>
            <option value="like_comment">Like & Comment (₹{ENGAGEMENT_TYPES.LIKE_COMMENT.reward.toFixed(2)})</option>
            <option value="like_comment_share">Like, Comment & Share (₹{ENGAGEMENT_TYPES.LIKE_COMMENT_SHARE.reward.toFixed(2)})</option>
            <option value="vip">VIP Post (₹{ENGAGEMENT_TYPES.VIP.reward.toFixed(2)})</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Post Message (Optional)
          </label>
          <textarea
            name="postMessage"
            value={formData.postMessage}
            onChange={handleChange}
            placeholder="Enter a custom message for this post section (optional)"
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors h-20 resize-none"
          />
          <p className="mt-1 text-sm text-gray-500">
            This message will be displayed to users in the post section
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reward Amount (₹) per click
          </label>
          <input
            type="number"
            name="rewardAmount"
            value={formData.rewardAmount}
            onChange={handleChange}
            step="0.01"
            min="0.01"
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
          />
          <p className="mt-1 text-sm text-gray-500">
            Default amounts: Like (₹{ENGAGEMENT_TYPES.LIKE.reward.toFixed(2)}), Like & Comment (₹{ENGAGEMENT_TYPES.LIKE_COMMENT.reward.toFixed(2)}), Like, Comment & Share (₹{ENGAGEMENT_TYPES.LIKE_COMMENT_SHARE.reward.toFixed(2)}), VIP (₹{ENGAGEMENT_TYPES.VIP.reward.toFixed(2)})
          </p>
        </div>

        {/* Auto-Delete Settings */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="autoDeleteEnabled"
              name="autoDeleteEnabled"
              checked={formData.autoDeleteEnabled}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoDeleteEnabled" className="ml-2 block text-sm font-medium text-gray-700">
              Enable Auto-Delete (Recommended)
            </label>
          </div>
          
          {formData.autoDeleteEnabled && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Click Limit (per post)
                </label>
                <input
                  type="number"
                  name="clickLimit"
                  value={formData.clickLimit}
                  onChange={handleChange}
                  min="1"
                  step="1"
                  placeholder="Enter click limit (e.g., 100)"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                />
                <p className="mt-1 text-xs text-blue-600">
                  Each post will auto-delete when clicks reach this limit
                </p>
              </div>

              {estimatedBudget > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        Total Estimated Budget: ₹{estimatedBudget.toFixed(2)}
                      </p>
                      <p className="text-xs text-green-600">
                        Maximum cost for {validLinksCount} post{validLinksCount !== 1 ? 's' : ''} × {formData.clickLimit} clicks × ₹{formData.rewardAmount}/click
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!formData.autoDeleteEnabled && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> Without auto-delete, these posts will run indefinitely and may consume unlimited budget.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Target Batches ({formData.targetBatches.length} selected)
            </label>
            <div className="space-x-2">
              <button
                type="button"
                onClick={handleSelectAllBatches}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAllBatches}
                className="text-xs text-red-600 hover:text-red-800 transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {activeBatches.map(batch => (
              <div 
                key={batch.letter}
                onClick={() => handleBatchChange(batch.letter)}
                className={`
                  p-2 rounded border cursor-pointer text-center transition-colors
                  ${formData.targetBatches.includes(batch.letter)
                    ? 'bg-blue-100 border-blue-400 text-blue-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}
                `}
              >
                <div className="font-medium">Batch {batch.letter}</div>
                <div className="text-xs">{batch.userCount} users</div>
              </div>
            ))}
          </div>
          
          {activeBatches.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">No active batches available.</p>
          )}
        </div>
        
        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isLoading}
        >
          {isLoading 
            ? `Creating ${validLinksCount} Post${validLinksCount !== 1 ? 's' : ''}...`
            : validLinksCount > 1 
              ? `Create ${validLinksCount} Posts`
              : formData.autoDeleteEnabled 
                ? `Create Post (${formData.clickLimit} click limit)`
                : 'Create Post (No limit)'
          }
        </Button>
      </form>
    </div>
  );
};

export default CreatePostForm;