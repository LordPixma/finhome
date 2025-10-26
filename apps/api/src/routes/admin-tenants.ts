import { Hono } from 'hono';
import { z } from 'zod';
import { TenantManagementService } from '../services/tenant-management';
import { validateRequest } from '../middleware/validation';
import { globalAdminMiddleware } from '../middleware/global-admin';
import type { AppContext } from '../types';

const adminTenantRouter = new Hono<{ Bindings: any; Variables: any }>();

// Schema definitions
const createTenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required'),
  subdomain: z.string().min(1, 'Subdomain is required').regex(/^[a-z0-9-]+$/, 'Subdomain must contain only lowercase letters, numbers, and hyphens'),
  adminEmail: z.string().email('Valid email is required'),
  adminName: z.string().min(1, 'Admin name is required'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters')
});

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  subdomain: z.string().min(1).regex(/^[a-z0-9-]+$/).optional()
});

const deleteTenantSchema = z.object({
  confirmation: z.string().min(1, 'Confirmation required')
});

const updateFeaturesSchema = z.object({
  features: z.array(z.object({
    featureKey: z.string(),
    isEnabled: z.boolean(),
    config: z.string().optional()
  }))
});

const toggleStatusSchema = z.object({
  suspended: z.boolean()
});

/**
 * GET /api/admin/tenants
 * Get all tenants
 */
adminTenantRouter.get('/', globalAdminMiddleware, async (c: AppContext) => {
  try {
    const tenants = await TenantManagementService.getAllTenants(c);

    return c.json({
      success: true,
      data: tenants
    });

  } catch (error) {
    console.error('Error fetching tenants:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tenants' } 
    }, 500);
  }
});

/**
 * GET /api/admin/tenants/stats
 * Get tenant statistics summary
 */
adminTenantRouter.get('/stats', globalAdminMiddleware, async (c: AppContext) => {
  try {
    const stats = await TenantManagementService.getTenantStats(c);

    return c.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching tenant stats:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tenant stats' } 
    }, 500);
  }
});

/**
 * GET /api/admin/tenants/search/:searchTerm
 * Search tenants by name or subdomain
 */
adminTenantRouter.get('/search/:searchTerm', globalAdminMiddleware, async (c: AppContext) => {
  try {
    const searchTerm = c.req.param('searchTerm');
    const tenants = await TenantManagementService.searchTenants(c, searchTerm);

    return c.json({
      success: true,
      data: tenants
    });

  } catch (error) {
    console.error('Error searching tenants:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to search tenants' } 
    }, 500);
  }
});

/**
 * POST /api/admin/tenants
 * Create a new tenant
 */
adminTenantRouter.post('/', globalAdminMiddleware, validateRequest(createTenantSchema), async (c: AppContext) => {
  try {
    const tenantData = c.get('validatedData');
    
    const result = await TenantManagementService.createTenant(c, tenantData);

    return c.json({
      success: true,
      data: result
    }, 201);

  } catch (error) {
    console.error('Error creating tenant:', error);
    const message = error.message === 'Subdomain already exists' 
      ? 'Subdomain already exists' 
      : 'Failed to create tenant';
    
    return c.json({ 
      success: false, 
      error: { code: 'CREATION_FAILED', message } 
    }, 400);
  }
});

/**
 * GET /api/admin/tenants/:tenantId
 * Get detailed tenant information
 */
adminTenantRouter.get('/:tenantId', globalAdminMiddleware, async (c: AppContext) => {
  try {
    const tenantId = c.req.param('tenantId');
    const details = await TenantManagementService.getTenantDetails(c, tenantId);

    return c.json({
      success: true,
      data: details
    });

  } catch (error) {
    console.error('Error fetching tenant details:', error);
    const statusCode = error.message === 'Tenant not found' ? 404 : 500;
    
    return c.json({ 
      success: false, 
      error: { code: 'FETCH_FAILED', message: error.message || 'Failed to fetch tenant details' } 
    }, statusCode);
  }
});

/**
 * PUT /api/admin/tenants/:tenantId
 * Update tenant information
 */
adminTenantRouter.put('/:tenantId', globalAdminMiddleware, validateRequest(updateTenantSchema), async (c: AppContext) => {
  try {
    const tenantId = c.req.param('tenantId');
    const updates = c.get('validatedData');
    
    const result = await TenantManagementService.updateTenant(c, tenantId, updates);

    return c.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error updating tenant:', error);
    return c.json({ 
      success: false, 
      error: { code: 'UPDATE_FAILED', message: error.message || 'Failed to update tenant' } 
    }, 400);
  }
});

/**
 * DELETE /api/admin/tenants/:tenantId
 * Delete a tenant
 */
adminTenantRouter.delete('/:tenantId', globalAdminMiddleware, validateRequest(deleteTenantSchema), async (c: AppContext) => {
  try {
    const tenantId = c.req.param('tenantId');
    const { confirmation } = c.get('validatedData');
    
    const result = await TenantManagementService.deleteTenant(c, tenantId, confirmation);

    return c.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error deleting tenant:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    
    return c.json({ 
      success: false, 
      error: { code: 'DELETE_FAILED', message: error.message || 'Failed to delete tenant' } 
    }, statusCode);
  }
});

/**
 * PUT /api/admin/tenants/:tenantId/features
 * Update tenant feature flags
 */
adminTenantRouter.put('/:tenantId/features', globalAdminMiddleware, validateRequest(updateFeaturesSchema), async (c: AppContext) => {
  try {
    const tenantId = c.req.param('tenantId');
    const { features } = c.get('validatedData');
    
    const result = await TenantManagementService.updateTenantFeatures(c, tenantId, features);

    return c.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error updating tenant features:', error);
    return c.json({ 
      success: false, 
      error: { code: 'UPDATE_FAILED', message: 'Failed to update tenant features' } 
    }, 500);
  }
});

/**
 * GET /api/admin/tenants/features/available
 * Get list of available feature flags
 */
adminTenantRouter.get('/features/available', globalAdminMiddleware, async (c: AppContext) => {
  try {
    const features = TenantManagementService.getCommonFeatures();

    return c.json({
      success: true,
      data: features
    });

  } catch (error) {
    console.error('Error fetching available features:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch available features' } 
    }, 500);
  }
});

/**
 * PUT /api/admin/tenants/:tenantId/status
 * Suspend or activate a tenant
 */
adminTenantRouter.put('/:tenantId/status', globalAdminMiddleware, validateRequest(toggleStatusSchema), async (c: AppContext) => {
  try {
    const tenantId = c.req.param('tenantId');
    const { suspended } = c.get('validatedData');
    
    const result = await TenantManagementService.toggleTenantStatus(c, tenantId, suspended);

    return c.json({
      success: true,
      data: {
        ...result,
        status: suspended ? 'suspended' : 'active'
      }
    });

  } catch (error) {
    console.error('Error toggling tenant status:', error);
    return c.json({ 
      success: false, 
      error: { code: 'UPDATE_FAILED', message: 'Failed to update tenant status' } 
    }, 500);
  }
});

export { adminTenantRouter };