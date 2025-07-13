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

// Configure axios once
axios.defaults.withCredentials = true;
axios.defaults.timeout = 10000; // 10 second timeout

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/auth/me`);
      if (response.data.user) {
        setUser(response.data.user);
      }
    } catch (error: any) {
      console.log('Auth check failed:', error.response?.status);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, { email });
    return response.data;
  }, []);

  const loginWithPermanentCode = useCallback(async (permanentCode: string) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, { permanentCode });
    if (response.data.user) {
      setUser(response.data.user);
    }
    return response.data;
  }, []);

  const verifyLogin = useCallback(async (email: string, code: string) => {
    const response = await axios.post(`${API_URL}/api/auth/verify-login`, { email, code });
    if (response.data.user) {
      setUser(response.data.user);
    }
    return response.data;
  }, []);

  const register = useCallback(async (userData: RegisterData) => {
    const response = await axios.post(`${API_URL}/api/auth/register`, userData);
    return response.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
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