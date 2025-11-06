import { eq, and } from 'drizzle-orm';
import { getDb, globalUsers, tenantUsers, userSessions, tenants } from '../db';
import * as jwt from 'jose';
import type { Env } from '../types';

export interface GlobalUser {
  id: string;
  email: string;
  name: string;
  isGlobalAdmin: boolean;
}

export interface TenantUser {
  id: string;
  globalUserId: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'inactive' | 'suspended';
  displayName?: string;
  canManageAccounts: boolean;
  canManageBudgets: boolean;
  canInviteMembers: boolean;
}

export interface AuthContext {
  globalUser: GlobalUser;
  tenantUser?: TenantUser;
  tenantId?: string;
  accessToken: string;
}

export class MultiTenantAuthService {
  private db: any;
  private jwtSecret: string;

  constructor(env: Env) {
    this.db = getDb(env.DB);
    this.jwtSecret = env.JWT_SECRET;
  }

  async createGlobalUser(userData: {
    email: string;
    name: string;
    passwordHash: string;
    isGlobalAdmin?: boolean;
  }): Promise<GlobalUser> {
    const userId = crypto.randomUUID();
    const now = new Date();

    const newUser = {
      id: userId,
      email: userData.email,
      name: userData.name,
      passwordHash: userData.passwordHash,
      isGlobalAdmin: userData.isGlobalAdmin || false,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(globalUsers).values(newUser).run();

    return {
      id: userId,
      email: userData.email,
      name: userData.name,
      isGlobalAdmin: userData.isGlobalAdmin || false,
    };
  }

  async createTenantUser(data: {
    globalUserId: string;
    tenantId: string;
    role: 'owner' | 'admin' | 'member';
    displayName?: string;
    permissions?: {
      canManageAccounts?: boolean;
      canManageBudgets?: boolean;
      canInviteMembers?: boolean;
    };
  }): Promise<TenantUser> {
    const tenantUserId = crypto.randomUUID();
    const now = new Date();

    const newTenantUser = {
      id: tenantUserId,
      globalUserId: data.globalUserId,
      tenantId: data.tenantId,
      role: data.role,
      status: 'active' as const,
      displayName: data.displayName,
      canManageAccounts: data.permissions?.canManageAccounts || (data.role !== 'member'),
      canManageBudgets: data.permissions?.canManageBudgets || (data.role !== 'member'),
      canInviteMembers: data.permissions?.canInviteMembers || (data.role !== 'member'),
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(tenantUsers).values(newTenantUser).run();

    return {
      id: tenantUserId,
      globalUserId: data.globalUserId,
      tenantId: data.tenantId,
      role: data.role,
      status: 'active',
      displayName: data.displayName,
      canManageAccounts: newTenantUser.canManageAccounts,
      canManageBudgets: newTenantUser.canManageBudgets,
      canInviteMembers: newTenantUser.canInviteMembers,
    };
  }

  async getUserByEmail(email: string): Promise<GlobalUser | null> {
    const user = await this.db
      .select()
      .from(globalUsers)
      .where(eq(globalUsers.email, email))
      .get();

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isGlobalAdmin: user.isGlobalAdmin || false,
    };
  }

  async getUserTenants(globalUserId: string): Promise<Array<TenantUser & { tenantName: string; tenantSubdomain: string }>> {
    const userTenants = await this.db
      .select({
        tenantUser: tenantUsers,
        tenant: tenants,
      })
      .from(tenantUsers)
      .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
      .where(
        and(
          eq(tenantUsers.globalUserId, globalUserId),
          eq(tenantUsers.status, 'active')
        )
      )
      .all();

    return userTenants.map((result) => ({
      id: result.tenantUser.id,
      globalUserId: result.tenantUser.globalUserId,
      tenantId: result.tenantUser.tenantId,
      role: result.tenantUser.role,
      status: result.tenantUser.status,
      displayName: result.tenantUser.displayName,
      canManageAccounts: result.tenantUser.canManageAccounts,
      canManageBudgets: result.tenantUser.canManageBudgets,
      canInviteMembers: result.tenantUser.canInviteMembers,
      tenantName: result.tenant.name,
      tenantSubdomain: result.tenant.subdomain,
    }));
  }

  async getTenantUser(globalUserId: string, tenantId: string): Promise<TenantUser | null> {
    const tenantUser = await this.db
      .select()
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.globalUserId, globalUserId),
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.status, 'active')
        )
      )
      .get();

    if (!tenantUser) return null;

    return {
      id: tenantUser.id,
      globalUserId: tenantUser.globalUserId,
      tenantId: tenantUser.tenantId,
      role: tenantUser.role,
      status: tenantUser.status,
      displayName: tenantUser.displayName,
      canManageAccounts: tenantUser.canManageAccounts,
      canManageBudgets: tenantUser.canManageBudgets,
      canInviteMembers: tenantUser.canInviteMembers,
    };
  }

  async generateTokens(globalUser: GlobalUser, tenantId?: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const accessTokenPayload = {
      sub: globalUser.id,
      email: globalUser.email,
      name: globalUser.name,
      isGlobalAdmin: globalUser.isGlobalAdmin,
      tenantId,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    };

    const secret = new TextEncoder().encode(this.jwtSecret);
    const accessToken = await new jwt.SignJWT(accessTokenPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);

    const refreshToken = crypto.randomUUID();

    // Store session
    const sessionId = crypto.randomUUID();
    await this.db.insert(userSessions).values({
      id: sessionId,
      globalUserId: globalUser.id,
      currentTenantId: tenantId,
      accessTokenHash: await this.hashToken(accessToken),
      refreshTokenHash: await this.hashToken(refreshToken),
      expiresAt,
      createdAt: now,
      updatedAt: now,
    }).run();

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  async verifyToken(token: string): Promise<AuthContext | null> {
    try {
      const secret = new TextEncoder().encode(this.jwtSecret);
      const { payload } = await jwt.jwtVerify(token, secret);

      const globalUser: GlobalUser = {
        id: payload.sub as string,
        email: payload.email as string,
        name: payload.name as string,
        isGlobalAdmin: payload.isGlobalAdmin as boolean,
      };

      const tenantId = payload.tenantId as string | undefined;
      let tenantUser: TenantUser | undefined;

      if (tenantId) {
        tenantUser = await this.getTenantUser(globalUser.id, tenantId);
      }

      return {
        globalUser,
        tenantUser,
        tenantId,
        accessToken: token,
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  async switchTenant(
    globalUserId: string,
    newTenantId: string,
    currentRefreshToken: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  } | null> {
    // Verify user has access to the new tenant
    const tenantUser = await this.getTenantUser(globalUserId, newTenantId);
    if (!tenantUser) {
      throw new Error('User does not have access to this tenant');
    }

    // Get global user
    const globalUser = await this.db
      .select()
      .from(globalUsers)
      .where(eq(globalUsers.id, globalUserId))
      .get();

    if (!globalUser) {
      throw new Error('Global user not found');
    }

    // Invalidate current session
    const hashedRefreshToken = await this.hashToken(currentRefreshToken);
    await this.db
      .delete(userSessions)
      .where(eq(userSessions.refreshTokenHash, hashedRefreshToken))
      .run();

    // Generate new tokens with new tenant
    return this.generateTokens(
      {
        id: globalUser.id,
        email: globalUser.email,
        name: globalUser.name,
        isGlobalAdmin: globalUser.isGlobalAdmin,
      },
      newTenantId
    );
  }

  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async inviteUserToTenant(data: {
    email: string;
    name: string;
    tenantId: string;
    role: 'admin' | 'member';
    invitedBy: string; // globalUserId
  }): Promise<{ tempPassword: string; tenantUserId: string }> {
    // Check if global user already exists
    let globalUser = await this.getUserByEmail(data.email);
    
    const tempPassword = this.generateTempPassword();
    const hashedPassword = await this.hashPassword(tempPassword);

    if (!globalUser) {
      // Create new global user
      globalUser = await this.createGlobalUser({
        email: data.email,
        name: data.name,
        passwordHash: hashedPassword,
      });
    }

    // Check if user is already in this tenant
    const existingTenantUser = await this.getTenantUser(globalUser.id, data.tenantId);
    if (existingTenantUser) {
      throw new Error('User is already a member of this tenant');
    }

    // Create tenant user
    const tenantUser = await this.createTenantUser({
      globalUserId: globalUser.id,
      tenantId: data.tenantId,
      role: data.role,
    });

    return {
      tempPassword,
      tenantUserId: tenantUser.id,
    };
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async hashPassword(password: string): Promise<string> {
    // This is a simple hash - in production use bcrypt or similar
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}