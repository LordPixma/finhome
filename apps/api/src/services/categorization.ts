/**
 * Smart Transaction Categorization Service
 * 
 * Uses keyword matching and pattern recognition to automatically categorize transactions.
 * Learns from historical data to improve accuracy over time.
 * 
 * Features:
 * - Keyword-based matching with confidence scores
 * - Merchant pattern recognition
 * - Historical learning from user corrections
 * - Multi-language support (extendable)
 */

import { eq, and, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { transactions, categories } from '../db/schema';
import * as schema from '../db/schema';

type Database = DrizzleD1Database<typeof schema>;

// Category keyword mappings
const CATEGORY_KEYWORDS: Record<string, { keywords: string[]; aliases: string[] }> = {
  'groceries': {
    keywords: ['walmart', 'kroger', 'safeway', 'whole foods', 'trader joe', 'aldi', 'costco', 'sams club', 'supermarket', 'grocery', 'food mart', 'fresh market', 'food lion', 'publix', 'wegmans', 'sprouts'],
    aliases: ['market', 'mart', 'foods']
  },
  'dining': {
    keywords: ['restaurant', 'cafe', 'coffee', 'starbucks', 'dunkin', 'mcdonald', 'burger', 'pizza', 'chipotle', 'subway', 'taco bell', 'wendys', 'kfc', 'panera', 'chick-fil-a', 'domino', 'papa john', 'diner', 'bistro', 'grill', 'bar & grill', 'eatery', 'kitchen', 'food court'],
    aliases: ['bar', 'pub', 'tavern', 'lounge']
  },
  'transportation': {
    keywords: ['uber', 'lyft', 'taxi', 'shell', 'chevron', 'exxon', 'bp', 'mobil', 'gas station', 'fuel', 'parking', 'toll', 'metro', 'transit', 'bus pass', 'train ticket', 'airline', 'flight', 'car rental', 'hertz', 'enterprise', 'budget rent'],
    aliases: ['gas', 'petroleum', 'service station']
  },
  'entertainment': {
    keywords: ['netflix', 'hulu', 'disney+', 'hbo', 'spotify', 'apple music', 'youtube premium', 'amazon prime', 'cinema', 'theater', 'movie', 'concert', 'ticket', 'gaming', 'xbox', 'playstation', 'steam', 'nintendo', 'amusement park', 'zoo', 'museum', 'bowling', 'arcade'],
    aliases: ['streaming', 'subscription', 'membership']
  },
  'shopping': {
    keywords: ['amazon', 'ebay', 'target', 'best buy', 'macys', 'nordstrom', 'kohls', 'tj maxx', 'marshalls', 'ross', 'old navy', 'gap', 'zara', 'h&m', 'forever 21', 'victoria secret', 'bath & body', 'ulta', 'sephora', 'department store', 'outlet', 'mall'],
    aliases: ['store', 'shop', 'retail', 'boutique']
  },
  'utilities': {
    keywords: ['electric', 'electricity', 'power company', 'gas company', 'water', 'sewer', 'internet', 'cable', 'phone bill', 'mobile', 'wireless', 'verizon', 'at&t', 'tmobile', 'sprint', 'comcast', 'xfinity', 'spectrum', 'cox', 'centurylink'],
    aliases: ['utility', 'service provider', 'telecom']
  },
  'healthcare': {
    keywords: ['pharmacy', 'cvs', 'walgreens', 'rite aid', 'doctor', 'physician', 'dentist', 'dental', 'hospital', 'clinic', 'medical', 'health', 'wellness', 'urgent care', 'lab', 'x-ray', 'mri', 'surgery', 'prescription', 'insurance', 'copay'],
    aliases: ['medical center', 'health center', 'care']
  },
  'fitness': {
    keywords: ['gym', 'fitness', 'yoga', 'pilates', 'crossfit', '24 hour fitness', 'la fitness', 'planet fitness', 'gold gym', 'anytime fitness', 'equinox', 'orangetheory', 'personal trainer', 'workout', 'athletic'],
    aliases: ['health club', 'wellness center', 'sports']
  },
  'education': {
    keywords: ['school', 'university', 'college', 'tuition', 'textbook', 'bookstore', 'course', 'class', 'training', 'seminar', 'workshop', 'certification', 'udemy', 'coursera', 'skillshare', 'masterclass', 'khan academy'],
    aliases: ['academy', 'institute', 'learning']
  },
  'insurance': {
    keywords: ['insurance', 'geico', 'state farm', 'allstate', 'progressive', 'liberty mutual', 'farmers insurance', 'usaa', 'nationwide', 'policy', 'premium', 'deductible'],
    aliases: ['insure', 'coverage']
  },
  'home': {
    keywords: ['home depot', 'lowes', 'ace hardware', 'hardware store', 'paint', 'lumber', 'home improvement', 'furniture', 'ikea', 'wayfair', 'ashley furniture', 'bed bath & beyond', 'home goods', 'pier 1', 'crate & barrel'],
    aliases: ['hardware', 'furnishing', 'decor']
  },
  'personal care': {
    keywords: ['salon', 'barber', 'haircut', 'hair', 'nail', 'manicure', 'pedicure', 'spa', 'massage', 'beauty', 'cosmetic', 'skincare', 'grooming'],
    aliases: ['beauty salon', 'day spa']
  },
  'pets': {
    keywords: ['pet', 'petco', 'petsmart', 'veterinary', 'vet', 'animal hospital', 'dog', 'cat', 'grooming', 'pet food', 'pet supplies'],
    aliases: ['animal care', 'pet shop']
  },
  'clothing': {
    keywords: ['clothing', 'apparel', 'fashion', 'nike', 'adidas', 'under armour', 'foot locker', 'shoe', 'sneaker', 'dress', 'suit', 'jacket', 'pants', 'shirt', 'athletic wear'],
    aliases: ['garment', 'attire', 'footwear']
  },
  'subscriptions': {
    keywords: ['subscription', 'monthly fee', 'annual fee', 'membership', 'patreon', 'onlyfans', 'premium', 'pro account', 'plus plan'],
    aliases: ['recurring', 'auto-renew']
  }
};

export interface CategorizationResult {
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  confidence: number; // 0-1
  matchedKeywords: string[];
  action: 'auto-assign' | 'suggest' | 'manual';
  reasoning: string;
}

export interface MerchantPattern {
  merchantName: string;
  categoryId: string;
  categoryName: string;
  frequency: number;
  lastSeen: Date;
}

/**
 * Normalize transaction description for matching
 */
function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Extract merchant name from transaction description
 * Common patterns: "STARBUCKS #1234 SEATTLE WA", "AMAZON.COM*AB123", "SQ *COFFEE SHOP"
 */
function extractMerchantName(description: string): string {
  const normalized = normalizeDescription(description);
  
  // Remove common transaction prefixes
  let merchant = normalized
    .replace(/^(pos|debit|credit|purchase|payment|transfer|atm|withdrawal|deposit)\s+/i, '')
    .replace(/\s+(pos|debit|credit|purchase|payment)\s*$/i, '')
    .replace(/\*\d+$/g, '') // Remove trailing reference numbers
    .replace(/#\d+/g, '') // Remove store numbers
    .replace(/\d{5,}/g, '') // Remove long numbers (transaction IDs)
    .trim();
  
  // Take first 3 words as merchant name (usually most relevant)
  const words = merchant.split(' ');
  return words.slice(0, 3).join(' ');
}

/**
 * Get historical merchant patterns for a tenant
 */
export async function getMerchantPatterns(
  db: Database,
  tenantId: string
): Promise<Map<string, MerchantPattern>> {
  const patterns = await db
    .select({
      description: transactions.description,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      count: sql<number>`COUNT(*)`,
      lastDate: sql<number>`MAX(${transactions.date})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.tenantId, tenantId))
    .groupBy(transactions.description, transactions.categoryId, categories.name)
    .having(sql`COUNT(*) >= 2`) // Only include merchants seen at least twice
    .all();

  const merchantMap = new Map<string, MerchantPattern>();

  for (const pattern of patterns) {
    const merchantName = extractMerchantName(pattern.description);
    const key = merchantName.toLowerCase();

    if (!merchantMap.has(key) || merchantMap.get(key)!.frequency < pattern.count) {
      merchantMap.set(key, {
        merchantName,
        categoryId: pattern.categoryId,
        categoryName: pattern.categoryName || 'Uncategorized',
        frequency: pattern.count,
        lastSeen: new Date(pattern.lastDate * 1000),
      });
    }
  }

  return merchantMap;
}

/**
 * Match transaction description against keyword database
 */
function matchKeywords(description: string): { category: string; matches: string[]; score: number }[] {
  const normalized = normalizeDescription(description);
  const results: { category: string; matches: string[]; score: number }[] = [];

  for (const [category, { keywords, aliases }] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches: string[] = [];
    let score = 0;

    // Check primary keywords (higher weight)
    for (const keyword of keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        matches.push(keyword);
        score += 10;
      }
    }

    // Check aliases (lower weight)
    for (const alias of aliases) {
      if (normalized.includes(alias.toLowerCase())) {
        matches.push(alias);
        score += 3;
      }
    }

    if (matches.length > 0) {
      results.push({ category, matches, score });
    }
  }

  // Sort by score (highest first)
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Find category by name (case-insensitive, partial match)
 */
async function findCategoryByName(
  db: Database,
  tenantId: string,
  categoryName: string,
  type: 'income' | 'expense' = 'expense'
): Promise<{ id: string; name: string } | null> {
  const category = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(
      and(
        eq(categories.tenantId, tenantId),
        eq(categories.type, type),
        sql`LOWER(${categories.name}) LIKE ${`%${categoryName.toLowerCase()}%`}`
      )
    )
    .limit(1)
    .get();

  return category || null;
}

/**
 * Categorize a single transaction using AI/ML patterns
 */
export async function categorizeTransaction(
  db: Database,
  tenantId: string,
  description: string,
  merchantPatterns?: Map<string, MerchantPattern>
): Promise<CategorizationResult> {
  // Step 1: Check merchant history (highest confidence)
  if (merchantPatterns) {
    const merchantName = extractMerchantName(description);
    const pattern = merchantPatterns.get(merchantName.toLowerCase());

    if (pattern && pattern.frequency >= 3) {
      return {
        suggestedCategoryId: pattern.categoryId,
        suggestedCategoryName: pattern.categoryName,
        confidence: 0.95,
        matchedKeywords: [merchantName],
        action: 'auto-assign',
        reasoning: `You've used "${pattern.categoryName}" for this merchant ${pattern.frequency} times before`,
      };
    }
  }

  // Step 2: Keyword matching
  const keywordMatches = matchKeywords(description);

  if (keywordMatches.length === 0) {
    return {
      suggestedCategoryId: null,
      suggestedCategoryName: null,
      confidence: 0,
      matchedKeywords: [],
      action: 'manual',
      reasoning: 'No matching patterns found. Please categorize manually.',
    };
  }

  // Get top match
  const topMatch = keywordMatches[0];
  const confidence = Math.min(topMatch.score / 10, 1.0); // Normalize to 0-1

  // Find corresponding category in database
  const category = await findCategoryByName(db, tenantId, topMatch.category);

  if (!category) {
    return {
      suggestedCategoryId: null,
      suggestedCategoryName: topMatch.category,
      confidence,
      matchedKeywords: topMatch.matches,
      action: 'suggest',
      reasoning: `Matched keywords: ${topMatch.matches.join(', ')}. Create "${topMatch.category}" category?`,
    };
  }

  // Determine action based on confidence
  let action: 'auto-assign' | 'suggest' | 'manual';
  if (confidence >= 0.8) {
    action = 'auto-assign';
  } else if (confidence >= 0.5) {
    action = 'suggest';
  } else {
    action = 'manual';
  }

  return {
    suggestedCategoryId: category.id,
    suggestedCategoryName: category.name,
    confidence,
    matchedKeywords: topMatch.matches,
    action,
    reasoning: `Matched "${topMatch.matches.join(', ')}" with ${(confidence * 100).toFixed(0)}% confidence`,
  };
}

/**
 * Batch categorize multiple transactions
 */
export async function categorizeBatch(
  db: Database,
  tenantId: string,
  transactionDescriptions: { id: string; description: string }[]
): Promise<Map<string, CategorizationResult>> {
  // Load merchant patterns once for efficiency
  const merchantPatterns = await getMerchantPatterns(db, tenantId);
  const results = new Map<string, CategorizationResult>();

  for (const { id, description } of transactionDescriptions) {
    const result = await categorizeTransaction(
      db,
      tenantId,
      description,
      merchantPatterns
    );
    results.set(id, result);
  }

  return results;
}

/**
 * Learn from user correction (update merchant patterns)
 */
export async function learnFromCorrection(
  db: Database,
  tenantId: string,
  transactionId: string,
  correctedCategoryId: string
): Promise<void> {
  // Update the transaction
  await db
    .update(transactions)
    .set({ 
      categoryId: correctedCategoryId,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.tenantId, tenantId)
      )
    )
    .run();

  // The merchant pattern will automatically be updated on next query
  // since getMerchantPatterns() reads from transactions table
}

/**
 * Get categorization statistics for a tenant
 */
export async function getCategorizationStats(
  db: Database,
  tenantId: string
): Promise<{
  totalTransactions: number;
  categorizedTransactions: number;
  uncategorizedTransactions: number;
  categorizationRate: number;
  topMerchants: { merchant: string; count: number; category: string }[];
}> {
  // Get total counts
  const totals = await db
    .select({
      total: sql<number>`COUNT(*)`,
      categorized: sql<number>`SUM(CASE WHEN ${transactions.categoryId} IS NOT NULL THEN 1 ELSE 0 END)`,
    })
    .from(transactions)
    .where(eq(transactions.tenantId, tenantId))
    .get();

  const total = totals?.total || 0;
  const categorized = totals?.categorized || 0;
  const uncategorized = total - categorized;
  const rate = total > 0 ? categorized / total : 0;

  // Get top merchants
  const topMerchants = await db
    .select({
      description: transactions.description,
      count: sql<number>`COUNT(*)`,
      categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.tenantId, tenantId))
    .groupBy(transactions.description, categories.name)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(10)
    .all();

  return {
    totalTransactions: total,
    categorizedTransactions: categorized,
    uncategorizedTransactions: uncategorized,
    categorizationRate: rate,
    topMerchants: topMerchants.map(m => ({
      merchant: extractMerchantName(m.description),
      count: m.count,
      category: m.categoryName || 'Uncategorized',
    })),
  };
}
