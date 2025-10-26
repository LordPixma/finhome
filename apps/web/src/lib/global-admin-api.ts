/**
 * Global Admin API Client
 * Handles authentication and API calls for global admin operations
 */

const ADMIN_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

class GlobalAdminApiClient {
  private getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('globalAdminToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${ADMIN_API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ token: string }>> {
    return this.request('/api/auth/global-admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('globalAdminToken');
    }
  }

  // Platform Statistics
  async getStats(): Promise<ApiResponse<{
    totalTenants: number;
    totalUsers: number;
    totalGlobalAdmins: number;
    recentTenants: number;
    recentUsers: number;
  }>> {
    return this.request('/api/global-admin/stats');
  }

  // Tenant Management
  async getTenants(page = 1, limit = 20): Promise<ApiResponse<{
    tenants: Array<{
      id: string;
      name: string;
      subdomain: string;
      createdAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      hasMore: boolean;
    };
  }>> {
    return this.request(`/api/global-admin/tenants?page=${page}&limit=${limit}`);
  }

  async getTenant(tenantId: string): Promise<ApiResponse<{
    tenant: {
      id: string;
      name: string;
      subdomain: string;
      createdAt: string;
    };
    users: Array<{
      id: string;
      email: string;
      name: string;
      role: string;
      createdAt: string;
    }>;
  }>> {
    return this.request(`/api/global-admin/tenants/${tenantId}`);
  }

  async suspendTenant(tenantId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/global-admin/tenants/${tenantId}/suspend`, {
      method: 'PUT',
    });
  }

  // User Management
  async getUsers(page = 1, limit = 20, tenantFilter = ''): Promise<ApiResponse<{
    users: Array<{
      id: string;
      email: string;
      name: string;
      role: string;
      isGlobalAdmin: boolean;
      tenantName: string;
      subdomain: string;
      createdAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      hasMore: boolean;
    };
  }>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (tenantFilter) {
      params.append('tenant', tenantFilter);
    }

    return this.request(`/api/global-admin/users?${params.toString()}`);
  }

  async makeGlobalAdmin(userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/global-admin/users/${userId}/make-global-admin`, {
      method: 'PUT',
    });
  }

  // Audit Log
  async getAuditLog(page = 1, limit = 50, action = ''): Promise<ApiResponse<{
    auditLog: Array<{
      id: string;
      action: string;
      targetType: string;
      targetId: string;
      details: string;
      ipAddress: string;
      createdAt: string;
      adminName: string;
      adminEmail: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      hasMore: boolean;
    };
  }>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (action) {
      params.append('action', action);
    }

    return this.request(`/api/global-admin/audit-log?${params.toString()}`);
  }

  // Settings
  async getSettings(): Promise<ApiResponse<{
    settings: Array<{
      id: string;
      key: string;
      value: string;
      description: string;
      updatedBy: string;
      updatedAt: string;
    }>;
  }>> {
    return this.request('/api/global-admin/settings');
  }

  async updateSetting(key: string, value: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/global-admin/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }
}

// Export singleton instance
export const globalAdminApi = new GlobalAdminApiClient();