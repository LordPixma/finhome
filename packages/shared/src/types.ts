// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Analytics Types
export interface SpendingAnalytics {
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  byCategory: {
    categoryId: string;
    categoryName: string;
    amount: number;
    percentage: number;
  }[];
  trend: {
    date: string;
    income: number;
    expenses: number;
  }[];
}

export interface BudgetProgress {
  budgetId: string;
  categoryName: string;
  allocated: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'on-track' | 'warning' | 'exceeded';
}

// CSV/OFX Types
export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance?: number;
}

export interface FileParseResult {
  transactions: ParsedTransaction[];
  accountInfo?: {
    accountNumber?: string;
    bankName?: string;
  };
}

// Auth Types
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: 'admin' | 'member';
}

// AI Categorization Types
export interface CategorizationResult {
  applied: boolean;
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
  matchedKeywords: string[];
  action: 'auto-assign' | 'suggest' | 'manual';
  reasoning: string;
}

export interface BatchCategorizationResult {
  processed: number;
  applied: number;
  suggestions: {
    transactionId: string;
    categoryId: string | null;
    categoryName: string | null;
    confidence: number;
  }[];
}

export interface CategorizationStats {
  totalTransactions: number;
  categorizedTransactions: number;
  uncategorizedTransactions: number;
  categorizationRate: number;
  topMerchants: {
    merchant: string;
    count: number;
    category: string;
  }[];
}
