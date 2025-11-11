import { Hono } from 'hono';
import { BANK_PDF_TEMPLATES } from '@finhome360/shared';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../types';

const pdfRouter = new Hono<Env>();

// Apply auth middleware
pdfRouter.use('*', authMiddleware);

// GET /api/pdf/templates - Return available PDF templates for UI selector
pdfRouter.get('/templates', c => {
  const templates = BANK_PDF_TEMPLATES.map(tpl => ({
    id: tpl.id,
    displayName: tpl.displayName,
    description: tpl.description,
    currencySymbol: tpl.currencySymbol,
    dateFormat: tpl.dateFormat,
    notes: tpl.notes,
  }));

  return c.json({
    success: true,
    data: templates,
  });
});

export default pdfRouter;
