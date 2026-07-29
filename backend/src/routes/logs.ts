import { Router, Response } from 'express';
import { adminClient } from '../lib/insforge.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { limit, offset, action, entity_type } = req.query;
    let query = adminClient.database
      .from('activity_logs')
      .select('*')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false });

    if (action) query = query.eq('action', action);
    if (entity_type) query = query.eq('entity_type', entity_type);

    const { data, error, count } = await query
      .range(parseInt(offset as string) || 0, parseInt(limit as string) || 50)
      .limit(parseInt(limit as string) || 50);
    if (error) throw error;

    return res.json({
      data: data || [],
      total: count || data?.length || 0,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
