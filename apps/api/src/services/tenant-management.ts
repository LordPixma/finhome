import { eq, desc, like, and } from 'drizzle-orm';
import { getDb, tenants, users, accounts, tenantFeatures } from '../db';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { AppContext } from '../types';

/**
 * Enhanced Tenant Management Service
 * Provides comprehensive tenant lifecycle management
 */
export class TenantManagementService {
  /**
   * Create a new tenant with initial setup
   */
  static async createTenant(c: AppContext, tenantData: {
    name: string;
    subdomain: string;
    adminEmail: string;
    adminName: string;
    adminPassword: string;
  }) {
    const db = getDb(c.env.DB);
    const tenantId = randomUUID();
    
    try {
      // Check if subdomain is available
      const existingTenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.subdomain, tenantData.subdomain))
        .get();

      if (existingTenant) {
        throw new Error('Subdomain already exists');
      }

      // Create tenant
      await db.insert(tenants).values({
        id: tenantId,
        name: tenantData.name,
        subdomain: tenantData.subdomain,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create admin user for the tenant
      const hashedPassword = await bcrypt.hash(tenantData.adminPassword, 10);
      
      await db.insert(users).values({
        id: randomUUID(),
        tenantId,
        email: tenantData.adminEmail,
        name: tenantData.adminName,
        passwordHash: hashedPassword,
        role: 'admin',
        isGlobalAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return { tenantId, message: 'Tenant created successfully' };

    } catch (error) {
      // Rollback: Delete tenant if user creation failed
      try {
        await db.delete(tenants).where(eq(tenants.id, tenantId));
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
      throw error;
    }
  }

  /**
   * Get list of all tenants
   */
  static async getAllTenants(c: AppContext) {
    const db = getDb(c.env.DB);
    
    return await db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  /**
   * Search tenants by name or subdomain
   */
  static async searchTenants(c: AppContext, searchTerm: string) {
    const db = getDb(c.env.DB);
    
    return await db
      .select()
      .from(tenants)
      .where(
        like(tenants.name, `%${searchTerm}%`)
      )
      .orderBy(desc(tenants.createdAt));
  }

  /**
   * Get detailed tenant information
   */
  static async getTenantDetails(c: AppContext, tenantId: string) {
    const db = getDb(c.env.DB);
    
    // Get tenant basic info
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .get();

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Get tenant users
    const tenantUsers = await db
      .select()
      .from(users)
      .where(eq(users.tenantId, tenantId));

    // Get tenant accounts
    const tenantAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.tenantId, tenantId));

    // Get feature flags
    const features = await db
      .select()
      .from(tenantFeatures)
      .where(eq(tenantFeatures.tenantId, tenantId));

    return {
      tenant,
      users: tenantUsers,
      accounts: tenantAccounts,
      features,
      statistics: {
        userCount: tenantUsers.length,
        accountCount: tenantAccounts.length,
        totalBalance: tenantAccounts.reduce((sum, account) => sum + account.balance, 0)
      }
    };
  }

  /**
   * Update tenant information
   */
  static async updateTenant(c: AppContext, tenantId: string, updates: {
    name?: string;
    subdomain?: string;
  }) {
    const db = getDb(c.env.DB);
    
    // Check if subdomain is available (if being changed)
    if (updates.subdomain) {
      const existingTenant = await db
        .select()
        .from(tenants)
        .where(and(
          eq(tenants.subdomain, updates.subdomain),
          eq(tenants.id, tenantId)
        ))
        .get();

      if (existingTenant && existingTenant.id !== tenantId) {
        throw new Error('Subdomain already exists');
      }
    }

    await db
      .update(tenants)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(tenants.id, tenantId));

    return { message: 'Tenant updated successfully' };
  }

  /**
   * Delete a tenant and all associated data
   */
  static async deleteTenant(c: AppContext, tenantId: string, confirmation: string) {
    const db = getDb(c.env.DB);
    
    // Get tenant for verification
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .get();

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Require confirmation with tenant name
    if (confirmation !== tenant.name) {
      throw new Error('Confirmation name does not match tenant name');
    }

    // Delete associated data first (simplified approach)
    await db.delete(accounts).where(eq(accounts.tenantId, tenantId));
    await db.delete(users).where(eq(users.tenantId, tenantId));
    await db.delete(tenantFeatures).where(eq(tenantFeatures.tenantId, tenantId));
    
    // Finally delete tenant
    await db.delete(tenants).where(eq(tenants.id, tenantId));

    return { message: 'Tenant deleted successfully' };
  }

  /**
   * Manage tenant feature flags
   */
  static async updateTenantFeatures(c: AppContext, tenantId: string, features: Array<{ featureKey: string; isEnabled: boolean; config?: string }>) {
    const db = getDb(c.env.DB);
    
    for (const feature of features) {
      const existing = await db
        .select()
        .from(tenantFeatures)
        .where(and(
          eq(tenantFeatures.tenantId, tenantId),
          eq(tenantFeatures.featureKey, feature.featureKey)
        ))
        .get();

      if (existing) {
        await db
          .update(tenantFeatures)
          .set({
            isEnabled: feature.isEnabled,
            config: feature.config || null,
            updatedAt: new Date()
          })
          .where(and(
            eq(tenantFeatures.tenantId, tenantId),
            eq(tenantFeatures.featureKey, feature.featureKey)
          ));
      } else {
        await db.insert(tenantFeatures).values({
          id: randomUUID(),
          tenantId,
          featureKey: feature.featureKey,
          isEnabled: feature.isEnabled,
          config: feature.config || null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    return { message: 'Features updated successfully' };
  }

  /**
   * Get common feature flags for tenant management
   */
  static getCommonFeatures() {
    return [
      { featureKey: 'ai_categorization', name: 'AI Transaction Categorization', description: 'Automatically categorize transactions using AI' },
      { featureKey: 'bill_reminders', name: 'Bill Reminders', description: 'Send automated bill reminder notifications' },
      { featureKey: 'bank_connections', name: 'Bank Account Connections', description: 'Connect and sync with bank accounts' },
      { featureKey: 'advanced_analytics', name: 'Advanced Analytics', description: 'Detailed financial analytics and reports' },
      { featureKey: 'api_access', name: 'API Access', description: 'Access to developer API endpoints' },
      { featureKey: 'multi_user', name: 'Multi-User Support', description: 'Support for multiple users per tenant' },
      { featureKey: 'data_export', name: 'Data Export', description: 'Export financial data in various formats' },
      { featureKey: 'mobile_app', name: 'Mobile App Access', description: 'Access to mobile applications' }
    ];
  }

  /**
   * Suspend or activate a tenant
   */
  static async toggleTenantStatus(c: AppContext, tenantId: string, suspended: boolean) {
    return await this.updateTenantFeatures(c, tenantId, [
      { featureKey: 'account_suspended', isEnabled: suspended }
    ]);
  }

  /**
   * Get tenant statistics summary
   */
  static async getTenantStats(c: AppContext) {
    const db = getDb(c.env.DB);
    
    const allTenants = await db.select().from(tenants);
    const allUsers = await db.select().from(users);
    const allAccounts = await db.select().from(accounts);

    return {
      totalTenants: allTenants.length,
      totalUsers: allUsers.length,
      totalAccounts: allAccounts.length,
      avgUsersPerTenant: allUsers.length / (allTenants.length || 1),
      avgAccountsPerTenant: allAccounts.length / (allTenants.length || 1)
    };
  }
}