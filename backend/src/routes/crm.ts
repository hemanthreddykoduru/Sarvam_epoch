import { Router, Response } from 'express';
import { CrmService } from '../services/crmService.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
const crmService = new CrmService();

router.use(requireAuth);

router.get('/leads', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const data = await crmService.getAll(req.userId!, status as string);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.patch('/leads/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'contacted', 'interested', 'follow-up', 'converted', 'not-interested'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const data = await crmService.update(req.params.id, req.userId!, { status });
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const data = await crmService.getStats(req.userId!);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/followups', async (req: AuthRequest, res: Response) => {
  try {
    const data = await crmService.getFollowUps(req.userId!);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/followups', async (req: AuthRequest, res: Response) => {
  try {
    const { call_id, campaign_id, contact_id, scheduled_date, notes } = req.body;
    if (!campaign_id || !contact_id || !scheduled_date) {
      return res.status(400).json({ error: 'campaign_id, contact_id, and scheduled_date are required' });
    }
    const data = await crmService.createFollowUp(req.userId!, {
      call_id, campaign_id, contact_id, scheduled_date, notes,
    });
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.patch('/followups/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { status, notes, scheduled_date } = req.body;
    const data = await crmService.updateFollowUp(req.params.id, req.userId!, { status, notes, scheduled_date });
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
