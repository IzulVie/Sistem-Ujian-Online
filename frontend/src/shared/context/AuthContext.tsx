import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { toast } from './ToastContext';

export interface UserProfile {
  id: number;
  user_id: number;
  nisn?: string;
  nis?: string;
  nip?: string;
  class_id?: number;
  major_id?: number;
  class_room?: {
    id: number;
    name: string;
    level: number;
  };
  major?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface User {
  id: number;
  name: string;
  email: string | null;
  username: string | null;
  role: 'super_admin' | 'admin' | 'guru' | 'siswa' | 'pengawas';
  profile: UserProfile | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (loginVal: string, passwordVal: string) => Promise<User>;
  logout: (isAutoExpired?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Maximum session lifetime: 8 Hours (28,800,000 milliseconds)
export const MAX_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to clear local storage credentials
  const clearAuthStorage = () => {
    localStorage.removeItem('cbt_token');
    localStorage.removeItem('cbt_session_token');
    localStorage.removeItem('cbt_user');
    localStorage.removeItem('cbt_login_time');
    setUser(null);
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('cbt_token');
      const loginTimeStr = localStorage.getItem('cbt_login_time');

      if (!token) {
        setIsLoading(false);
        return;
      }

      // Check if session has exceeded 8 hours
      if (loginTimeStr) {
        const loginTime = parseInt(loginTimeStr, 10);
        const elapsed = Date.now() - loginTime;

        if (elapsed >= MAX_SESSION_DURATION_MS) {
          clearAuthStorage();
          toast.warning('Sesi login Anda telah berakhir setelah 8 jam. Silakan login kembali.', 'Sesi Berakhir');
          setIsLoading(false);
          return;
        }
      }

      try {
        const response = await apiClient.get('/auth/me');
        setUser(response.data.user);
        localStorage.setItem('cbt_user', JSON.stringify(response.data.user));
        
        // If login_time wasn't recorded, set it now
        if (!loginTimeStr) {
          localStorage.setItem('cbt_login_time', Date.now().toString());
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        clearAuthStorage();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Background Heartbeat: Periodically monitor 8-hour session lifetime (every 30 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const loginTimeStr = localStorage.getItem('cbt_login_time');
      if (loginTimeStr) {
        const loginTime = parseInt(loginTimeStr, 10);
        const elapsed = Date.now() - loginTime;

        if (elapsed >= MAX_SESSION_DURATION_MS) {
          logout(true);
        }
      }
    }, 30000); // 30 seconds check

    return () => clearInterval(interval);
  }, [user]);

  const login = async (loginVal: string, passwordVal: string): Promise<User> => {
    try {
      const response = await apiClient.post('/auth/login', {
        login: loginVal,
        password: passwordVal,
      });

      const { token, session_token, user: loggedInUser } = response.data;

      localStorage.setItem('cbt_token', token);
      localStorage.setItem('cbt_session_token', session_token);
      localStorage.setItem('cbt_user', JSON.stringify(loggedInUser));
      localStorage.setItem('cbt_login_time', Date.now().toString());

      setUser(loggedInUser);
      return loggedInUser;
    } catch (error: any) {
      throw error.response?.data || new Error('Terjadi kesalahan saat masuk.');
    }
  };

  const logout = async (isAutoExpired?: any) => {
    const isExpired = typeof isAutoExpired === 'boolean' ? isAutoExpired : false;
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      clearAuthStorage();
      if (isExpired) {
        toast.warning('Sesi login Anda telah mencapai batas maksimal 8 jam. Anda telah dikeluarkan otomatis demi keamanan.', 'Sesi Berakhir');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
