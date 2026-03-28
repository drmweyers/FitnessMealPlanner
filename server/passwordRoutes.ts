import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import crypto from 'crypto';
import { storage } from './storage';
import { hashPassword } from './auth';

const passwordRouter = Router();

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

passwordRouter.post('/forgot', async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await storage.getUserByEmail(email);

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour
      await storage.createPasswordResetToken(user.id, token, expiresAt);

      // In a real application, you would send an email with the reset link.
      // For this example, we'll log the token to the console.
      console.log(`Password reset token for ${email}: ${token}`);
    }

    res.json({ message: 'If a user with that email exists, a password reset link has been sent.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: fromZodError(error).toString() });
    }
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

passwordRouter.post('/reset', async (req: Request, res: Response) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const tokenData = await storage.getPasswordResetToken(token);

    if (!tokenData || tokenData.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const hashedPassword = await hashPassword(password);
    await storage.updateUserPassword(tokenData.userId, hashedPassword);
    await storage.deletePasswordResetToken(token);

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: fromZodError(error).toString() });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default passwordRouter; 