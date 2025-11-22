'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/login';
    }

    // Redirect global admins to admin dashboard
    // Global admins should not access the regular tenant dashboard
    if (!isLoading && isAuthenticated && user?.isGlobalAdmin) {
      window.location.href = '/admin';
    }
  }, [isAuthenticated, isLoading, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Prevent global admins from seeing regular dashboard
  if (user?.isGlobalAdmin) {
    return null;
  }

  return <>{children}</>;
}
