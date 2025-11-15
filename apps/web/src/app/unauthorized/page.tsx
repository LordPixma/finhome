'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { tokenManager } from '@/lib/api';

export default function UnauthorizedPage() {
  const router = useRouter();

  const handleLogout = () => {
    tokenManager.clearTokens();
    localStorage.removeItem('isGlobalAdmin');
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <svg
            className="mx-auto h-16 w-16 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You don't have permission to access this area.
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <p className="text-gray-500">
            The admin portal is restricted to global administrators only. 
            If you believe you should have access, please contact your system administrator.
          </p>
          
          <div className="flex flex-col space-y-3">
            <Link
              href="/admin/login"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Global Admin Login
            </Link>
            
            <button
              onClick={handleLogout}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to Main Application
            </button>
          </div>
        </div>
        
        <div className="mt-6 text-xs text-gray-400">
          <p>If you're experiencing technical issues, please contact support.</p>
        </div>
      </div>
    </div>
  );
}