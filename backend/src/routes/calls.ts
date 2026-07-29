import { Router, Response } from 'express';
import { CallService } from '../services/callService.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
const callService = new CallService();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { campaign_id } = req.query;
    const data = await callService.getAll(req.userId!, campaign_id as string);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/campaign/:campaignId', async (req: AuthRequest, res: Response) => {
  try {
    const data = await callService.getByCampaign(req.params.campaignId);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = await callService.getById(req.params.id, req.userId!);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { campaign_id, contact_id, direction } = req.body;
    const data = await callService.create(req.userId!, {
      campaign_id,
      contact_id,
      // must stay one of 'inbound' | 'outbound' — anything else is invisible to the
      // Inbound/Outbound pages, which filter on this column
      direction: direction === 'inbound' ? 'inbound' : 'outbound',
    });
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { transcript, duration_seconds, status, ended_at, recording_url } = req.body;
    const { data, error } = await (await import('../lib/insforge.js')).adminClient.database
      .from('calls')
      .update({
        ...(transcript !== undefined && { transcript }),
        ...(duration_seconds !== undefined && { duration_seconds }),
        ...(status !== undefined && { status }),
        ...(ended_at !== undefined && { ended_at }),
        ...(recording_url !== undefined && { recording_url }),
      })
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

export default router;
