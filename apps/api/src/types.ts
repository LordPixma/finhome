import { Context, Next } from 'hono';
import type { AuthUser } from '@finhome/shared';

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  FILES: R2Bucket;
  BILL_REMINDERS: Queue;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  ENVIRONMENT: string;
}

export interface Variables {
  user?: AuthUser;
  tenantId?: string;
}

export type AppContext = Context<{ Bindings: Env; Variables: Variables }>;
