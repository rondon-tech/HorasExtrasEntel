import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiClient } from '../api/client';

function decodeJWT(token: string): { id?: string; role?: string; passwordChangeRequired?: boolean } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  role: string | null;
  passwordChangeRequired: boolean;
  login: (token: string) => void;
  register: (username: string, password?: string, profileData?: { firstName: string; lastName: string; email: string; phone?: string }) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [role, setRole] = useState<string | null>(() => {
    const stored = localStorage.getItem('auth_token');
    return stored ? (decodeJWT(stored)?.role ?? null) : null;
  });
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(() => {
    const stored = localStorage.getItem('auth_token');
    if (stored) {
      const decoded = decodeJWT(stored);
      return decoded?.passwordChangeRequired ?? false;
    }
    return false;
  });
  const isAuthenticated = !!token;

  useEffect(() => {
    if (token) {
      localStorage.setItem('auth_token', token);
      const decoded = decodeJWT(token);
      setRole(decoded?.role ?? null);
      setPasswordChangeRequired(decoded?.passwordChangeRequired ?? false);
    } else {
      localStorage.removeItem('auth_token');
      setRole(null);
      setPasswordChangeRequired(false);
    }
  }, [token]);

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback((newToken: string) => {
    setToken(newToken);
  }, []);

  const register = useCallback(async (username: string, password?: string, profileData?: { firstName: string; lastName: string; email: string; phone?: string }) => {
    const response = await apiClient.post('/register', {
      username,
      password,
      ...(profileData || {}),
    });
    if (response.data.token) {
      setToken(response.data.token);
    }
  }, []);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    const response = await apiClient.post('/change-password', { oldPassword, newPassword });
    if (response.data.token) {
      setToken(response.data.token);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, role, passwordChangeRequired, login, register, changePassword, logout }}>
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
