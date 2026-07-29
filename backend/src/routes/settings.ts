import { Router, Response } from 'express';
import { adminClient } from '../lib/insforge.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { encrypt, decrypt, maskKey } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(requireAuth);

router.get('/gemini-key', async (req: AuthRequest, res: Response) => {
  try {
    const { data: user } = await adminClient.database
      .from('users')
      .select('gemini_api_key')
      .eq('id', req.userId!)
      .single();

    if (!user?.gemini_api_key) {
      return res.json({ data: { hasKey: false, maskedKey: null } });
    }

    const decrypted = decrypt(user.gemini_api_key);
    return res.json({ data: { hasKey: true, maskedKey: maskKey(decrypted) } });
  } catch (error: any) {
    logger.error('Failed to get Gemini key', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

router.put('/gemini-key', async (req: AuthRequest, res: Response) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'apiKey is required' });
    }

    const encrypted = encrypt(apiKey);

    await adminClient.database
      .from('users')
      .update({ gemini_api_key: encrypted })
      .eq('id', req.userId!);

    return res.json({ data: { success: true, maskedKey: maskKey(apiKey) } });
  } catch (error: any) {
    logger.error('Failed to save Gemini key', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/gemini-key', async (req: AuthRequest, res: Response) => {
  try {
    await adminClient.database
      .from('users')
      .update({ gemini_api_key: null })
      .eq('id', req.userId!);

    return res.json({ data: { success: true } });
  } catch (error: any) {
    logger.error('Failed to delete Gemini key', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

export default router;
