'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';

interface Tenant {
  id: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'member';
  tenantName: string;
  tenantSubdomain: string;
  displayName?: string;
}

interface TenantSelectorProps {
  currentTenant?: Tenant;
  onTenantSwitch: (tenant: Tenant) => void;
}

export default function TenantSelector({ currentTenant, onTenantSwitch }: TenantSelectorProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserTenants();
  }, []);

  const loadUserTenants = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // This would be a new API endpoint to get user's tenants
      const response = await api.getUserTenants() as any;
      
      if (response.success) {
        setTenants(response.data);
      } else {
        setError('Failed to load tenants');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTenantSwitch = async (tenant: Tenant) => {
    if (tenant.tenantId === currentTenant?.tenantId) {
      setShowDropdown(false);
      return;
    }

    try {
      setIsSwitching(true);
      setError('');

      // This would be a new API endpoint to switch tenants
      const response = await api.switchTenant(tenant.tenantId) as any;
      
      if (response.success) {
        // Update tokens
        if (response.data.accessToken && response.data.refreshToken) {
          localStorage.setItem('accessToken', response.data.accessToken);
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        
        onTenantSwitch(tenant);
        setShowDropdown(false);
        
        // Refresh the page to reload with new tenant context
        window.location.reload();
      } else {
        setError(response.error?.message || 'Failed to switch tenant');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to switch tenant');
    } finally {
      setIsSwitching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        Loading tenants...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (tenants.length <= 1) {
    return (
      <div className="text-sm text-gray-600">
        {currentTenant?.tenantName || 'No tenant selected'}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isSwitching}
        className={`flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
          isSwitching ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
            {currentTenant?.tenantName?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900">
              {currentTenant?.displayName || currentTenant?.tenantName || 'Select Tenant'}
            </div>
            <div className="text-xs text-gray-500">
              {currentTenant?.role || 'No role'}
            </div>
          </div>
        </div>
        
        {isSwitching ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        ) : (
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${
              showDropdown ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">
              Switch to another tenant
            </div>
            
            {tenants.map((tenant) => (
              <button
                key={tenant.tenantId}
                onClick={() => handleTenantSwitch(tenant)}
                disabled={isSwitching}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                  tenant.tenantId === currentTenant?.tenantId
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'hover:bg-gray-50 text-gray-700'
                } ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-xs">
                  {tenant.tenantName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium">
                    {tenant.displayName || tenant.tenantName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {tenant.role} • {tenant.tenantSubdomain}
                  </div>
                </div>
                {tenant.tenantId === currentTenant?.tenantId && (
                  <div className="text-blue-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
            
            <div className="border-t border-gray-200 mt-2 pt-2">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // Navigate to create tenant page
                  window.location.href = '/create-tenant';
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 text-gray-700 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Create New Tenant</div>
                  <div className="text-xs text-gray-500">Start a new family budget</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}