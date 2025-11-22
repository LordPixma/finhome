import { Hono } from 'hono';
import { eq, and, count } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { getDb, tenantMembers, users, tenants } from '../db';
import { InviteTenantMemberSchema, UpdateTenantMemberSchema } from '@finhome360/shared';
import { createHybridEmailService } from '../services/hybridEmail';
import type { Env } from '../types';

const router = new Hono<Env>();

// Apply auth middleware to all routes
router.use('/*', authMiddleware);

// Get all tenant members
router.get('/', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;

    const members = await db
      .select({
        id: tenantMembers.id,
        userId: tenantMembers.userId,
        role: tenantMembers.role,
        status: tenantMembers.status,
        invitedAt: tenantMembers.invitedAt,
        joinedAt: tenantMembers.joinedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(tenantMembers)
      .leftJoin(users, eq(tenantMembers.userId, users.id))
      .where(eq(tenantMembers.tenantId, tenantId))
      .orderBy(tenantMembers.createdAt)
      .all();

    return c.json({ success: true, data: members });
  } catch (error: any) {
    console.error('Error fetching tenant members:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tenant members' },
      },
      500
    );
  }
});

// Invite a new member
router.post('/', validateRequest(InviteTenantMemberSchema), async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;
    const user = c.get('user')!;
    const body = await c.req.json();

    // Check if user is admin or owner
    if (!user.role || !['admin', 'owner'].includes(user.role)) {
      return c.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only admins can invite members' },
        },
        403
      );
    }

    // Count current active members (excluding pending and removed)
    const memberCount = await db
      .select({ count: count() })
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.status, 'active')
        )
      )
      .get();

    // Limit to 10 total members (adjust based on subscription)
    if (memberCount && memberCount.count >= 10) {
      return c.json(
        {
          success: false,
          error: {
            code: 'MEMBER_LIMIT_REACHED',
            message: 'Member limit reached. Upgrade to add more members.',
          },
        },
        400
      );
    }

    // Check if user is already a member of this tenant
    const existingMember = await db
      .select()
      .from(tenantMembers)
      .leftJoin(users, eq(users.id, tenantMembers.userId))
      .where(and(eq(users.email, body.email), eq(tenantMembers.tenantId, tenantId)))
      .get();

    if (existingMember) {
      return c.json(
        {
          success: false,
          error: { code: 'MEMBER_ALREADY_EXISTS', message: 'A member with this email already exists in this family.' },
        },
        400
      );
    }
    
    // Create new user account
    const now = new Date();
    const userId = crypto.randomUUID();
    const tempPassword = crypto.randomUUID().substring(0, 16); // Generate temporary password
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await db
      .insert(users)
      .values({
        id: userId,
        tenantId,
        email: body.email,
        name: body.name,
        passwordHash,
        role: body.role,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Create tenant member record
    const memberId = crypto.randomUUID();
    const member = {
      id: memberId,
      tenantId,
      userId,
      role: body.role,
      invitedBy: user.id,
      invitedAt: now,
      joinedAt: now,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(tenantMembers).values(member).run();

    // Send invitation email with temporary password
    try {
      console.log('🚀 Starting member invitation email process:', {
        recipientEmail: body.email,
        recipientName: body.name,
        inviterName: user.name,
        tenantId,
        timestamp: new Date().toISOString(),
      });

      const emailService = createHybridEmailService(
        c.env.RESEND_API_KEY, 
        'noreply@finhome360.com', // Using verified domain
        c.env.FRONTEND_URL || 'https://app.finhome360.com'
      );
      
      // Get tenant name
      const tenant = await db
        .select({ name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .get();

      console.log('📋 Tenant information retrieved:', {
        tenantName: tenant?.name || 'Your Family',
        tenantId,
      });

      const emailData = {
        inviterName: user.name,
        tenantName: tenant?.name || 'Your Family',
        memberName: body.name,
        memberEmail: body.email,
        temporaryPassword: tempPassword,
        role: body.role,
        loginUrl: c.env.FRONTEND_URL || 'https://app.finhome360.com',
      };

      console.log('📤 Sending invitation email with data:', {
        ...emailData,
        temporaryPassword: '[REDACTED]', // Don't log the password
      });

      const emailSent = await emailService.sendMemberInvitationEmail(body.email, emailData);

      if (emailSent) {
        console.log(`✅ Invitation email successfully sent to ${body.email}`);
      } else {
        console.error(`❌ Failed to send invitation email to ${body.email}`);
      }
    } catch (emailError) {
      console.error('❌ Exception during invitation email send:', {
        error: emailError instanceof Error ? emailError.message : String(emailError),
        stack: emailError instanceof Error ? emailError.stack : undefined,
        recipientEmail: body.email,
        timestamp: new Date().toISOString(),
      });
      // Don't fail the request if email fails
    }

    return c.json({
      success: true,
      data: {
        ...member,
        userName: body.name,
        userEmail: body.email,
      },
    }, 201);
  } catch (error: any) {
    console.error('Error inviting member:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to invite member' },
      },
      500
    );
  }
});

// Update member role
router.put('/:id', validateRequest(UpdateTenantMemberSchema), async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;
    const user = c.get('user')!;
    const { id } = c.req.param();
    const body = await c.req.json();

    // Check if user is admin or owner
    if (!user.role || !['admin', 'owner'].includes(user.role)) {
      return c.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only admins can update member roles' },
        },
        403
      );
    }

    // Check if member exists
    const member = await db
      .select()
      .from(tenantMembers)
      .where(and(eq(tenantMembers.id, id), eq(tenantMembers.tenantId, tenantId)))
      .get();

    if (!member) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } },
        404
      );
    }

    // Update member role
    const now = new Date();
    await db
      .update(tenantMembers)
      .set({ role: body.role, updatedAt: now })
      .where(eq(tenantMembers.id, id))
      .run();

    // Also update user role
    await db
      .update(users)
      .set({ role: body.role, updatedAt: now })
      .where(eq(users.id, member.userId))
      .run();

    return c.json({ success: true, data: { id, role: body.role } });
  } catch (error: any) {
    console.error('Error updating member:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update member' },
      },
      500
    );
  }
});

// Remove member
router.delete('/:id', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;
    const user = c.get('user')!;
    const { id } = c.req.param();

    // Check if user is admin or owner
    if (!user.role || !['admin', 'owner'].includes(user.role)) {
      return c.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only admins can remove members' },
        },
        403
      );
    }

    // Check if member exists
    const member = await db
      .select()
      .from(tenantMembers)
      .where(and(eq(tenantMembers.id, id), eq(tenantMembers.tenantId, tenantId)))
      .get();

    if (!member) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } },
        404
      );
    }

    // Prevent removing owner
    if (member.role === 'owner') {
      return c.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot remove the tenant owner' },
        },
        403
      );
    }

    // Mark member as removed instead of deleting
    const now = new Date();
    await db
      .update(tenantMembers)
      .set({ status: 'removed', updatedAt: now })
      .where(eq(tenantMembers.id, id))
      .run();

    // Optionally, delete the user account entirely
    // await db.delete(users).where(eq(users.id, member.userId)).run();

    return c.json({ success: true, data: { id } });
  } catch (error: any) {
    console.error('Error removing member:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to remove member' },
      },
      500
    );
  }
});

export default router;