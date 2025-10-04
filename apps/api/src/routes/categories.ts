import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, categories } from '../db';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { CreateCategorySchema } from '@finhome360/shared';
import type { Env } from '../types';

const categoriesRouter = new Hono<Env>();

// Apply middleware
categoriesRouter.use('*', authMiddleware, tenantMiddleware);

// Get all categories
categoriesRouter.get('/', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    const allCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.tenantId, tenantId))
      .orderBy(desc(categories.createdAt))
      .all();

    return c.json({
      success: true,
      data: allCategories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch categories' },
      },
      500
    );
  }
});

// Get single category
categoriesRouter.get('/:id', async c => {
  try {
    const id = c.req.param('id');
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    const category = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.tenantId, tenantId)))
      .get();

    if (!category) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } },
        404
      );
    }

    return c.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch category' },
      },
      500
    );
  }
});

// Create category
categoriesRouter.post('/', validateRequest(CreateCategorySchema), async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const body = c.get('validatedData');
    const db = getDb(c.env.DB);

    const newCategory = {
      id: crypto.randomUUID(),
      tenantId,
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(categories).values(newCategory).run();

    return c.json(
      {
        success: true,
        data: newCategory,
      },
      201
    );
  } catch (error) {
    console.error('Error creating category:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create category' },
      },
      500
    );
  }
});

// Update category
categoriesRouter.put('/:id', validateRequest(CreateCategorySchema), async c => {
  try {
    const id = c.req.param('id');
    const tenantId = c.get('tenantId')!;
    const body = c.get('validatedData');
    const db = getDb(c.env.DB);

    // Check if category exists and belongs to tenant
    const existingCategory = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.tenantId, tenantId)))
      .get();

    if (!existingCategory) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } },
        404
      );
    }

    const updatedCategory = {
      ...body,
      updatedAt: new Date(),
    };

    await db
      .update(categories)
      .set(updatedCategory)
      .where(and(eq(categories.id, id), eq(categories.tenantId, tenantId)))
      .run();

    return c.json({
      success: true,
      data: {
        id,
        tenantId,
        ...updatedCategory,
        createdAt: existingCategory.createdAt,
      },
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update category' },
      },
      500
    );
  }
});

// Delete category
categoriesRouter.delete('/:id', async c => {
  try {
    const id = c.req.param('id');
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    // Check if category exists and belongs to tenant
    const existingCategory = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.tenantId, tenantId)))
      .get();

    if (!existingCategory) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } },
        404
      );
    }

    await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.tenantId, tenantId)))
      .run();

    return c.json({
      success: true,
      data: { message: 'Category deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete category' },
      },
      500
    );
  }
});

export default categoriesRouter;
