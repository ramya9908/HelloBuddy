// contexts/AuthContext.tsx
import { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from '../utils/constants';

interface User {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  instagramId: string;
  batchLetter: string;
  earnings: number;
  isVerified: boolean;
  isAdmin?: boolean;
  permanentLoginCode?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string) => Promise<any>;
  loginWithPermanentCode: (permanentCode: string) => Promise<void>;
  verifyLogin: (email: string, code: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<any>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

interface RegisterData {
  email: string;
  fullName: string;
  phone: string;
  instagramId: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Configure axios
axios.defaults.withCredentials = true;
axios.defaults.timeout = 10000;

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ THE FIX: Store sessionId in localStorage instead of relying on cookies
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return localStorage.getItem('sessionId');
  });

  // Set up axios interceptor to include sessionId in Authorization header
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      if (sessionId) {
        config.headers.Authorization = `Bearer ${sessionId}`;
        console.log('✅ Adding sessionId to request header:', sessionId.substring(0, 8) + '...');
      } else {
        console.log('❌ No sessionId available for request');
      }
      return config;
    });

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [sessionId]);

  useEffect(() => {
    console.log('🚀 AuthProvider mounted');
    console.log('🔍 Initial sessionId from localStorage:', sessionId ? sessionId.substring(0, 8) + '...' : 'NONE');
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    console.log('🔍 Starting auth check...');
    
    try {
      setLoading(true);
      
      if (!sessionId) {
        console.log('❌ No sessionId in localStorage - user not logged in');
        setUser(null);
        return;
      }

      console.log('📡 Making auth check request with sessionId...');
      const response = await axios.get(`${API_URL}/api/auth/me`);
      
      if (response.data.user) {
        console.log('✅ Auth check successful:', response.data.user.email);
        setUser(response.data.user);
      } else {
        console.log('❌ No user data in response');
        setUser(null);
      }
    } catch (error: any) {
      console.log('❌ Auth check failed:', {
        status: error.response?.status,
        message: error.message
      });
      
      // If session is invalid, clear it
      if (error.response?.status === 401) {
        console.log('🗑️ Clearing invalid sessionId');
        setSessionId(null);
        localStorage.removeItem('sessionId');
      }
      
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const login = useCallback(async (email: string) => {
    console.log('📧 Sending login code to:', email);
    const response = await axios.post(`${API_URL}/api/auth/login`, { email });
    return response.data;
  }, []);

  const loginWithPermanentCode = useCallback(async (permanentCode: string) => {
    console.log('🔑 Attempting permanent code login...');
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { permanentCode });
      
      console.log('📦 Login response received:', {
        status: response.status,
        hasUser: !!response.data.user,
        hasSessionId: !!response.data.sessionId
      });
      
      if (response.data.user && response.data.sessionId) {
        const newSessionId = response.data.sessionId;
        
        console.log('✅ Login successful for:', response.data.user.email);
        console.log('🎉 Storing sessionId:', newSessionId.substring(0, 8) + '...');
        
        // ✅ THE FIX: Store sessionId in localStorage and state
        setSessionId(newSessionId);
        localStorage.setItem('sessionId', newSessionId);
        setUser(response.data.user);
        
        console.log('🎉 Session stored successfully!');
      } else {
        console.log('❌ Missing sessionId in response');
      }
      
      return response.data;
    } catch (error: any) {
      console.log('❌ Permanent code login failed:', error.response?.data);
      throw error;
    }
  }, []);

  const verifyLogin = useCallback(async (email: string, code: string) => {
    console.log('🔐 Verifying login code for:', email);
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-login`, { email, code });
      
      if (response.data.user && response.data.sessionId) {
        const newSessionId = response.data.sessionId;
        
        console.log('✅ Verification successful for:', response.data.user.email);
        console.log('🎉 Storing sessionId:', newSessionId.substring(0, 8) + '...');
        
        // ✅ THE FIX: Store sessionId in localStorage and state
        setSessionId(newSessionId);
        localStorage.setItem('sessionId', newSessionId);
        setUser(response.data.user);
        
        console.log('🎉 Session stored after verification!');
      }
      
      return response.data;
    } catch (error: any) {
      console.log('❌ Login verification failed:', error.response?.data);
      throw error;
    }
  }, []);

  const register = useCallback(async (userData: RegisterData) => {
    console.log('📝 Registering user:', userData.email);
    const response = await axios.post(`${API_URL}/api/auth/register`, userData);
    return response.data;
  }, []);

  const logout = useCallback(async () => {
    console.log('👋 Logging out...');
    
    try {
      await axios.post(`${API_URL}/api/auth/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // ✅ THE FIX: Clear sessionId from localStorage and state
      setSessionId(null);
      localStorage.removeItem('sessionId');
      setUser(null);
      console.log('🗑️ Session cleared completely');
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    loginWithPermanentCode,
    verifyLogin,
    register,
    logout,
    checkAuth,
  }), [user, loading, login, loginWithPermanentCode, verifyLogin, register, logout, checkAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};