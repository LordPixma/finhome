import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, billReminders, categories } from '../db';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { CreateBillReminderSchema } from '@finhome360/shared';
import { getCurrentTimestamp } from '../utils/timestamp';
import type { Env } from '../types';

const billRemindersRouter = new Hono<Env>();

// Apply middleware
billRemindersRouter.use('*', authMiddleware, tenantMiddleware);

// Get all bill reminders
billRemindersRouter.get('/', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    const allBillReminders = await db
      .select({
        id: billReminders.id,
        tenantId: billReminders.tenantId,
        name: billReminders.name,
        amount: billReminders.amount,
        categoryId: billReminders.categoryId,
        dueDate: billReminders.dueDate,
        frequency: billReminders.frequency,
        reminderDays: billReminders.reminderDays,
        status: billReminders.status,
        createdAt: billReminders.createdAt,
        updatedAt: billReminders.updatedAt,
        category: {
          name: categories.name,
          icon: categories.icon,
          color: categories.color,
        },
      })
      .from(billReminders)
      .leftJoin(categories, eq(billReminders.categoryId, categories.id))
      .where(eq(billReminders.tenantId, tenantId))
      .orderBy(desc(billReminders.dueDate))
      .all();

    return c.json({
      success: true,
      data: allBillReminders,
    });
  } catch (error) {
    console.error('Error fetching bill reminders:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch bill reminders' },
      },
      500
    );
  }
});

// Get single bill reminder
billRemindersRouter.get('/:id', async c => {
  try {
    const id = c.req.param('id');
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    const billReminder = await db
      .select()
      .from(billReminders)
      .where(and(eq(billReminders.id, id), eq(billReminders.tenantId, tenantId)))
      .get();

    if (!billReminder) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Bill reminder not found' } },
        404
      );
    }

    return c.json({
      success: true,
      data: billReminder,
    });
  } catch (error) {
    console.error('Error fetching bill reminder:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch bill reminder' },
      },
      500
    );
  }
});

// Create bill reminder
billRemindersRouter.post('/', validateRequest(CreateBillReminderSchema), async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const body = c.get('validatedData');
    const db = getDb(c.env.DB);

    const now = getCurrentTimestamp();

    const newBillReminder = {
      id: crypto.randomUUID(),
      tenantId,
      ...body,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(billReminders).values(newBillReminder).run();

    // Queue bill reminder notification if due soon
    const daysUntilDue = Math.ceil((newBillReminder.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue <= newBillReminder.reminderDays && c.env.BILL_REMINDERS) {
      await c.env.BILL_REMINDERS.send({
        billReminderId: newBillReminder.id,
        tenantId,
        dueDate: newBillReminder.dueDate.toISOString(),
      });
    }

    return c.json(
      {
        success: true,
        data: newBillReminder,
      },
      201
    );
  } catch (error) {
    console.error('Error creating bill reminder:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create bill reminder' },
      },
      500
    );
  }
});

// Update bill reminder
billRemindersRouter.put('/:id', validateRequest(CreateBillReminderSchema), async c => {
  try {
    const id = c.req.param('id');
    const tenantId = c.get('tenantId')!;
    const body = c.get('validatedData');
    const db = getDb(c.env.DB);

    // Check if bill reminder exists and belongs to tenant
    const existingBillReminder = await db
      .select()
      .from(billReminders)
      .where(and(eq(billReminders.id, id), eq(billReminders.tenantId, tenantId)))
      .get();

    if (!existingBillReminder) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Bill reminder not found' } },
        404
      );
    }

    const updatedBillReminder = {
      ...body,
      updatedAt: getCurrentTimestamp(),
    };

    await db
      .update(billReminders)
      .set(updatedBillReminder)
      .where(and(eq(billReminders.id, id), eq(billReminders.tenantId, tenantId)))
      .run();

    return c.json({
      success: true,
      data: {
        id,
        tenantId,
        ...updatedBillReminder,
        createdAt: existingBillReminder.createdAt,
      },
    });
  } catch (error) {
    console.error('Error updating bill reminder:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update bill reminder' },
      },
      500
    );
  }
});

// Delete bill reminder
billRemindersRouter.delete('/:id', async c => {
  try {
    const id = c.req.param('id');
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    // Check if bill reminder exists and belongs to tenant
    const existingBillReminder = await db
      .select()
      .from(billReminders)
      .where(and(eq(billReminders.id, id), eq(billReminders.tenantId, tenantId)))
      .get();

    if (!existingBillReminder) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Bill reminder not found' } },
        404
      );
    }

    await db
      .delete(billReminders)
      .where(and(eq(billReminders.id, id), eq(billReminders.tenantId, tenantId)))
      .run();

    return c.json({
      success: true,
      data: { message: 'Bill reminder deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting bill reminder:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete bill reminder' },
      },
      500
    );
  }
});

export default billRemindersRouter;
