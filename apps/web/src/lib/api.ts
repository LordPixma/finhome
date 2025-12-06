import type { ApiResponse } from '@finhome360/shared';

// Use the environment variable if available, otherwise fallback to production API
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.finhome360.com'
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
    console.error('API Error:', {
      url,
      status: response.status,
      error: data.error,
      details: data.error?.details
    });
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

  // Password Reset
  requestPasswordReset: (email: string) =>
    apiClient('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: {}, // No auth header
    }),
  resetPassword: (token: string, password: string) =>
    apiClient('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
      headers: {}, // No auth header
    }),

  // Accounts
  getAccounts: () => apiClient('/api/accounts'),
  getAccount: (id: string) => apiClient(`/api/accounts/${id}`),
  createAccount: (data: any) => apiClient('/api/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: string, data: any) => apiClient(`/api/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: (id: string) => apiClient(`/api/accounts/${id}`, { method: 'DELETE' }),
  syncAccount: (id: string) => apiClient(`/api/accounts/${id}/sync`, { method: 'POST' }),

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
  getAccountPerformance: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString();
    return apiClient(`/api/analytics/account-performance${query ? '?' + query : ''}`);
  },
  getCategoryTrends: (params?: { categoryId?: string; startDate?: string; endDate?: string; groupBy?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.groupBy) searchParams.append('groupBy', params.groupBy);
    const query = searchParams.toString();
    return apiClient(`/api/analytics/category-trends${query ? '?' + query : ''}`);
  },
  getTopMerchants: (limit?: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString();
    return apiClient(`/api/analytics/top-merchants${query ? '?' + query : ''}`);
  },
  getTransactionVelocity: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString();
    return apiClient(`/api/analytics/transaction-velocity${query ? '?' + query : ''}`);
  },
  getComparativeAnalytics: (period?: string, compareCount?: number) => {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (compareCount) params.append('compareCount', compareCount.toString());
    const query = params.toString();
    return apiClient(`/api/analytics/comparative${query ? '?' + query : ''}`);
  },

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
  getImportLogs: () => apiClient('/api/logs/import'),
  getImportLog: (id: string) => apiClient(`/api/files/logs/${id}`),
  getAuditLogs: () => apiClient('/api/logs/audit'),

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
  deleteTenant: (confirmations: string[]) => apiClient('/api/tenant/delete', { 
    method: 'DELETE', 
    body: JSON.stringify({ confirmations }) 
  }),
  
  // Multi-tenant User Support
  getUserTenants: () => apiClient('/api/user/tenants'),
  switchTenant: (tenantId: string) => apiClient('/api/user/switch-tenant', {
    method: 'POST',
    body: JSON.stringify({ tenantId })
  }),

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

  // AI Report (PDF download)
  downloadAIReport: async (period?: string) => {
    const params = new URLSearchParams();
    if (period) params.set('period', period);
    const token = tokenManager.getAccessToken();
    const res = await fetch(`${API_URL}/api/ai/report${params.toString() ? `?${params.toString()}` : ''}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      try {
        const data = await res.json();
        throw new Error(data?.error?.message || 'Failed to generate report');
      } catch {
        throw new Error('Failed to generate report');
      }
    }
    return await res.blob();
  },

  // Banking / Open Banking (TrueLayer)
  createBankLink: (redirectUrl?: string) => 
    apiClient('/api/banking/link', { 
      method: 'POST', 
      body: JSON.stringify({ redirectUrl: redirectUrl || '/dashboard/banking' }) 
    }),
  getBankConnections: () => apiClient('/api/banking/connections'),
  syncBankConnection: (connectionId: string) => 
    apiClient(`/api/banking/connections/${connectionId}/sync`, { method: 'POST' }),
  syncAllBankConnections: () => 
    apiClient('/api/banking/connections/sync-all', { method: 'POST' }),
  disconnectBankConnection: (connectionId: string) => 
    apiClient(`/api/banking/connections/${connectionId}`, { method: 'DELETE' }),

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
    updateTenantStatus: (id: string, suspended: boolean) => apiClient(`/api/admin/tenants/${id}/status`, { 
      method: 'PUT', 
      body: JSON.stringify({ suspended }) 
    }),
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
    
    // Analytics
    getAnalyticsDashboard: () => apiClient('/api/admin/analytics/dashboard'),
    getGlobalAnalytics: (startDate: string, endDate: string) => apiClient('/api/admin/analytics/global', { 
      method: 'POST', 
      body: JSON.stringify({ startDate, endDate }) 
    }),
    getTopTenants: (startDate: string, endDate: string, metric = 'transactions', limit = 10) => apiClient('/api/admin/analytics/top-tenants', { 
      method: 'POST', 
      body: JSON.stringify({ startDate, endDate, metric, limit }) 
    }),
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
    getTopTenantsAnalytics: () => apiClient('/api/admin/tenant-analytics/top-tenants'),
    getUserActivity: () => apiClient('/api/admin/tenant-analytics/user-activity'),
    
    // Metrics
    getSystemMetrics: () => apiClient('/api/admin/metrics/overview'),
    getAPIUsage: (timeRange?: { startDate: string; endDate: string }) => {
      if (timeRange) {
        return apiClient('/api/admin/metrics/api-analytics', {
          method: 'POST',
          body: JSON.stringify(timeRange)
        });
      }
      // Default to last 24 hours if no time range provided
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      return apiClient('/api/admin/metrics/api-analytics', {
        method: 'POST',
        body: JSON.stringify({ startDate, endDate })
      });
    },
    getPerformanceMetrics: () => apiClient('/api/admin/metrics/performance'),
    getErrorMetrics: (timeRange?: { startDate: string; endDate: string }) => {
      if (timeRange) {
        return apiClient('/api/admin/metrics/errors', {
          method: 'POST',
          body: JSON.stringify(timeRange)
        });
      }
      // Default to last 24 hours if no time range provided
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      return apiClient('/api/admin/metrics/errors', {
        method: 'POST',
        body: JSON.stringify({ startDate, endDate })
      });
    },
    getHealthCheck: () => apiClient('/api/admin/metrics/health'),
    getSystemDashboard: () => apiClient('/api/admin/metrics/dashboard'),
    getResourceMetrics: () => apiClient('/api/admin/metrics/resources'),
    
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

  // Financial Health
  financialHealth: {
    getSummary: () => apiClient('/api/financial-health/summary'),
    getScore: () => apiClient('/api/financial-health/score'),
    calculateScore: () => apiClient('/api/financial-health/score/calculate', { method: 'POST' }),
    getScoreHistory: (months?: number) => {
      const params = months ? `?months=${months}` : '';
      return apiClient(`/api/financial-health/score/history${params}`);
    },
    getProfile: () => apiClient('/api/financial-health/profile'),
    updateProfile: (data: any) => apiClient('/api/financial-health/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    getInsights: () => apiClient('/api/financial-health/insights'),
    updateInsightStatus: (id: string, status: { isRead?: boolean; isDismissed?: boolean; isActedUpon?: boolean }) =>
      apiClient(`/api/financial-health/insights/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(status)
      }),
    getDebts: () => apiClient('/api/financial-health/debts'),
    createDebt: (data: any) => apiClient('/api/financial-health/debts', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    updateDebt: (id: string, data: any) => apiClient(`/api/financial-health/debts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  },

  // Credit Risk Assessment
  creditRisk: {
    getSummary: () => apiClient('/api/credit-risk/summary'),
    getScore: () => apiClient('/api/credit-risk/score'),
    calculateScore: () => apiClient('/api/credit-risk/score/calculate', { method: 'POST' }),
    getScoreHistory: (months?: number) => {
      const params = months ? `?months=${months}` : '';
      return apiClient(`/api/credit-risk/score/history${params}`);
    },
    // Loan Affordability
    calculateAffordability: (data: {
      loanType: 'mortgage' | 'personal' | 'auto' | 'credit_card' | 'student' | 'business' | 'other';
      requestedAmount: number;
      requestedTermMonths?: number;
      estimatedInterestRate?: number;
    }) => apiClient('/api/credit-risk/affordability', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    getAffordabilityAssessments: (limit?: number) => {
      const params = limit ? `?limit=${limit}` : '';
      return apiClient(`/api/credit-risk/affordability${params}`);
    },
    getAffordabilityAssessment: (id: string) => apiClient(`/api/credit-risk/affordability/${id}`),
    // Credit Bureau (future)
    getBureauConnections: () => apiClient('/api/credit-risk/bureaus'),
    getCreditReports: (limit?: number) => {
      const params = limit ? `?limit=${limit}` : '';
      return apiClient(`/api/credit-risk/reports${params}`);
    },
  },

  // User MFA
  mfa: {
    getStatus: () => apiClient('/api/mfa/status'),
    setup: () => apiClient('/api/mfa/setup', { method: 'POST', body: JSON.stringify({}) }),
    confirm: (token: string, secret: string) => apiClient('/api/mfa/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, secret })
    }),
    verify: (email: string, token: string, rememberDevice?: boolean) => apiClient('/api/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ email, token, rememberDevice }),
      headers: {} // No auth header for MFA verification during login
    }),
    disable: (token: string) => apiClient('/api/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ token })
    }),
    regenerateBackupCodes: () => apiClient('/api/mfa/regenerate-backup-codes', { method: 'POST' }),
    setRecoveryEmail: (email: string) => apiClient('/api/mfa/recovery-email', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),
    sendBackupCodes: () => apiClient('/api/mfa/send-backup-codes', { method: 'POST' }),
    getTrustedDevices: () => apiClient('/api/mfa/trusted-devices'),
    removeTrustedDevice: (deviceId: string) => apiClient(`/api/mfa/trusted-devices/${deviceId}`, {
      method: 'DELETE'
    }),
  },
};

