'use client';

import { useEffect, useState } from 'react';
import { getCurrentSubdomain } from '@/lib/subdomain';
import { api } from '@/lib/api';

interface TenantInfo {
  id: string;
  name: string;
  subdomain: string;
}

export function TenantIndicator() {
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTenantInfo = async () => {
      try {
        const currentSubdomain = getCurrentSubdomain();
        
        if (currentSubdomain) {
          // We have a tenant context, fetch tenant info
          const response = await api.getTenantInfo() as any;
          if (response.success && response.data) {
            setTenantInfo(response.data);
          }
        }
      } catch (error) {
        console.warn('Failed to load tenant info:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTenantInfo();
  }, []);

  if (loading) return null;

  if (!tenantInfo) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              No tenant context detected
            </h3>
            <div className="mt-1 text-sm text-yellow-700">
              You're accessing the app without a specific tenant. Some features may be limited.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-blue-800">
            Tenant: {tenantInfo.name}
          </h3>
          <div className="mt-1 text-sm text-blue-700">
            Subdomain: <code className="bg-blue-100 px-1 rounded">{tenantInfo.subdomain}</code>
            {getCurrentSubdomain() && (
              <span className="ml-2 text-xs text-green-600">✓ Active</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}