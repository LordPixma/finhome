import { Next } from 'hono';
import { ZodSchema } from 'zod';
import type { AppContext } from '../types';

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a Zod schema
 */
export function validateRequest(schema: ZodSchema) {
  return async (c: AppContext, next: Next): Promise<Response | void> => {
    try {
      const body = await c.req.json();
      const validation = schema.safeParse(body);

      if (!validation.success) {
        return c.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: validation.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
              })),
            },
          },
          400
        );
      }

      // Store validated data in context
      c.set('validatedData', validation.data);
      await next();
    } catch (error) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON',
          },
        },
        400
      );
    }
  };
}
