import type { ApiResponse } from '@finhome360/shared';

// Use the environment variable if available, otherwise fallback to production API
// TEMPORARY: Using workers.dev domain due to custom domain cache issue
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://finhome.samuel-1e5.workers.dev'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8787');

// Token management
export const tokenManager = {
  getAccessToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },
  getRefreshToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  },
  setTokens: (accessToken: string, refreshToken: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },
  clearTokens: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`;
  
  // Get token from storage
  const token = tokenManager.getAccessToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  // Add auth header if token exists and not already set
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle token refresh on 401
  if (response.status === 401 && tokenManager.getRefreshToken()) {
    const refreshToken = tokenManager.getRefreshToken();
    try {
      const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        tokenManager.setTokens(refreshData.data.accessToken, refreshData.data.refreshToken);
        
        // Retry original request with new token
        headers.Authorization = `Bearer ${refreshData.data.accessToken}`;
        response = await fetch(url, { ...options, headers });
      } else {
        tokenManager.clearTokens();
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
    } catch (error) {
      tokenManager.clearTokens();
      window.location.href = '/login';
      throw error;
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'An error occurred');
  }

  return data;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiClient('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: {}, // No auth header for login
    }),

  register: (data: { email: string; password: string; name: string; tenantName: string; subdomain: string }) =>
    apiClient('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {}, // No auth header for register
    }),

  refresh: (refreshToken: string) =>
    apiClient('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      headers: {}, // No auth header for refresh
    }),

  // Accounts
  getAccounts: () => apiClient('/api/accounts'),
  getAccount: (id: string) => apiClient(`/api/accounts/${id}`),
  createAccount: (data: any) => apiClient('/api/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: string, data: any) => apiClient(`/api/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: (id: string) => apiClient(`/api/accounts/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => apiClient('/api/categories'),
  getCategory: (id: string) => apiClient(`/api/categories/${id}`),
  createCategory: (data: any) => apiClient('/api/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: any) => apiClient(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => apiClient(`/api/categories/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: () => apiClient('/api/transactions'),
  getTransaction: (id: string) => apiClient(`/api/transactions/${id}`),
  createTransaction: (data: any) => apiClient('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: string, data: any) => apiClient(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id: string) => apiClient(`/api/transactions/${id}`, { method: 'DELETE' }),
  
  // Bulk Operations
  bulkDeleteTransactions: (transactionIds: string[]) => 
    apiClient('/api/transactions/bulk', { 
      method: 'DELETE', 
      body: JSON.stringify({ transactionIds }) 
    }),
  bulkArchiveTransactions: (transactionIds: string[]) => 
    apiClient('/api/transactions/bulk/archive', { 
      method: 'PATCH', 
      body: JSON.stringify({ transactionIds }) 
    }),
  clearAllTransactions: () => 
    apiClient('/api/transactions/clear', { 
      method: 'DELETE', 
      body: JSON.stringify({ confirm: 'DELETE_ALL_TRANSACTIONS' }) 
    }),
  
  // AI Categorization
  autoCategorizeTransaction: (id: string) => 
    apiClient(`/api/transactions/${id}/auto-categorize`, { method: 'POST' }),
  autoCategorizeTransactionsBatch: (data?: { transactionIds?: string[]; autoApply?: boolean }) =>
    apiClient('/api/transactions/auto-categorize-batch', { 
      method: 'POST', 
      body: JSON.stringify(data || {}) 
    }),
  getCategorizationStats: () => apiClient('/api/transactions/categorization-stats'),

  // Budgets
  getBudgets: () => apiClient('/api/budgets'),
  getBudget: (id: string) => apiClient(`/api/budgets/${id}`),
  createBudget: (data: any) => apiClient('/api/budgets', { method: 'POST', body: JSON.stringify(data) }),
  updateBudget: (id: string, data: any) => apiClient(`/api/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBudget: (id: string) => apiClient(`/api/budgets/${id}`, { method: 'DELETE' }),

  // Bill Reminders
  getBillReminders: () => apiClient('/api/bill-reminders'),
  getBillReminder: (id: string) => apiClient(`/api/bill-reminders/${id}`),
  createBillReminder: (data: any) => apiClient('/api/bill-reminders', { method: 'POST', body: JSON.stringify(data) }),
  updateBillReminder: (id: string, data: any) => apiClient(`/api/bill-reminders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBillReminder: (id: string) => apiClient(`/api/bill-reminders/${id}`, { method: 'DELETE' }),

  // Analytics
  getSpendingAnalytics: () => apiClient('/api/analytics/spending'),
  getCashflowAnalytics: () => apiClient('/api/analytics/cashflow'),

  // Files
  uploadFile: (file: File, accountId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('accountId', accountId);
    
    const token = tokenManager.getAccessToken();
    return fetch(`${API_URL}/api/files/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(res => res.json());
  },
  getUploads: () => apiClient('/api/files/uploads'),

  // Recurring Transactions
  getRecurringTransactions: () => apiClient('/api/recurring-transactions'),
  getRecurringTransaction: (id: string) => apiClient(`/api/recurring-transactions/${id}`),
  createRecurringTransaction: (data: any) => apiClient('/api/recurring-transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateRecurringTransaction: (id: string, data: any) => apiClient(`/api/recurring-transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecurringTransaction: (id: string) => apiClient(`/api/recurring-transactions/${id}`, { method: 'DELETE' }),

  // Goals
  getGoals: () => apiClient('/api/goals'),
  getGoal: (id: string) => apiClient(`/api/goals/${id}`),
  createGoal: (data: any) => apiClient('/api/goals', { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (id: string, data: any) => apiClient(`/api/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGoal: (id: string) => apiClient(`/api/goals/${id}`, { method: 'DELETE' }),
  addGoalContribution: (id: string, data: any) => apiClient(`/api/goals/${id}/contributions`, { method: 'POST', body: JSON.stringify(data) }),

  // User Settings
  getSettings: () => apiClient('/api/settings'),
  updateSettings: (data: any) => apiClient('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Tenant
  getTenantInfo: () => apiClient('/api/tenant/info'),

  // User Profile
  getProfile: () => apiClient('/api/profile'),
  updateProfile: (data: any) => apiClient('/api/profile/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data: any) => apiClient('/api/profile/change-password', { method: 'POST', body: JSON.stringify(data) }),
  uploadProfilePicture: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient('/api/profile/profile-picture', { 
      method: 'POST', 
      body: formData,
      headers: {} // Let browser set content-type for FormData
    });
  },

  // Tenant Members
  getTenantMembers: () => apiClient('/api/tenant-members'),
  inviteTenantMember: (data: any) => apiClient('/api/tenant-members', { method: 'POST', body: JSON.stringify(data) }),
  updateTenantMember: (id: string, data: any) => apiClient(`/api/tenant-members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeTenantMember: (id: string) => apiClient(`/api/tenant-members/${id}`, { method: 'DELETE' }),

  // AI Features
  aiStatus: () => apiClient('/api/ai/status'),
  categorizeTransaction: (data: { description: string; amount: number }) => 
    apiClient('/api/ai/categorize-transaction', { method: 'POST', body: JSON.stringify(data) }),
  getSpendingInsights: () => apiClient('/api/ai/spending-insights'),
  detectAnomalies: () => apiClient('/api/ai/detect-anomalies'),
  getFinancialAdvice: (data: { question: string; monthlyIncome?: number }) => 
    apiClient('/api/ai/financial-advice', { method: 'POST', body: JSON.stringify(data) }),
  getMonthlySummary: () => apiClient('/api/ai/monthly-summary'),
  getBudgetRecommendations: () => apiClient('/api/ai/budget-recommendations'),

  // Banking endpoints removed for Bankless edition

  // Global Admin
  globalAdminLogin: (email: string, password: string) =>
    apiClient('/api/auth/global-admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: {}, // No auth header for login
    }),
  getGlobalAdminStats: () => apiClient('/api/global-admin/stats'),
  getGlobalAdminTenants: (page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient(`/api/global-admin/tenants${query}`);
  },
  getGlobalAdminTenant: (id: string) => apiClient(`/api/global-admin/tenants/${id}`),
  makeUserGlobalAdmin: (userId: string) => 
    apiClient(`/api/global-admin/users/${userId}/make-global-admin`, { method: 'PUT' }),
  getGlobalAdminAuditLog: (page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient(`/api/global-admin/audit-log${query}`);
  },
  getGlobalAdminSettings: () => apiClient('/api/global-admin/settings'),
  updateGlobalAdminSetting: (key: string, value: string) =>
    apiClient(`/api/global-admin/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),

  // Admin API endpoints
  admin: {
    // Tenants
    getTenants: () => apiClient('/api/admin/tenants'),
    getTenant: (id: string) => apiClient(`/api/admin/tenants/${id}`),
    createTenant: (data: any) => apiClient('/api/admin/tenants', { method: 'POST', body: JSON.stringify(data) }),
    updateTenant: (id: string, data: any) => apiClient(`/api/admin/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    suspendTenant: (id: string) => apiClient(`/api/admin/tenants/${id}/suspend`, { method: 'POST' }),
    activateTenant: (id: string) => apiClient(`/api/admin/tenants/${id}/activate`, { method: 'POST' }),
    
    // Users
    getUsers: () => apiClient('/api/admin/users'),
    getUser: (id: string) => apiClient(`/api/admin/users/${id}`),
    createUser: (data: any) => apiClient('/api/admin/users', { method: 'POST', body: JSON.stringify(data) }),
    updateUser: (id: string, data: any) => apiClient(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    suspendUser: (id: string) => apiClient(`/api/admin/users/${id}/suspend`, { method: 'POST' }),
    activateUser: (id: string) => apiClient(`/api/admin/users/${id}/activate`, { method: 'POST' }),
    
    // MFA
    getMFAStats: () => apiClient('/api/admin/mfa/stats'),
    getMFAUsers: () => apiClient('/api/admin/mfa/users'),
    getMFASettings: () => apiClient('/api/admin/mfa/settings'),
    updateMFASettings: (data: any) => apiClient('/api/admin/mfa/settings', { method: 'PUT', body: JSON.stringify(data) }),
    enableUserMFA: (userId: string) => apiClient(`/api/admin/mfa/users/${userId}/enable`, { method: 'POST' }),
    disableUserMFA: (userId: string) => apiClient(`/api/admin/mfa/users/${userId}/disable`, { method: 'POST' }),
    resetUserMFA: (userId: string) => apiClient(`/api/admin/mfa/users/${userId}/reset`, { method: 'POST' }),
    generateBackupCodes: (userId: string) => apiClient(`/api/admin/mfa/users/${userId}/backup-codes`, { method: 'POST' }),
    
    // Security
    getSecurityIncidents: () => apiClient('/api/admin/security/incidents'),
    getSecurityIncident: (id: string) => apiClient(`/api/admin/security/incidents/${id}`),
    acknowledgeIncident: (id: string) => apiClient(`/api/admin/security/incidents/${id}/acknowledge`, { method: 'POST' }),
    resolveIncident: (id: string) => apiClient(`/api/admin/security/incidents/${id}/resolve`, { method: 'POST' }),
    assignIncident: (id: string, assignee: string) => apiClient(`/api/admin/security/incidents/${id}/assign`, { 
      method: 'POST', 
      body: JSON.stringify({ assignee }) 
    }),
    
    // Analytics
    getTenantAnalytics: () => apiClient('/api/admin/tenant-analytics/overview'),
    getTenantMetrics: (tenantId: string) => apiClient(`/api/admin/tenant-analytics/tenant/${tenantId}`),
    getTopTenants: () => apiClient('/api/admin/tenant-analytics/top-tenants'),
    getUserActivity: () => apiClient('/api/admin/tenant-analytics/user-activity'),
    
    // Metrics
    getSystemMetrics: () => apiClient('/api/admin/metrics/overview'),
    getAPIUsage: () => apiClient('/api/admin/metrics/api-usage'),
    getPerformanceMetrics: () => apiClient('/api/admin/metrics/performance'),
    getErrorMetrics: () => apiClient('/api/admin/metrics/errors'),
    getHealthCheck: () => apiClient('/api/admin/metrics/health'),
    
    // Alerts
    getAlerts: () => apiClient('/api/admin/metrics/alerts'),
    getAlert: (id: string) => apiClient(`/api/admin/metrics/alerts/${id}`),
    acknowledgeAlert: (id: string) => apiClient(`/api/admin/metrics/alerts/${id}/acknowledge`, { method: 'POST' }),
    resolveAlert: (id: string) => apiClient(`/api/admin/metrics/alerts/${id}/resolve`, { method: 'POST' }),
    dismissAlert: (id: string) => apiClient(`/api/admin/metrics/alerts/${id}/dismiss`, { method: 'POST' }),
    getAlertRules: () => apiClient('/api/admin/metrics/alert-rules'),
    createAlertRule: (data: any) => apiClient('/api/admin/metrics/alert-rules', { method: 'POST', body: JSON.stringify(data) }),
    updateAlertRule: (id: string, data: any) => apiClient(`/api/admin/metrics/alert-rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggleAlertRule: (id: string) => apiClient(`/api/admin/metrics/alert-rules/${id}/toggle`, { method: 'POST' }),
  },
};

