import { eq, and, desc, gte } from 'drizzle-orm';
import { transactions } from '../db/schema';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '../db/schema';

type DbType = DrizzleD1Database<typeof schema>;

export interface DetectedSubscription {
  id: string;
  name: string;
  merchant: string;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  lastChargeDate: string;
  nextChargeDate: string;
  category: string;
  isActive: boolean;
  confidence: number; // 0-100 confidence score
  transactionCount: number;
  totalSpent: number;
}

export interface SubscriptionSummary {
  totalMonthly: number;
  totalYearly: number;
  activeCount: number;
  subscriptions: DetectedSubscription[];
}

interface TransactionPattern {
  description: string;
  merchant: string;
  amounts: number[];
  dates: Date[];
  category: string;
}

// Common subscription keywords to help identify subscriptions
const SUBSCRIPTION_KEYWORDS = [
  'netflix', 'spotify', 'amazon prime', 'disney', 'hulu', 'hbo', 'apple',
  'google', 'microsoft', 'adobe', 'dropbox', 'icloud', 'youtube',
  'gym', 'fitness', 'membership', 'subscription', 'monthly', 'annual',
  'insurance', 'phone', 'mobile', 'broadband', 'internet', 'utility',
  'electricity', 'gas', 'water', 'council tax', 'rent',
  'linkedin', 'canva', 'figma', 'notion', 'slack', 'zoom',
  'playstation', 'xbox', 'nintendo', 'steam',
  'audible', 'kindle', 'scribd', 'medium',
  'grammarly', 'lastpass', '1password', 'nordvpn', 'expressvpn'
];

export class SubscriptionsService {
  constructor(private db: DbType) {}

  async detectSubscriptions(tenantId: string): Promise<SubscriptionSummary> {
    // Get transactions from the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentTransactions = await this.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          gte(transactions.date, sixMonthsAgo),
          eq(transactions.type, 'expense')
        )
      )
      .orderBy(desc(transactions.date));

    // Group transactions by similar descriptions/merchants
    const patterns = this.groupTransactionsByPattern(recentTransactions);

    // Analyze patterns to detect subscriptions
    const detectedSubscriptions = this.analyzePatterns(patterns);

    // Calculate summary
    const activeSubscriptions = detectedSubscriptions.filter(s => s.isActive);
    const totalMonthly = this.calculateMonthlyTotal(activeSubscriptions);
    const totalYearly = totalMonthly * 12;

    return {
      totalMonthly,
      totalYearly,
      activeCount: activeSubscriptions.length,
      subscriptions: detectedSubscriptions.sort((a, b) => b.confidence - a.confidence)
    };
  }

  private groupTransactionsByPattern(txns: any[]): Map<string, TransactionPattern> {
    const patterns = new Map<string, TransactionPattern>();

    for (const txn of txns) {
      // Normalize the description to find similar transactions
      const normalizedKey = this.normalizeDescription(txn.description || txn.merchant || '');

      if (!normalizedKey) continue;

      if (patterns.has(normalizedKey)) {
        const pattern = patterns.get(normalizedKey)!;
        pattern.amounts.push(Math.abs(Number(txn.amount)));
        pattern.dates.push(new Date(txn.date));
      } else {
        patterns.set(normalizedKey, {
          description: txn.description || txn.merchant || '',
          merchant: txn.merchant || txn.description || '',
          amounts: [Math.abs(Number(txn.amount))],
          dates: [new Date(txn.date)],
          category: txn.categoryName || 'Uncategorized'
        });
      }
    }

    return patterns;
  }

  private normalizeDescription(desc: string): string {
    // Remove numbers, special characters, and normalize to lowercase
    return desc
      .toLowerCase()
      .replace(/[0-9]/g, '')
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 30); // Limit length for grouping
  }

  private analyzePatterns(patterns: Map<string, TransactionPattern>): DetectedSubscription[] {
    const subscriptions: DetectedSubscription[] = [];

    for (const [key, pattern] of patterns) {
      // Need at least 2 transactions to detect a pattern
      if (pattern.amounts.length < 2) continue;

      // Check if amounts are consistent (within 10% variance)
      const avgAmount = pattern.amounts.reduce((a, b) => a + b, 0) / pattern.amounts.length;
      const amountVariance = pattern.amounts.every(
        amt => Math.abs(amt - avgAmount) / avgAmount < 0.1
      );

      if (!amountVariance) continue;

      // Analyze date intervals to determine frequency
      const sortedDates = pattern.dates.sort((a, b) => a.getTime() - b.getTime());
      const intervals = this.calculateIntervals(sortedDates);

      if (intervals.length === 0) continue;

      const frequency = this.determineFrequency(intervals);
      if (!frequency) continue;

      // Calculate confidence score
      const confidence = this.calculateConfidence(pattern, intervals);

      // Skip low confidence detections
      if (confidence < 40) continue;

      // Determine if subscription is still active (last charge within expected interval)
      const lastDate = sortedDates[sortedDates.length - 1];
      const isActive = this.isSubscriptionActive(lastDate, frequency);

      // Calculate next charge date
      const nextChargeDate = this.calculateNextChargeDate(lastDate, frequency);

      // Check if description matches known subscription keywords for higher confidence
      const matchesKeyword = SUBSCRIPTION_KEYWORDS.some(kw =>
        pattern.description.toLowerCase().includes(kw) ||
        pattern.merchant.toLowerCase().includes(kw)
      );

      const finalConfidence = matchesKeyword ? Math.min(confidence + 20, 100) : confidence;

      subscriptions.push({
        id: this.generateId(key),
        name: this.formatSubscriptionName(pattern.merchant),
        merchant: pattern.merchant,
        amount: Math.round(avgAmount * 100) / 100,
        currency: 'GBP', // Default, should come from tenant settings
        frequency,
        lastChargeDate: lastDate.toISOString().split('T')[0],
        nextChargeDate,
        category: pattern.category,
        isActive,
        confidence: Math.round(finalConfidence),
        transactionCount: pattern.amounts.length,
        totalSpent: Math.round(pattern.amounts.reduce((a, b) => a + b, 0) * 100) / 100
      });
    }

    return subscriptions;
  }

  private calculateIntervals(dates: Date[]): number[] {
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const diff = dates[i].getTime() - dates[i - 1].getTime();
      const days = Math.round(diff / (1000 * 60 * 60 * 24));
      intervals.push(days);
    }
    return intervals;
  }

  private determineFrequency(intervals: number[]): 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null {
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Allow 20% variance in interval detection
    if (avgInterval >= 5 && avgInterval <= 9) return 'weekly';
    if (avgInterval >= 25 && avgInterval <= 35) return 'monthly';
    if (avgInterval >= 80 && avgInterval <= 100) return 'quarterly';
    if (avgInterval >= 330 && avgInterval <= 400) return 'yearly';

    return null;
  }

  private calculateConfidence(
    pattern: TransactionPattern,
    intervals: number[]
  ): number {
    let confidence = 50; // Base confidence

    // More transactions = higher confidence
    if (pattern.amounts.length >= 3) confidence += 10;
    if (pattern.amounts.length >= 6) confidence += 10;

    // Consistent intervals = higher confidence
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const intervalVariance = intervals.every(
      int => Math.abs(int - avgInterval) / avgInterval < 0.15
    );
    if (intervalVariance) confidence += 15;

    // Very consistent amounts = higher confidence
    const amounts = pattern.amounts;
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const tightAmountVariance = amounts.every(
      amt => Math.abs(amt - avgAmount) / avgAmount < 0.02
    );
    if (tightAmountVariance) confidence += 15;

    return confidence;
  }

  private isSubscriptionActive(lastDate: Date, frequency: string): boolean {
    const now = new Date();
    const daysSinceLastCharge = Math.round(
      (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Give some grace period for each frequency
    switch (frequency) {
      case 'weekly':
        return daysSinceLastCharge <= 10;
      case 'monthly':
        return daysSinceLastCharge <= 40;
      case 'quarterly':
        return daysSinceLastCharge <= 100;
      case 'yearly':
        return daysSinceLastCharge <= 400;
      default:
        return false;
    }
  }

  private calculateNextChargeDate(lastDate: Date, frequency: string): string {
    const nextDate = new Date(lastDate);

    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    // If next date is in the past, calculate from today
    const now = new Date();
    if (nextDate < now) {
      return this.calculateNextChargeDate(nextDate, frequency);
    }

    return nextDate.toISOString().split('T')[0];
  }

  private calculateMonthlyTotal(subscriptions: DetectedSubscription[]): number {
    let total = 0;

    for (const sub of subscriptions) {
      switch (sub.frequency) {
        case 'weekly':
          total += sub.amount * 4.33; // Average weeks per month
          break;
        case 'monthly':
          total += sub.amount;
          break;
        case 'quarterly':
          total += sub.amount / 3;
          break;
        case 'yearly':
          total += sub.amount / 12;
          break;
      }
    }

    return Math.round(total * 100) / 100;
  }

  private generateId(key: string): string {
    // Simple hash function for consistent IDs
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `sub_${Math.abs(hash).toString(36)}`;
  }

  private formatSubscriptionName(merchant: string): string {
    // Capitalize first letter of each word
    return merchant
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .slice(0, 50);
  }
}
