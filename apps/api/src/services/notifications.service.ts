import { eq, and, desc, gte, lte, lt, sql } from 'drizzle-orm';
import {
  getDb,
  notifications,
  notificationPreferences,
  budgets,
  transactions,
  accounts,
  goals,
  categories,
  users
} from '../db';
import type { AppContext } from '../types';

/**
 * Notifications Service
 *
 * Handles creating, sending, and managing notifications for users.
 * Includes smart alert triggers for budget overspend, unusual spending, etc.
 */

export type NotificationType =
  | 'budget_alert'
  | 'bill_reminder'
  | 'goal_milestone'
  | 'unusual_spending'
  | 'low_balance'
  | 'large_transaction'
  | 'system'
  | 'insight';

export type NotificationCategory = 'alert' | 'reminder' | 'milestone' | 'insight' | 'system';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  icon?: string;
  color?: string;
  relatedEntityType?: 'budget' | 'bill' | 'goal' | 'transaction' | 'account' | 'category';
  relatedEntityId?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

export interface NotificationPreferencesInput {
  emailEnabled?: boolean;
  emailBudgetAlerts?: boolean;
  emailBillReminders?: boolean;
  emailGoalMilestones?: boolean;
  emailUnusualSpending?: boolean;
  emailWeeklySummary?: boolean;
  emailMonthlyReport?: boolean;
  pushEnabled?: boolean;
  pushBudgetAlerts?: boolean;
  pushBillReminders?: boolean;
  pushGoalMilestones?: boolean;
  pushUnusualSpending?: boolean;
  pushLowBalance?: boolean;
  pushLargeTransactions?: boolean;
  budgetAlertThreshold?: number;
  lowBalanceThreshold?: number;
  largeTransactionThreshold?: number;
  unusualSpendingSensitivity?: 'low' | 'medium' | 'high';
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  digestFrequency?: 'realtime' | 'daily' | 'weekly';
}

export class NotificationsService {
  /**
   * Create a new notification
   */
  static async createNotification(
    c: AppContext,
    input: CreateNotificationInput
  ): Promise<typeof notifications.$inferSelect> {
    const db = getDb(c.env.DB);
    const now = new Date();

    const notification = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      userId: input.userId,
      type: input.type,
      category: input.category,
      priority: input.priority || 'medium',
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl || null,
      actionLabel: input.actionLabel || null,
      icon: input.icon || null,
      color: input.color || null,
      relatedEntityType: input.relatedEntityType || null,
      relatedEntityId: input.relatedEntityId || null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      expiresAt: input.expiresAt || null,
      createdAt: now,
    };

    await db.insert(notifications).values(notification);

    return notification as typeof notifications.$inferSelect;
  }

  /**
   * Get notifications for a user
   */
  static async getNotifications(
    c: AppContext,
    tenantId: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
      category?: NotificationCategory;
    } = {}
  ) {
    const db = getDb(c.env.DB);
    const { limit = 50, offset = 0, unreadOnly = false, type, category } = options;

    const conditions = [
      eq(notifications.tenantId, tenantId),
      eq(notifications.userId, userId),
      eq(notifications.isDismissed, false),
    ];

    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    if (type) {
      conditions.push(eq(notifications.type, type));
    }

    if (category) {
      conditions.push(eq(notifications.category, category));
    }

    const results = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return results;
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(
    c: AppContext,
    tenantId: string,
    userId: string
  ): Promise<number> {
    const db = getDb(c.env.DB);

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
        eq(notifications.isDismissed, false)
      ))
      .get();

    return result?.count || 0;
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(
    c: AppContext,
    notificationId: string,
    tenantId: string
  ): Promise<void> {
    const db = getDb(c.env.DB);
    const now = new Date();

    await db
      .update(notifications)
      .set({ isRead: true, readAt: now })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.tenantId, tenantId)
      ));
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(
    c: AppContext,
    tenantId: string,
    userId: string
  ): Promise<void> {
    const db = getDb(c.env.DB);
    const now = new Date();

    await db
      .update(notifications)
      .set({ isRead: true, readAt: now })
      .where(and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }

  /**
   * Dismiss a notification
   */
  static async dismissNotification(
    c: AppContext,
    notificationId: string,
    tenantId: string
  ): Promise<void> {
    const db = getDb(c.env.DB);
    const now = new Date();

    await db
      .update(notifications)
      .set({ isDismissed: true, dismissedAt: now })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.tenantId, tenantId)
      ));
  }

  /**
   * Get or create notification preferences for a user
   */
  static async getPreferences(
    c: AppContext,
    tenantId: string,
    userId: string
  ): Promise<typeof notificationPreferences.$inferSelect> {
    const db = getDb(c.env.DB);

    let prefs = await db
      .select()
      .from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.tenantId, tenantId),
        eq(notificationPreferences.userId, userId)
      ))
      .get();

    if (!prefs) {
      // Create default preferences
      const now = new Date();
      const newPrefs = {
        id: crypto.randomUUID(),
        tenantId,
        userId,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(notificationPreferences).values(newPrefs);
      prefs = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.id, newPrefs.id))
        .get();
    }

    return prefs!;
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences(
    c: AppContext,
    tenantId: string,
    userId: string,
    updates: NotificationPreferencesInput
  ): Promise<typeof notificationPreferences.$inferSelect> {
    const db = getDb(c.env.DB);
    const now = new Date();

    // Ensure preferences exist
    await this.getPreferences(c, tenantId, userId);

    await db
      .update(notificationPreferences)
      .set({ ...updates, updatedAt: now })
      .where(and(
        eq(notificationPreferences.tenantId, tenantId),
        eq(notificationPreferences.userId, userId)
      ));

    return this.getPreferences(c, tenantId, userId);
  }

  // ==========================================
  // SMART ALERT TRIGGERS
  // ==========================================

  /**
   * Check and trigger budget alerts
   */
  static async checkBudgetAlerts(
    c: AppContext,
    tenantId: string
  ): Promise<number> {
    const db = getDb(c.env.DB);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let alertsCreated = 0;

    // Get all users for the tenant
    const tenantUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    // Get active budgets
    const activeBudgets = await db
      .select({
        budget: budgets,
        categoryName: categories.name
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(and(
        eq(budgets.tenantId, tenantId),
        lte(budgets.startDate, now)
      ));

    for (const { budget, categoryName } of activeBudgets) {
      // Calculate spending for this budget's category
      const spending = await db
        .select({ total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` })
        .from(transactions)
        .where(and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.categoryId, budget.categoryId),
          eq(transactions.type, 'expense'),
          gte(transactions.date, startOfMonth)
        ))
        .get();

      const spent = spending?.total || 0;
      const percentUsed = (spent / budget.amount) * 100;

      // Get preferences for each user and check threshold
      for (const user of tenantUsers) {
        const prefs = await this.getPreferences(c, tenantId, user.id);
        const threshold = prefs.budgetAlertThreshold || 80;

        if (percentUsed >= threshold && (prefs.pushBudgetAlerts || prefs.emailBudgetAlerts)) {
          // Check if we already sent an alert for this budget this month
          const existingAlert = await db
            .select()
            .from(notifications)
            .where(and(
              eq(notifications.tenantId, tenantId),
              eq(notifications.userId, user.id),
              eq(notifications.type, 'budget_alert'),
              eq(notifications.relatedEntityId, budget.id),
              gte(notifications.createdAt, startOfMonth)
            ))
            .get();

          if (!existingAlert) {
            const isOverBudget = percentUsed >= 100;
            await this.createNotification(c, {
              tenantId,
              userId: user.id,
              type: 'budget_alert',
              category: 'alert',
              priority: isOverBudget ? 'high' : 'medium',
              title: isOverBudget
                ? `${categoryName} Budget Exceeded!`
                : `${categoryName} Budget Alert`,
              message: isOverBudget
                ? `You've spent £${spent.toFixed(2)} of your £${budget.amount.toFixed(2)} budget (${percentUsed.toFixed(0)}%).`
                : `You've used ${percentUsed.toFixed(0)}% of your ${categoryName} budget (£${spent.toFixed(2)} of £${budget.amount.toFixed(2)}).`,
              actionUrl: '/dashboard/budgets',
              actionLabel: 'View Budgets',
              icon: '💰',
              color: isOverBudget ? '#ef4444' : '#f59e0b',
              relatedEntityType: 'budget',
              relatedEntityId: budget.id,
              metadata: { spent, budget: budget.amount, percentUsed }
            });
            alertsCreated++;
          }
        }
      }
    }

    return alertsCreated;
  }

  /**
   * Check and trigger goal milestone notifications
   */
  static async checkGoalMilestones(
    c: AppContext,
    tenantId: string
  ): Promise<number> {
    const db = getDb(c.env.DB);
    let alertsCreated = 0;

    const tenantUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    // Get active goals
    const activeGoals = await db
      .select()
      .from(goals)
      .where(and(
        eq(goals.tenantId, tenantId),
        eq(goals.status, 'active')
      ));

    const milestones = [25, 50, 75, 100];

    for (const goal of activeGoals) {
      const progress = (goal.currentAmount / goal.targetAmount) * 100;

      for (const milestone of milestones) {
        if (progress >= milestone) {
          for (const user of tenantUsers) {
            const prefs = await this.getPreferences(c, tenantId, user.id);
            if (!prefs.pushGoalMilestones && !prefs.emailGoalMilestones) continue;

            // Check if we already sent this milestone notification
            const existingAlert = await db
              .select()
              .from(notifications)
              .where(and(
                eq(notifications.tenantId, tenantId),
                eq(notifications.userId, user.id),
                eq(notifications.type, 'goal_milestone'),
                eq(notifications.relatedEntityId, goal.id)
              ))
              .get();

            const existingMilestones = existingAlert?.metadata
              ? JSON.parse(existingAlert.metadata as string)?.milestones || []
              : [];

            if (!existingMilestones.includes(milestone)) {
              const isComplete = milestone === 100;
              await this.createNotification(c, {
                tenantId,
                userId: user.id,
                type: 'goal_milestone',
                category: 'milestone',
                priority: isComplete ? 'high' : 'medium',
                title: isComplete
                  ? `🎉 Goal Achieved: ${goal.name}!`
                  : `${milestone}% Progress: ${goal.name}`,
                message: isComplete
                  ? `Congratulations! You've reached your goal of £${goal.targetAmount.toFixed(2)}.`
                  : `You're ${milestone}% of the way to your ${goal.name} goal!`,
                actionUrl: '/dashboard/goals',
                actionLabel: 'View Goals',
                icon: isComplete ? '🎉' : '🎯',
                color: isComplete ? '#10b981' : '#3b82f6',
                relatedEntityType: 'goal',
                relatedEntityId: goal.id,
                metadata: { milestone, progress, milestones: [...existingMilestones, milestone] }
              });
              alertsCreated++;
            }
          }
        }
      }
    }

    return alertsCreated;
  }

  /**
   * Check for unusual spending patterns
   */
  static async checkUnusualSpending(
    c: AppContext,
    tenantId: string
  ): Promise<number> {
    const db = getDb(c.env.DB);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    let alertsCreated = 0;

    const tenantUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    // Get categories with spending
    const categoriesWithSpending = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.tenantId, tenantId),
        eq(transactions.type, 'expense'),
        gte(transactions.date, threeMonthsAgo)
      ))
      .groupBy(transactions.categoryId);

    for (const cat of categoriesWithSpending) {
      // Calculate historical average
      const historicalSpending = await db
        .select({ total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` })
        .from(transactions)
        .where(and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.categoryId, cat.categoryId),
          eq(transactions.type, 'expense'),
          gte(transactions.date, threeMonthsAgo),
          lt(transactions.date, startOfMonth)
        ))
        .get();

      const avgMonthly = (historicalSpending?.total || 0) / 3;

      // Get current month spending
      const currentSpending = await db
        .select({ total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` })
        .from(transactions)
        .where(and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.categoryId, cat.categoryId),
          eq(transactions.type, 'expense'),
          gte(transactions.date, startOfMonth)
        ))
        .get();

      const currentMonth = currentSpending?.total || 0;

      if (avgMonthly > 0) {
        const percentIncrease = ((currentMonth - avgMonthly) / avgMonthly) * 100;

        for (const user of tenantUsers) {
          const prefs = await this.getPreferences(c, tenantId, user.id);
          if (!prefs.pushUnusualSpending && !prefs.emailUnusualSpending) continue;

          // Determine threshold based on sensitivity
          const thresholds = { low: 100, medium: 50, high: 25 };
          const threshold = thresholds[prefs.unusualSpendingSensitivity || 'medium'];

          if (percentIncrease >= threshold) {
            // Check if we already alerted this month for this category
            const existingAlert = await db
              .select()
              .from(notifications)
              .where(and(
                eq(notifications.tenantId, tenantId),
                eq(notifications.userId, user.id),
                eq(notifications.type, 'unusual_spending'),
                eq(notifications.relatedEntityId, cat.categoryId),
                gte(notifications.createdAt, startOfMonth)
              ))
              .get();

            if (!existingAlert) {
              await this.createNotification(c, {
                tenantId,
                userId: user.id,
                type: 'unusual_spending',
                category: 'alert',
                priority: percentIncrease >= 100 ? 'high' : 'medium',
                title: `Unusual Spending in ${cat.categoryName}`,
                message: `You've spent £${currentMonth.toFixed(2)} on ${cat.categoryName} this month, which is ${percentIncrease.toFixed(0)}% higher than your average of £${avgMonthly.toFixed(2)}.`,
                actionUrl: '/dashboard/analytics',
                actionLabel: 'View Analytics',
                icon: '📊',
                color: '#f59e0b',
                relatedEntityType: 'category',
                relatedEntityId: cat.categoryId,
                metadata: { currentMonth, avgMonthly, percentIncrease }
              });
              alertsCreated++;
            }
          }
        }
      }
    }

    return alertsCreated;
  }

  /**
   * Check for low account balances
   */
  static async checkLowBalances(
    c: AppContext,
    tenantId: string
  ): Promise<number> {
    const db = getDb(c.env.DB);
    let alertsCreated = 0;

    const tenantUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    // Get checking/current accounts
    const checkingAccounts = await db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.tenantId, tenantId),
        eq(accounts.type, 'current')
      ));

    for (const account of checkingAccounts) {
      for (const user of tenantUsers) {
        const prefs = await this.getPreferences(c, tenantId, user.id);
        if (!prefs.pushLowBalance) continue;

        const threshold = prefs.lowBalanceThreshold || 100;

        if (account.balance < threshold) {
          // Check if we already alerted recently (within 24 hours)
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const existingAlert = await db
            .select()
            .from(notifications)
            .where(and(
              eq(notifications.tenantId, tenantId),
              eq(notifications.userId, user.id),
              eq(notifications.type, 'low_balance'),
              eq(notifications.relatedEntityId, account.id),
              gte(notifications.createdAt, oneDayAgo)
            ))
            .get();

          if (!existingAlert) {
            await this.createNotification(c, {
              tenantId,
              userId: user.id,
              type: 'low_balance',
              category: 'alert',
              priority: account.balance < 0 ? 'urgent' : 'high',
              title: account.balance < 0
                ? `⚠️ ${account.name} is Overdrawn!`
                : `Low Balance Alert: ${account.name}`,
              message: account.balance < 0
                ? `Your ${account.name} account is overdrawn by £${Math.abs(account.balance).toFixed(2)}.`
                : `Your ${account.name} account balance is £${account.balance.toFixed(2)}, below your £${threshold} threshold.`,
              actionUrl: '/dashboard/accounts',
              actionLabel: 'View Accounts',
              icon: '💳',
              color: account.balance < 0 ? '#ef4444' : '#f59e0b',
              relatedEntityType: 'account',
              relatedEntityId: account.id,
              metadata: { balance: account.balance, threshold }
            });
            alertsCreated++;
          }
        }
      }
    }

    return alertsCreated;
  }

  /**
   * Create large transaction alert
   */
  static async checkLargeTransaction(
    c: AppContext,
    tenantId: string,
    transactionId: string,
    amount: number,
    description: string
  ): Promise<void> {
    const db = getDb(c.env.DB);

    const tenantUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    for (const user of tenantUsers) {
      const prefs = await this.getPreferences(c, tenantId, user.id);
      if (!prefs.pushLargeTransactions) continue;

      const threshold = prefs.largeTransactionThreshold || 500;
      const absAmount = Math.abs(amount);

      if (absAmount >= threshold) {
        await this.createNotification(c, {
          tenantId,
          userId: user.id,
          type: 'large_transaction',
          category: 'alert',
          priority: 'medium',
          title: `Large Transaction: £${absAmount.toFixed(2)}`,
          message: `A transaction of £${absAmount.toFixed(2)} was recorded: "${description}".`,
          actionUrl: '/dashboard/transactions',
          actionLabel: 'View Transaction',
          icon: '💸',
          color: '#6366f1',
          relatedEntityType: 'transaction',
          relatedEntityId: transactionId,
          metadata: { amount: absAmount, description }
        });
      }
    }
  }

  /**
   * Run all alert checks
   */
  static async runAllAlertChecks(
    c: AppContext,
    tenantId: string
  ): Promise<{ budgetAlerts: number; goalMilestones: number; unusualSpending: number; lowBalances: number }> {
    const [budgetAlerts, goalMilestones, unusualSpending, lowBalances] = await Promise.all([
      this.checkBudgetAlerts(c, tenantId),
      this.checkGoalMilestones(c, tenantId),
      this.checkUnusualSpending(c, tenantId),
      this.checkLowBalances(c, tenantId),
    ]);

    return { budgetAlerts, goalMilestones, unusualSpending, lowBalances };
  }
}
