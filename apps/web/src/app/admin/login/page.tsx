'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, tokenManager } from '@/lib/api';

export default function GlobalAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  // Check if user is already authenticated as global admin
  useEffect(() => {
    const checkExistingAuth = () => {
      try {
        const token = tokenManager.getAccessToken();
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const isGlobalAdmin = payload.isGlobalAdmin || payload.is_global_admin;
          const localStorageFlag = localStorage.getItem('isGlobalAdmin') === 'true';
          
          if (isGlobalAdmin || localStorageFlag) {
            router.push('/admin');
            return;
          }
        }
      } catch (error) {
        console.log('No valid existing auth found');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkExistingAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Use the real global admin login API
      const response = await api.globalAdminLogin(email, password);
      
      const data = response.data as any;
      if (response.success && data?.accessToken) {
        // Store the tokens
        tokenManager.setTokens(data.accessToken, data.refreshToken);
        
        // Store global admin flag
        localStorage.setItem('isGlobalAdmin', 'true');
        
        // Redirect to admin dashboard
        router.push('/admin');
      } else {
        setError('Invalid global admin credentials');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      console.error('Global admin login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Finhome360 Global Admin
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the global administration dashboard
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@finhome360.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}

          <div>
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Global admin access required. For regular tenant access, use your tenant subdomain.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}