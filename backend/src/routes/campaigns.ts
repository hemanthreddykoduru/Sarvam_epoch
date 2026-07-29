import { Router, Response } from 'express';
import { CampaignService } from '../services/campaignService.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();
const campaignService = new CampaignService();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = await campaignService.getAll(req.userId!);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, voice_language } = req.body;
    const data = await campaignService.create(req.userId!, { name, description, voice_language });
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = await campaignService.getById(req.params.id, req.userId!);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, voice_language } = req.body;
    const data = await campaignService.update(req.params.id, req.userId!, { name, description, voice_language });
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['draft', 'running', 'paused', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const data = await campaignService.update(req.params.id, req.userId!, { status });
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await campaignService.delete(req.params.id, req.userId!);
    return res.json({ message: 'Campaign deleted' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
