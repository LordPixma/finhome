'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, tokenManager } from '@/lib/api';
import { redirectToTenantSubdomain, isAppDomain } from '@/lib/subdomain';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  tenantId: string;
  isGlobalAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  tenantName: string;
  subdomain: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = tokenManager.getAccessToken();
      
      if (accessToken) {
        try {
          // Decode JWT to get user info (simple base64 decode)
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          setUser({
            id: payload.userId,
            email: payload.email || '',
            name: payload.name || '',
            role: payload.role || 'member',
            tenantId: payload.tenantId,
            isGlobalAdmin: payload.isGlobalAdmin || payload.is_global_admin,
          });
        } catch (error) {
          console.error('Failed to parse token:', error);
          tokenManager.clearTokens();
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password) as any;
      
      if (response.success && response.data) {
        const { accessToken, refreshToken, user: userData } = response.data as AuthResponse;
        
        tokenManager.setTokens(accessToken, refreshToken);
        
        // Decode token to check if user is a global admin
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const isGlobalAdmin = payload.isGlobalAdmin || payload.is_global_admin;
        
        // Update user data with global admin flag
        const updatedUserData = {
          ...userData,
          isGlobalAdmin
        };
        
        setUser(updatedUserData);
        
        // Redirect based on user type
        if (typeof window !== 'undefined') {
          if (isGlobalAdmin) {
            // Global admins go directly to admin portal
            window.location.href = '/admin';
          } else if (isAppDomain()) {
            // Regular users go to their tenant subdomain
            await redirectToTenantSubdomain();
          } else {
            // Or to dashboard if already on subdomain
            window.location.href = '/dashboard';
          }
        }
      } else {
        throw new Error('Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Failed to login');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await api.register(data) as any;
      
      if (response.success && response.data) {
        const { accessToken, refreshToken, user: userData } = response.data as AuthResponse;
        
        tokenManager.setTokens(accessToken, refreshToken);
        setUser(userData);
        
        // Redirect to tenant subdomain if on app domain, otherwise to dashboard
        if (typeof window !== 'undefined') {
          if (isAppDomain()) {
            await redirectToTenantSubdomain();
          } else {
            window.location.href = '/dashboard';
          }
        }
      } else {
        throw new Error('Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Failed to register');
    }
  };

  const logout = () => {
    tokenManager.clearTokens();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
