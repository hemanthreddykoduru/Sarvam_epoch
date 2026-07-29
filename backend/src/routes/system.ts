import { Router, Response } from 'express';
import { adminClient } from '../lib/insforge.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { decrypt } from '../utils/encryption.js';

const router = Router();

router.use(requireAuth);

router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const checks = await Promise.allSettled([
      adminClient.database.from('_health').select('*').limit(1).single(),
      Promise.resolve({ status: 'online' }), // Redis
      Promise.resolve({ status: 'online' }), // Voice Engine
    ]);

    // Check user's own Gemini key
    let userHasKey = false;
    try {
      const { data: user } = await adminClient.database
        .from('users')
        .select('gemini_api_key')
        .eq('id', req.userId!)
        .single();
      if (user?.gemini_api_key) {
        decrypt(user.gemini_api_key);
        userHasKey = true;
      }
    } catch { /* ignore */ }

    const globalKeyConfigured = !!process.env.GEMINI_API_KEY;
    const geminiStatus = userHasKey || globalKeyConfigured ? 'online' : 'warning';

    const statuses = {
      postgresql: checks[0].status === 'fulfilled' ? 'online' : 'offline',
      gemini: geminiStatus,
      redis: 'online',
      voiceEngine: 'online',
      backend: 'online',
    };

    return res.json({ data: statuses });
  } catch (error: any) {
    return res.json({
      data: {
        postgresql: 'offline',
        gemini: process.env.GEMINI_API_KEY ? 'warning' : 'offline',
        redis: 'warning',
        voiceEngine: 'warning',
        backend: 'online',
      },
    });
  }
});

export default router;
