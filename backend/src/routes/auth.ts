import { Router, Request, Response } from 'express';
import { client, adminClient } from '../lib/insforge.js';
import { logger } from '../utils/logger.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

function decodeJwtPayload(token: string): { sub?: string; email?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return payload;
  } catch {
    return null;
  }
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    const { data, error } = await client.auth.signUp({
      email,
      password,
      name,
      redirectTo: `${process.env.FRONTEND_URL}/login`,
    });
    if (error) throw error;
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const sessionResponse: any = {};
    if (data) {
      sessionResponse.accessToken = (data as any).accessToken;
      sessionResponse.refreshToken = (data as any).refreshToken;
      sessionResponse.user = (data as any).user;
    }
    return res.json({ data: sessionResponse });
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
});

router.post('/google', async (req: Request, res: Response) => {
  try {
    const { data, error } = await client.auth.signInWithOAuth('google', {
      redirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
    });
    if (error) throw error;
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const { error } = await client.auth.sendResetPasswordEmail({
      email,
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });
    if (error) throw error;
    return res.json({ message: 'Password reset email sent' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: 'No access token provided' });
    }
    const payload = decodeJwtPayload(accessToken);
    if (!payload?.sub) {
      return res.status(400).json({ error: 'Invalid token' });
    }
    return res.json({ user: { id: payload.sub, email: payload.email } });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const userEmail = req.userEmail;

    if (!userEmail) {
      return res.status(400).json({ error: 'No email in token' });
    }

    // Query by email — this reliably hits public.users (id-based queries can resolve to auth.users)
    const { data: existingUser, error: findError } = await adminClient.database
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (findError || !existingUser) {
      // User not found — create default record
      const defaultUser = {
        id: userId,
        email: userEmail,
        full_name: userEmail.split('@')[0] || '',
        role: 'user',
        plan: 'free',
        credits_remaining: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newUser, error: insertError } = await adminClient.database
        .from('users')
        .insert([defaultUser])
        .select()
        .single();

      if (insertError) {
        logger.error('Failed to create user record', { error: insertError.message, userId });
        return res.json(defaultUser);
      }

      return res.json(newUser);
    }

    return res.json(existingUser);
  } catch (error: any) {
    logger.error('Failed to get user profile', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { full_name } = req.body;
    const userEmail = req.userEmail || '';

    if (!userEmail) {
      return res.status(400).json({ error: 'No email in token' });
    }

    // Fetch existing row by email
    const { data: existing } = await adminClient.database
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (existing) {
      // Update by email
      const { data, error } = await adminClient.database
        .from('users')
        .update({
          full_name: full_name !== undefined ? full_name : existing.full_name,
          updated_at: new Date().toISOString(),
        })
        .eq('email', userEmail)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update user profile', { error: error.message, userEmail });
        return res.status(500).json({ error: error.message });
      }

      return res.json({ data });
    }

    // Row doesn't exist — insert
    const { data, error } = await adminClient.database
      .from('users')
      .insert([{
        id: req.userId,
        email: userEmail,
        full_name: full_name || userEmail.split('@')[0],
        role: 'user',
        plan: 'free',
        credits_remaining: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      logger.error('Failed to insert user profile', { error: error.message, userEmail });
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
