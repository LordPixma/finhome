import { Hono } from 'hono';
import { AdvancedUserManagementService, UserRole } from '../services/user-management';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { adminRoleMiddleware } from '../middleware/admin-role';
import type { AppContext } from '../types';

const userManagement = new Hono<{ Bindings: any; Variables: any }>();

// Auth middleware (allows authenticated admin operations only)
userManagement.use('/*', authMiddleware);
userManagement.use('/*', adminRoleMiddleware);

// Validation schemas
const getUsersSchema = z.object({
  limit: z.string().optional().default('50'),
  offset: z.string().optional().default('0'),
  search: z.string().optional(),
  tenantId: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isGlobalAdmin: z.string().optional().transform(val => val === 'true')
});

const createUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(UserRole),
  tenantId: z.string().min(1, 'Tenant ID is required'),
  isGlobalAdmin: z.boolean().optional().default(false)
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isGlobalAdmin: z.boolean().optional(),
  profilePictureUrl: z.string().url().optional(),
  bio: z.string().optional(),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional()
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
});

const suspendUserSchema = z.object({
  reason: z.string().min(1, 'Reason for suspension is required')
});

/**
 * GET /api/admin/users
 * Get all users with filtering and pagination
 */
userManagement.get('/users', async (c) => {
  try {
    const query = c.req.query();
    const validatedQuery = getUsersSchema.parse(query);
    
    const options = {
      limit: parseInt(validatedQuery.limit),
      offset: parseInt(validatedQuery.offset),
      search: validatedQuery.search,
      tenantId: validatedQuery.tenantId,
      role: validatedQuery.role,
      isGlobalAdmin: validatedQuery.isGlobalAdmin
    };

    const result = await AdvancedUserManagementService.getAllUsers(c as AppContext, options);

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors
        }
      }, 400);
    }

    console.error('Error getting users:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve users'
      }
    }, 500);
  }
});

/**
 * POST /api/admin/users
 * Create a new user
 */
userManagement.post('/users', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = createUserSchema.parse(body);
    
    // Data is already in correct format
    const serviceData = validatedData;
    
    const result = await AdvancedUserManagementService.createUser(c as AppContext, serviceData);

    return c.json({
      success: true,
      data: result
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      }, 400);
    }

    console.error('Error creating user:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create user'
      }
    }, 500);
  }
});

/**
 * GET /api/admin/users/:id
 * Get detailed user information
 */
userManagement.get('/users/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const user = await AdvancedUserManagementService.getUserDetails(c as AppContext, userId);

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      }, 404);
    }

    return c.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error getting user details:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve user details'
      }
    }, 500);
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user information
 */
userManagement.patch('/users/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const body = await c.req.json();
    const validatedData = updateUserSchema.parse(body);
    
    const result = await AdvancedUserManagementService.updateUser(c as AppContext, userId, validatedData);

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      }, 400);
    }

    console.error('Error updating user:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update user'
      }
    }, 500);
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user
 */
userManagement.delete('/users/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    
    const result = await AdvancedUserManagementService.deleteUser(c as AppContext, userId);

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete user'
      }
    }, 500);
  }
});

/**
 * POST /api/admin/users/:id/suspend
 * Suspend a user
 */
userManagement.post('/users/:id/suspend', async (c) => {
  try {
    const userId = c.req.param('id');
    const body = await c.req.json();
    const validatedData = suspendUserSchema.parse(body);
    
    const result = await AdvancedUserManagementService.suspendUser(c as AppContext, userId, validatedData.reason);

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      }, 400);
    }

    console.error('Error suspending user:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to suspend user'
      }
    }, 500);
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Reset user password
 */
userManagement.post('/users/:id/reset-password', async (c) => {
  try {
    const userId = c.req.param('id');
    const body = await c.req.json();
    const validatedData = resetPasswordSchema.parse(body);
    
    const result = await AdvancedUserManagementService.resetUserPassword(c as AppContext, userId, validatedData.newPassword);

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      }, 400);
    }

    console.error('Error resetting password:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to reset password'
      }
    }, 500);
  }
});

/**
 * POST /api/admin/users/:id/promote-global-admin
 * Promote user to global admin
 */
userManagement.post('/users/:id/promote-global-admin', async (c) => {
  try {
    const userId = c.req.param('id');
    
    const result = await AdvancedUserManagementService.promoteToGlobalAdmin(c as AppContext, userId);

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error promoting user to global admin:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to promote user to global admin'
      }
    }, 500);
  }
});

/**
 * POST /api/admin/users/:id/demote-global-admin
 * Demote global admin to regular user
 */
userManagement.post('/users/:id/demote-global-admin', async (c) => {
  try {
    const userId = c.req.param('id');
    
    const result = await AdvancedUserManagementService.demoteGlobalAdmin(c as AppContext, userId);

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error demoting global admin:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to demote global admin'
      }
    }, 500);
  }
});

/**
 * GET /api/admin/users/analytics
 * Get user analytics and insights
 */
userManagement.get('/analytics', async (c) => {
  try {
    const analytics = await AdvancedUserManagementService.getUserAnalytics(c as AppContext);

    return c.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting user analytics:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve user analytics'
      }
    }, 500);
  }
});

/**
 * GET /api/admin/users/search/:term
 * Search users by email or name
 */
userManagement.get('/search/:term', async (c) => {
  try {
    const searchTerm = c.req.param('term');
    const { limit = '20' } = c.req.query();
    
    const users = await AdvancedUserManagementService.searchUsers(c as AppContext, searchTerm, parseInt(limit));

    return c.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search users'
      }
    }, 500);
  }
});

export default userManagement;