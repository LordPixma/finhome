import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { getDb, users } from '../db';
import { ChangePasswordSchema, UpdateUserProfileSchema } from '@finhome360/shared';
import type { Env } from '../types';

const router = new Hono<Env>();

// Apply auth middleware to all routes
router.use('/*', authMiddleware);

// Get user profile
router.get('/', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get('user');
    const userId = user!.id;

    const userProfile = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        profilePictureUrl: users.profilePictureUrl,
        bio: users.bio,
        phoneNumber: users.phoneNumber,
        dateOfBirth: users.dateOfBirth,
        addressLine1: users.addressLine1,
        addressLine2: users.addressLine2,
        city: users.city,
        state: users.state,
        postalCode: users.postalCode,
        country: users.country,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!userProfile) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        },
        404
      );
    }

    return c.json({ success: true, data: userProfile });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user profile' },
      },
      500
    );
  }
});

// Update user profile
router.put('/profile', validateRequest(UpdateUserProfileSchema), async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get('user');
    const userId = user!.id;
    const body = await c.req.json();

    // Update user profile
    const now = new Date();
    await db
      .update(users)
      .set({
        ...body,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
      .run();

    // Fetch updated profile
    const updatedProfile = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        profilePictureUrl: users.profilePictureUrl,
        bio: users.bio,
        phoneNumber: users.phoneNumber,
        dateOfBirth: users.dateOfBirth,
        addressLine1: users.addressLine1,
        addressLine2: users.addressLine2,
        city: users.city,
        state: users.state,
        postalCode: users.postalCode,
        country: users.country,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    return c.json({ success: true, data: updatedProfile });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update user profile' },
      },
      500
    );
  }
});

// Upload profile picture
router.post('/profile-picture', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get('user');
    const userId = user!.id;
    
    // Get form data
    const formData = await c.req.formData();
    const fileEntry = formData.get('file');
    
    if (!fileEntry || typeof fileEntry === 'string') {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' },
        },
        400
      );
    }
    
    const file = fileEntry as File;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        },
        400
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'File size must be less than 5MB' },
        },
        400
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `profile-pictures/${userId}-${Date.now()}.${fileExtension}`;

    // Upload to R2
    const fileBuffer = await file.arrayBuffer();
    await c.env.FILES.put(fileName, fileBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Generate public URL (assuming R2 is configured with public access)
    const profilePictureUrl = `https://files.finhome360.com/${fileName}`;

    // Update user profile with new picture URL
    const now = new Date();
    await db
      .update(users)
      .set({
        profilePictureUrl,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
      .run();

    return c.json({ 
      success: true, 
      data: { profilePictureUrl } 
    });
  } catch (error: any) {
    console.error('Error uploading profile picture:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to upload profile picture' },
      },
      500
    );
  }
});

// Change password
router.post('/change-password', validateRequest(ChangePasswordSchema), async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get('user');
    const userId = user!.id;
    const { currentPassword, newPassword } = await c.req.json();

    // Fetch current user data
    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!currentUser) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        },
        404
      );
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, currentUser.passwordHash);
    if (!isValidPassword) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Current password is incorrect' },
        },
        401
      );
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    const now = new Date();
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
      .run();

    return c.json({ 
      success: true, 
      data: { message: 'Password changed successfully' } 
    });
  } catch (error: any) {
    console.error('Error changing password:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to change password' },
      },
      500
    );
  }
});

export default router;