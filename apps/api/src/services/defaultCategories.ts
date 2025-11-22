import { getDb, categories } from '../db';
import { getCurrentTimestamp } from '../utils/timestamp';
import type { D1Database } from '@cloudflare/workers-types';

export interface DefaultCategory {
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon?: string;
  parentId?: string;
}

const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Income Categories
  { name: 'Salary', type: 'income', color: '#10b981', icon: '💼' },
  { name: 'Freelance', type: 'income', color: '#14b8a6', icon: '💻' },
  { name: 'Investments', type: 'income', color: '#06b6d4', icon: '📈' },
  { name: 'Rental Income', type: 'income', color: '#0ea5e9', icon: '🏠' },
  { name: 'Other Income', type: 'income', color: '#3b82f6', icon: '💰' },

  // Expense Categories
  { name: 'Groceries', type: 'expense', color: '#f59e0b', icon: '🛒' },
  { name: 'Dining & Restaurants', type: 'expense', color: '#f97316', icon: '🍽️' },
  { name: 'Transportation', type: 'expense', color: '#ef4444', icon: '🚗' },
  { name: 'Utilities', type: 'expense', color: '#8b5cf6', icon: '⚡' },
  { name: 'Rent/Mortgage', type: 'expense', color: '#ec4899', icon: '🏡' },
  { name: 'Healthcare', type: 'expense', color: '#06b6d4', icon: '⚕️' },
  { name: 'Entertainment', type: 'expense', color: '#d946ef', icon: '🎬' },
  { name: 'Shopping', type: 'expense', color: '#a855f7', icon: '🛍️' },
  { name: 'Insurance', type: 'expense', color: '#3b82f6', icon: '🛡️' },
  { name: 'Education', type: 'expense', color: '#6366f1', icon: '📚' },
  { name: 'Personal Care', type: 'expense', color: '#ec4899', icon: '💅' },
  { name: 'Subscriptions', type: 'expense', color: '#f43f5e', icon: '📱' },
  { name: 'Travel', type: 'expense', color: '#14b8a6', icon: '✈️' },
  { name: 'Gifts & Donations', type: 'expense', color: '#10b981', icon: '🎁' },
  { name: 'Uncategorized', type: 'expense', color: '#6b7280', icon: '❓' },
];

/**
 * Create default categories for a new tenant
 */
export async function createDefaultCategories(db: ReturnType<typeof getDb>, tenantId: string): Promise<void> {
  const now = getCurrentTimestamp();

  const categoryValues = DEFAULT_CATEGORIES.map(category => ({
    id: crypto.randomUUID(),
    tenantId,
    name: category.name,
    type: category.type,
    color: category.color,
    icon: category.icon || null,
    parentId: null,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(categories).values(categoryValues).run();

  console.log(`Created ${categoryValues.length} default categories for tenant ${tenantId}`);
}

/**
 * Get default categories list (for reference)
 */
export function getDefaultCategoriesList(): DefaultCategory[] {
  return DEFAULT_CATEGORIES;
}
