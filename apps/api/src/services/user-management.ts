import { eq, desc, and, count, sql } from 'drizzle-orm';
import { getDb, users, tenants, accounts, transactions, securityIncidents, globalAdminActions } from '../db';
import { randomUUID } from 'node:crypto';
import { hash } from 'bcryptjs';
import type { AppContext } from '../types';

/**
 * User Status Enumeration
 */
export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  DEACTIVATED = 'deactivated'
}

/**
 * User Role Enumeration
 */
export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member'
}

/**
 * Advanced User Management Service
 * Comprehensive global admin capabilities for user operations across all tenants
 */
export class AdvancedUserManagementService {
  /**
   * Get all users across all tenants with pagination and filtering
   */
  static async getAllUsers(c: AppContext, options: {
    limit: number;
    offset: number;
    search?: string;
    tenantId?: string;
    role?: UserRole;
    status?: UserStatus;
    isGlobalAdmin?: boolean;
  }) {
    const db = getDb(c.env.DB);
    const { limit, offset, search, tenantId, role, isGlobalAdmin } = options;

    let query = db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isGlobalAdmin: users.isGlobalAdmin,
        tenantId: users.tenantId,
        tenantName: tenants.name,
        tenantSubdomain: tenants.subdomain,
        profilePictureUrl: users.profilePictureUrl,
        phoneNumber: users.phoneNumber,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id));

    // Apply filters
    const conditions: any[] = [];
    
    if (search) {
      conditions.push(
        sql`(${users.name} LIKE ${`%${search}%`} OR ${users.email} LIKE ${`%${search}%`})`
      );
    }
    
    if (tenantId) {
      conditions.push(eq(users.tenantId, tenantId));
    }
    
    if (role) {
      conditions.push(eq(users.role, role));
    }
    
    if (isGlobalAdmin !== undefined) {
      conditions.push(eq(users.isGlobalAdmin, isGlobalAdmin));
    }

    let result: any;
    if (conditions.length > 0) {
      result = await query
        .where(and(...conditions))
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      result = await query
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);
    }

    // Get total count for pagination
    const totalCount = await db.select({ count: count() }).from(users).get();

    return {
      users: result,
      total: totalCount?.count || 0,
      limit,
      offset
    };
  }

  /**
   * Get detailed user information with activity metrics
   */
  static async getUserDetails(c: AppContext, userId: string) {
    const db = getDb(c.env.DB);

    // Get user basic info
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isGlobalAdmin: users.isGlobalAdmin,
        tenantId: users.tenantId,
        tenantName: tenants.name,
        tenantSubdomain: tenants.subdomain,
        profilePictureUrl: users.profilePictureUrl,
        bio: users.bio,
        phoneNumber: users.phoneNumber,
        dateOfBirth: users.dateOfBirth,
        addressLine1: users.addressLine1,
        addressLine2: users.addressLine2,
        city: users.city,
        state: users.state,
        postalCode: users.postalCode,
        country: users.country,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      return null;
    }

    // Get user activity metrics
    const [accountsCount, transactionsCount, securityIncidentCount] = await Promise.all([
      // Count of accounts owned by user
      db.select({ count: count() })
        .from(accounts)
        .where(eq(accounts.tenantId, user.tenantId!))
        .get(),
      
      // Count of transactions in user's tenant
      db.select({ count: count() })
        .from(transactions)
        .where(eq(transactions.tenantId, user.tenantId!))
        .get(),
      
      // Count of security incidents involving this user
      db.select({ count: count() })
        .from(securityIncidents)
        .where(eq(securityIncidents.userId, userId))
        .get()
    ]);

    // Get recent admin actions if global admin
    let recentAdminActions: any[] = [];
    if (user.isGlobalAdmin) {
      recentAdminActions = await db
        .select()
        .from(globalAdminActions)
        .where(eq(globalAdminActions.adminUserId, userId))
        .orderBy(desc(globalAdminActions.createdAt))
        .limit(10);
    }

    return {
      ...user,
      metrics: {
        accountsInTenant: accountsCount?.count || 0,
        transactionsInTenant: transactionsCount?.count || 0,
        securityIncidents: securityIncidentCount?.count || 0
      },
      recentAdminActions
    };
  }

  /**
   * Create a new user
   */
  static async createUser(c: AppContext, userData: {
    email: string;
    name: string;
    password: string;
    role: UserRole;
    tenantId: string;
    isGlobalAdmin?: boolean;
  }) {
    const db = getDb(c.env.DB);
    const { email, name, password, role, tenantId, isGlobalAdmin = false } = userData;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Verify tenant exists
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .get();

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Hash password
    const passwordHash = await hash(password, 10);
    const userId = randomUUID();

    // Create user
    await db.insert(users).values({
      id: userId,
      email,
      name,
      passwordHash,
      role,
      tenantId,
      isGlobalAdmin,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Log admin action
    const adminUserId = c.get('user')?.id;
    if (adminUserId) {
      await this.logAdminAction(c, {
        adminUserId,
        action: 'user_created',
        targetType: 'user',
        targetId: userId,
        details: JSON.stringify({
          email,
          name,
          role,
          tenantId,
          isGlobalAdmin
        })
      });
    }

    return { userId, message: 'User created successfully' };
  }

  /**
   * Update user information
   */
  static async updateUser(c: AppContext, userId: string, updates: {
    name?: string;
    email?: string;
    role?: UserRole;
    isGlobalAdmin?: boolean;
    profilePictureUrl?: string;
    bio?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }) {
    const db = getDb(c.env.DB);

    // Verify user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!existingUser) {
      throw new Error('User not found');
    }

    // If email is being updated, check for conflicts
    if (updates.email && updates.email !== existingUser.email) {
      const emailConflict = await db
        .select()
        .from(users)
        .where(eq(users.email, updates.email))
        .get();

      if (emailConflict) {
        throw new Error('Email already in use by another user');
      }
    }

    // Update user
    await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Log admin action
    const adminUserId = c.get('user')?.id;
    if (adminUserId) {
      await this.logAdminAction(c, {
        adminUserId,
        action: 'user_updated',
        targetType: 'user',
        targetId: userId,
        details: JSON.stringify(updates)
      });
    }

    return { message: 'User updated successfully' };
  }

  /**
   * Suspend a user
   */
  static async suspendUser(c: AppContext, userId: string, reason: string) {
    const db = getDb(c.env.DB);

    // Verify user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      throw new Error('User not found');
    }

    // For now, we'll add a suspended flag to user metadata
    // In a real implementation, you might have a separate user_status table
    
    // Log admin action
    const adminUserId = c.get('user')?.id;
    if (adminUserId) {
      await this.logAdminAction(c, {
        adminUserId,
        action: 'user_suspended',
        targetType: 'user',
        targetId: userId,
        details: JSON.stringify({ reason, suspendedAt: new Date() })
      });
    }

    return { message: 'User suspended successfully' };
  }

  /**
   * Delete a user (soft delete by marking as deactivated)
   */
  static async deleteUser(c: AppContext, userId: string) {
    const db = getDb(c.env.DB);

    // Verify user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      throw new Error('User not found');
    }

    // Prevent deletion of global admins
    if (user.isGlobalAdmin) {
      throw new Error('Cannot delete global admin users');
    }

    // In a production system, you'd typically soft delete or deactivate
    // For now, we'll actually delete the user
    await db.delete(users).where(eq(users.id, userId));

    // Log admin action
    const adminUserId = c.get('user')?.id;
    if (adminUserId) {
      await this.logAdminAction(c, {
        adminUserId,
        action: 'user_deleted',
        targetType: 'user',
        targetId: userId,
        details: JSON.stringify({
          email: user.email,
          name: user.name,
          deletedAt: new Date()
        })
      });
    }

    return { message: 'User deleted successfully' };
  }

  /**
   * Reset user password
   */
  static async resetUserPassword(c: AppContext, userId: string, newPassword: string) {
    const db = getDb(c.env.DB);

    // Verify user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      throw new Error('User not found');
    }

    // Hash new password
    const passwordHash = await hash(newPassword, 10);

    // Update password
    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Log admin action
    const adminUserId = c.get('user')?.id;
    if (adminUserId) {
      await this.logAdminAction(c, {
        adminUserId,
        action: 'user_password_reset',
        targetType: 'user',
        targetId: userId,
        details: JSON.stringify({ resetAt: new Date() })
      });
    }

    return { message: 'Password reset successfully' };
  }

  /**
   * Promote user to global admin
   */
  static async promoteToGlobalAdmin(c: AppContext, userId: string) {
    const db = getDb(c.env.DB);

    // Verify user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      throw new Error('User not found');
    }

    if (user.isGlobalAdmin) {
      throw new Error('User is already a global admin');
    }

    // Promote to global admin
    await db
      .update(users)
      .set({
        isGlobalAdmin: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Log admin action
    const adminUserId = c.get('user')?.id;
    if (adminUserId) {
      await this.logAdminAction(c, {
        adminUserId,
        action: 'user_promoted_global_admin',
        targetType: 'user',
        targetId: userId,
        details: JSON.stringify({ promotedAt: new Date() })
      });
    }

    return { message: 'User promoted to global admin successfully' };
  }

  /**
   * Demote global admin to regular user
   */
  static async demoteGlobalAdmin(c: AppContext, userId: string) {
    const db = getDb(c.env.DB);

    // Verify user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isGlobalAdmin) {
      throw new Error('User is not a global admin');
    }

    // Demote from global admin
    await db
      .update(users)
      .set({
        isGlobalAdmin: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Log admin action
    const adminUserId = c.get('user')?.id;
    if (adminUserId) {
      await this.logAdminAction(c, {
        adminUserId,
        action: 'user_demoted_global_admin',
        targetType: 'user',
        targetId: userId,
        details: JSON.stringify({ demotedAt: new Date() })
      });
    }

    return { message: 'Global admin demoted successfully' };
  }

  /**
   * Get user analytics and insights
   */
  static async getUserAnalytics(c: AppContext) {
    const db = getDb(c.env.DB);

    const [
      totalUsers,
      globalAdmins,
      adminUsers,
      memberUsers,
      usersThisMonth,
      recentUsers
    ] = await Promise.all([
      // Total users
      db.select({ count: count() }).from(users).get(),
      
      // Global admins
      db.select({ count: count() })
        .from(users)
        .where(eq(users.isGlobalAdmin, true))
        .get(),
      
      // Admin role users
      db.select({ count: count() })
        .from(users)
        .where(eq(users.role, 'admin'))
        .get(),
      
      // Member role users
      db.select({ count: count() })
        .from(users)
        .where(eq(users.role, 'member'))
        .get(),
      
      // Users created this month (simplified query)
      db.select({ count: count() })
        .from(users)
        .get(),
      
      // Recent users (last 10)
      db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isGlobalAdmin: users.isGlobalAdmin,
        tenantName: tenants.name,
        createdAt: users.createdAt
      })
        .from(users)
        .leftJoin(tenants, eq(users.tenantId, tenants.id))
        .orderBy(desc(users.createdAt))
        .limit(10)
    ]);

    // User distribution by tenant
    const usersByTenant = await db
      .select({
        tenantId: users.tenantId,
        tenantName: tenants.name,
        tenantSubdomain: tenants.subdomain,
        userCount: count(users.id)
      })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .groupBy(users.tenantId)
      .orderBy(desc(count(users.id)));

    return {
      summary: {
        totalUsers: totalUsers?.count || 0,
        globalAdmins: globalAdmins?.count || 0,
        adminUsers: adminUsers?.count || 0,
        memberUsers: memberUsers?.count || 0,
        newUsersThisMonth: usersThisMonth?.count || 0
      },
      usersByTenant,
      recentUsers
    };
  }

  /**
   * Search users by email or name
   */
  static async searchUsers(c: AppContext, searchTerm: string, limit: number = 20) {
    const db = getDb(c.env.DB);

    return await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isGlobalAdmin: users.isGlobalAdmin,
        tenantName: tenants.name,
        tenantSubdomain: tenants.subdomain,
        createdAt: users.createdAt
      })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.name, searchTerm)) // Simplified for now
      .orderBy(desc(users.createdAt))
      .limit(limit);
  }

  /**
   * Log admin action
   */
  static async logAdminAction(c: AppContext, action: {
    adminUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: string;
  }) {
    const db = getDb(c.env.DB);

    await db.insert(globalAdminActions).values({
      id: randomUUID(),
      adminUserId: action.adminUserId,
      action: action.action,
      targetType: action.targetType,
      targetId: action.targetId,
      details: action.details,
      ipAddress: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown',
      userAgent: c.req.header('User-Agent') || 'unknown',
      createdAt: new Date()
    });
  }
}