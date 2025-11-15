'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tokenManager } from '@/lib/api';

interface GlobalAdminGuardProps {
  children: React.ReactNode;
}

export default function GlobalAdminGuard({ children }: GlobalAdminGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkGlobalAdminAccess = () => {
      try {
        // Check if user is logged in
        const token = tokenManager.getAccessToken();
        if (!token) {
          console.log('No access token found, redirecting to login');
          router.push('/admin/login');
          return;
        }

        // Decode JWT token to check global admin status
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isGlobalAdmin = payload.isGlobalAdmin || payload.is_global_admin;
        
        // Also check localStorage flag as backup
        const localStorageFlag = localStorage.getItem('isGlobalAdmin') === 'true';
        
        if (isGlobalAdmin || localStorageFlag) {
          setIsAuthorized(true);
        } else {
          console.log('User is not a global admin, denying access');
          setIsAuthorized(false);
          // Redirect to main app or show unauthorized message
          router.push('/unauthorized');
        }
      } catch (error) {
        console.error('Error checking global admin access:', error);
        setIsAuthorized(false);
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkGlobalAdminAccess();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-8">
            <svg className="mx-auto h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-8">
            You do not have permission to access the global admin area. This section is restricted to global administrators only.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => router.push('/admin/login')}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Admin Login
            </button>
            <button
              onClick={() => {
                // Clear any stored tokens and redirect to main app
                tokenManager.clearTokens();
                localStorage.removeItem('isGlobalAdmin');
                window.location.href = '/';
              }}
              className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
            >
              Return to Main App
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}