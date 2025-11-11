/**
 * Cloudflare Workers AI Service
 * 
 * Integrates with Cloudflare Workers AI to provide intelligent financial features:
 * - Smart transaction categorization using NLP
 * - Personalized spending insights and recommendations  
 * - Financial advice and budget optimization
 * - Anomaly detection for unusual spending patterns
 */

export interface WorkersAIService {
  // Transaction Intelligence
  categorizeTransaction(description: string, amount: number): Promise<CategorySuggestion>;
  analyzeSpendingPatterns(transactions: Transaction[]): Promise<SpendingInsights>;
  detectAnomalies(transactions: Transaction[]): Promise<AnomalyAlert[]>;
  
  // Financial Advice
  generateBudgetRecommendations(profile: UserProfile, spending: SpendingData): Promise<BudgetAdvice>;
  provideFiscalGuidance(question: string, context: FinancialContext): Promise<string>;
  
  // Smart Insights
  summarizeMonthlySpending(transactions: Transaction[]): Promise<string>;
  predictFutureSpending(historicalData: SpendingHistory): Promise<PredictionResult>;
}

export interface CategorySuggestion {
  category: string;
  confidence: number;
  reasoning: string;
  alternativeCategories?: string[];
}

export interface SpendingInsights {
  summary: string;
  trends: {
    category: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    percentage: number;
  }[];
  recommendations: string[];
  riskAreas: string[];
  highlights?: string[]; // Positive financial behaviors
}

export interface AnomalyAlert {
  type: 'unusual_amount' | 'new_merchant' | 'category_spike' | 'location_change';
  severity: 'low' | 'medium' | 'high';
  description: string;
  transactionId: string;
  suggestedAction: string;
}

export interface BudgetAdvice {
  overallScore: number; // 1-100
  recommendations: {
    category: string;
    currentSpending: number;
    recommendedBudget: number;
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  savings_opportunities: string[];
  warnings: string[];
}

export interface FinancialContext {
  monthlyIncome: number;
  currentBudgets: Budget[];
  goals: Goal[];
  demographics: {
    age?: number;
    location?: string;
    familySize?: number;
  };
}

// Transaction and data types
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  merchant?: string;
}

export interface UserProfile {
  monthlyIncome: number;
  age?: number;
  familySize: number;
  financialGoals: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
}

export interface SpendingData {
  monthlySpending: Record<string, number>; // category -> amount
  trends: Record<string, number>; // category -> percentage change
}

export interface Budget {
  category: string;
  amount: number;
  spent: number;
}

export interface Goal {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

export interface SpendingHistory {
  monthlyData: Record<string, number>; // month -> total spending
  categoryHistory: Record<string, Record<string, number>>; // category -> month -> amount
  trends: Record<string, number>; // category -> growth rate
}

export interface PredictionResult {
  nextMonthPrediction: Record<string, number>; // category -> predicted amount
  confidenceScore: number;
  insights: string[];
  recommendations: string[];
}