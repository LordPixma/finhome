import { Context } from 'hono';
import type { AuthUser } from '@finhome360/shared';

export interface Env {
  Bindings: {
    DB: D1Database;
    SESSIONS: KVNamespace;
    CACHE: KVNamespace;
    FILES: R2Bucket;
    BILL_REMINDERS: Queue;
    JWT_SECRET: string;
    FRONTEND_URL: string;
    ENVIRONMENT: string;
    RESEND_API_KEY?: string;
  };
  Variables: {
    user?: AuthUser;
    tenantId?: string;
    subdomain?: string;
    tenantName?: string;
    validatedData?: any;
    isAppDomain?: boolean;
  };
}

export type AppContext = Context<Env>;
