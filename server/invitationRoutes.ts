import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import crypto from 'crypto';
import { storage } from './storage';
import { emailService } from './services/emailService';
import { requireAuth, requireRole } from './authRoutes';
import { hashPassword } from './auth';
import { createInvitationSchema, acceptInvitationSchema } from '../shared/schema';

const invitationRouter = Router();

// Test email endpoint (development only)
invitationRouter.post('/test-email', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email address is required'
      });
    }

    const result = await emailService.sendTestEmail(email);
    
    res.json({
      status: result.success ? 'success' : 'error',
      message: result.success 
        ? `Test email sent successfully to ${email}`
        : `Failed to send test email: ${result.error}`,
      data: result.success ? { messageId: result.messageId } : null
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: 'admin' | 'trainer' | 'customer';
  };
}

/**
 * Send invitation to customer
 * POST /api/invitations/send
 * Only trainers can send invitations
 */
invitationRouter.post('/send', requireAuth, requireRole('trainer'), async (req: AuthRequest, res: Response) => {
  try {
    const { customerEmail, message } = createInvitationSchema.parse(req.body);
    const trainerId = req.user!.id;

    // Check if customer already exists
    const existingUser = await storage.getUserByEmail(customerEmail);
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Check if there's already a pending invitation for this email from this trainer
    const existingInvitations = await storage.getInvitationsByTrainer(trainerId);
    const pendingInvitation = existingInvitations.find(
      inv => inv.customerEmail === customerEmail && 
      !inv.usedAt && 
      new Date(inv.expiresAt) > new Date()
    );

    if (pendingInvitation) {
      return res.status(409).json({
        status: 'error',
        message: 'Invitation already sent to this email address',
        code: 'INVITATION_PENDING'
      });
    }

    // Generate secure invitation token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create invitation record
    const invitation = await storage.createInvitation({
      trainerId,
      customerEmail,
      token,
      expiresAt,
    });

    // Send email notification
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:4000'}/register?invitation=${token}`;
    
    // Get trainer info for the email
    const trainer = await storage.getUser(trainerId);
    if (!trainer) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve trainer information',
        code: 'INTERNAL_ERROR'
      });
    }

    // Send invitation email
    const emailResult = await emailService.sendInvitationEmail({
      customerEmail,
      trainerName: trainer.email, // You might want to add a 'name' field to users table
      trainerEmail: trainer.email,
      invitationLink,
      expiresAt
    });

    // Prepare response data
    const responseData: any = {
      invitation: {
        id: invitation.id,
        customerEmail: invitation.customerEmail,
        expiresAt: invitation.expiresAt,
        emailSent: emailResult.success
      }
    };

    // In development, include the invitation link for testing
    if (process.env.NODE_ENV === 'development') {
      responseData.invitation.invitationLink = invitationLink;
    }

    // Log email sending result
    if (emailResult.success) {
      console.log(`Invitation email sent successfully to ${customerEmail}, messageId: ${emailResult.messageId}`);
    } else {
      console.warn(`Failed to send invitation email to ${customerEmail}: ${emailResult.error}`);
    }

    res.status(201).json({
      status: 'success',
      message: emailResult.success 
        ? 'Invitation created and email sent successfully'
        : 'Invitation created but email could not be sent',
      data: responseData
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: fromZodError(error).toString(),
        code: 'VALIDATION_ERROR'
      });
    }
    console.error('Send invitation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * Get trainer's invitations
 * GET /api/invitations
 * Only trainers can view their invitations
 */
invitationRouter.get('/', requireAuth, requireRole('trainer'), async (req: AuthRequest, res: Response) => {
  try {
    const trainerId = req.user!.id;
    const invitations = await storage.getInvitationsByTrainer(trainerId);

    // Add status to each invitation
    const invitationsWithStatus = invitations.map(invitation => ({
      ...invitation,
      status: invitation.usedAt 
        ? 'accepted' 
        : new Date(invitation.expiresAt) < new Date() 
          ? 'expired' 
          : 'pending'
    }));

    res.json({
      status: 'success',
      data: {
        invitations: invitationsWithStatus
      }
    });

  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * Verify invitation token
 * GET /api/invitations/verify/:token
 * Public endpoint for customers to verify invitation links
 */
invitationRouter.get('/verify/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const invitation = await storage.getInvitation(token);
    if (!invitation) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid invitation token',
        code: 'INVALID_TOKEN'
      });
    }

    // Check if invitation has expired
    if (new Date(invitation.expiresAt) < new Date()) {
      return res.status(410).json({
        status: 'error',
        message: 'Invitation has expired',
        code: 'INVITATION_EXPIRED'
      });
    }

    // Check if invitation has already been used
    if (invitation.usedAt) {
      return res.status(410).json({
        status: 'error',
        message: 'Invitation has already been used',
        code: 'INVITATION_USED'
      });
    }

    // Get trainer information
    const trainer = await storage.getUser(invitation.trainerId);
    if (!trainer) {
      return res.status(404).json({
        status: 'error',
        message: 'Trainer not found',
        code: 'TRAINER_NOT_FOUND'
      });
    }

    res.json({
      status: 'success',
      data: {
        invitation: {
          customerEmail: invitation.customerEmail,
          trainerEmail: trainer.email,
          expiresAt: invitation.expiresAt
        }
      }
    });

  } catch (error) {
    console.error('Verify invitation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * Accept invitation and register customer
 * POST /api/invitations/accept
 * Public endpoint for customers to register using invitation
 */
invitationRouter.post('/accept', async (req: Request, res: Response) => {
  try {
    const { token, password, firstName, lastName } = acceptInvitationSchema.parse(req.body);

    const invitation = await storage.getInvitation(token);
    if (!invitation) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid invitation token',
        code: 'INVALID_TOKEN'
      });
    }

    // Check if invitation has expired
    if (new Date(invitation.expiresAt) < new Date()) {
      return res.status(410).json({
        status: 'error',
        message: 'Invitation has expired',
        code: 'INVITATION_EXPIRED'
      });
    }

    // Check if invitation has already been used
    if (invitation.usedAt) {
      return res.status(410).json({
        status: 'error',
        message: 'Invitation has already been used',
        code: 'INVITATION_USED'
      });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(invitation.customerEmail);
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create customer account
    const newUser = await storage.createUser({
      email: invitation.customerEmail,
      password: hashedPassword,
      role: 'customer',
    });

    // Mark invitation as used
    await storage.markInvitationAsUsed(token);

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role
        },
        message: 'Account created successfully. You can now log in.'
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: fromZodError(error).toString(),
        code: 'VALIDATION_ERROR'
      });
    }
    console.error('Accept invitation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * Clean up expired invitations
 * DELETE /api/invitations/cleanup
 * Admin only endpoint for maintenance
 */
invitationRouter.delete('/cleanup', requireAuth, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const deletedCount = await storage.deleteExpiredInvitations();

    res.json({
      status: 'success',
      data: {
        deletedCount,
        message: `Cleaned up ${deletedCount} expired invitations`
      }
    });

  } catch (error) {
    console.error('Cleanup invitations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

export default invitationRouter;