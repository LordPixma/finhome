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
  };
  Variables: {
    user?: AuthUser;
    tenantId?: string;
    subdomain?: string;
    tenantName?: string;
    validatedData?: any;
  };
}

export type AppContext = Context<Env>;
