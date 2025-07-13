// utils/constants.ts
// API URL configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Engagement types with optimized structure
export const ENGAGEMENT_TYPES = {
  LIKE: {
    id: 'like',
    name: 'Like Only',
    reward: 0.10,
    description: 'Like the post',
    color: 'bg-blue-500',
  },
  LIKE_COMMENT: {
    id: 'like_comment',
    name: 'Like & Comment',
    reward: 0.15,
    description: 'Like and comment on the post',
    color: 'bg-purple-500',
  },
  LIKE_COMMENT_SHARE: {
    id: 'like_comment_share',
    name: 'Like, Comment & Share',
    reward: 0.20,
    description: 'Like, comment and share the post',
    color: 'bg-green-500',
  },
} as const;

// Withdrawal methods
export const WITHDRAWAL_METHODS = [
  {
    id: 'amazon',
    name: 'Amazon Gift Card',
    minAmount: 100,
    description: 'Receive an Amazon Gift Card code via email',
    icon: 'gift',
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    minAmount: 500,
    description: 'Transfer to your PhonePe account',
    icon: 'smartphone',
  },
] as const;

// Performance optimizations
export const PERFORMANCE_CONFIG = {
  DEBOUNCE_DELAY: 300,
  API_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
} as const;

// Task status types
export const TASK_STATUS = {
  AVAILABLE: 'available',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

// User roles
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;