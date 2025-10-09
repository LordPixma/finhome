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
    // Don't show warning for app subdomain - it's optional
    return null;
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