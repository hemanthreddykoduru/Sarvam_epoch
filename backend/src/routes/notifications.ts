import { Router, Response } from 'express';
import { adminClient } from '../lib/insforge.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await adminClient.database
      .from('notifications')
      .select('*')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return res.json({ data: data || [] });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await adminClient.database
      .from('notifications')
      .update({ read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select()
      .single();
    if (error) throw error;
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    const { error } = await adminClient.database
      .from('notifications')
      .update({ read: true })
      .eq('user_id', req.userId!)
      .eq('read', false);
    if (error) throw error;
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
