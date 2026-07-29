import { Router, Response } from 'express';
import { adminClient } from '../lib/insforge.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 2) {
      return res.json({ data: { campaigns: [], contacts: [], calls: [] } });
    }

    const pattern = `%${q}%`;

    const [campaigns, contacts, calls] = await Promise.all([
      adminClient.database
        .from('campaigns')
        .select('id, name')
        .eq('user_id', req.userId!)
        .ilike('name', pattern)
        .limit(5),
      adminClient.database
        .from('contacts')
        .select('id, name, phone')
        .eq('user_id', req.userId!)
        .or(`name.ilike.${pattern},phone.ilike.${pattern}`)
        .limit(5),
      adminClient.database
        .from('calls')
        .select('id, status, created_at')
        .eq('user_id', req.userId!)
        .limit(5),
    ]);

    return res.json({
      data: {
        campaigns: campaigns.data || [],
        contacts: contacts.data || [],
        calls: calls.data || [],
      },
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
