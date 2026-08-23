import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('cbt_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiClient.get('/auth/me');
        setUser(response.data.user);
        localStorage.setItem('cbt_user', JSON.stringify(response.data.user));
      } catch (error) {
        console.error('Authentication check failed:', error);
        // Interceptor handles cleanup on 401, but we clean up here as safety
        localStorage.removeItem('cbt_token');
        localStorage.removeItem('cbt_session_token');
        localStorage.removeItem('cbt_user');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

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

      setUser(loggedInUser);
      return loggedInUser;
    } catch (error: any) {
      throw error.response?.data || new Error('Terjadi kesalahan saat masuk.');
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      localStorage.removeItem('cbt_token');
      localStorage.removeItem('cbt_session_token');
      localStorage.removeItem('cbt_user');
      setUser(null);
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
