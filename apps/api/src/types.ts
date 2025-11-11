import { Context } from 'hono';
import type { AuthUser } from '@finhome360/shared';

export interface Env {
  Bindings: {
    DB: D1Database;
    SESSIONS: KVNamespace;
    CACHE: KVNamespace;
    FILES: R2Bucket;
    BILL_REMINDERS: Queue;
    TRANSACTION_SYNC: Queue;
    AI: any; // Cloudflare Workers AI binding
    JWT_SECRET: string;
    FRONTEND_URL: string;
    ENVIRONMENT: string;
    RESEND_API_KEY?: string;
    TRUELAYER_CLIENT_ID: string;
    TRUELAYER_CLIENT_SECRET: string;
    TRUELAYER_REDIRECT_URI: string;
    ADMIN_FIX_SECRET_KEY?: string; // Temporary admin fix endpoint secret
  };
  Variables: {
    user?: AuthUser;
    tenantId?: string;
    subdomain?: string;
    tenantName?: string;
    validatedData?: any;
    isAppDomain?: boolean;
    isAdminDomain?: boolean;
    // Global admin context
    isGlobalAdmin?: boolean;
    userId?: string;
    userName?: string;
    userEmail?: string;
    userRole?: string;
    originalTenantId?: string;
  };
}

export type AppContext = Context<Env>;
