import { Hono } from 'hono';
import type { Env } from '../types';

const testBanking = new Hono<Env>();

testBanking.get('/test', async c => {
  return c.json({ success: true, data: { message: 'Test banking route works!' } });
});

export default testBanking;
