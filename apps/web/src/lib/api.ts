import type { ApiResponse } from '@finhome/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

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
    }),

  register: (data: { email: string; password: string; name: string; tenantName: string }) =>
    apiClient('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Transactions
  getTransactions: (token: string) =>
    apiClient('/api/transactions', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  createTransaction: (token: string, data: any) =>
    apiClient('/api/transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  // Budgets
  getBudgets: (token: string) =>
    apiClient('/api/budgets', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  // Analytics
  getSpendingAnalytics: (token: string) =>
    apiClient('/api/analytics/spending', {
      headers: { Authorization: `Bearer ${token}` },
    }),
};
