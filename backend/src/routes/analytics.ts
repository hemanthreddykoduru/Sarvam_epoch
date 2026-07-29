import { Router, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
const analyticsService = new AnalyticsService();

router.use(requireAuth);

router.get('/overview', async (req: AuthRequest, res: Response) => {
  try {
    const data = await analyticsService.getOverview(req.userId!);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/daily-calls', async (req: AuthRequest, res: Response) => {
  try {
    const { days } = req.query;
    const data = await analyticsService.getDailyCalls(req.userId!, days ? parseInt(days as string) : 30);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/campaign-performance', async (req: AuthRequest, res: Response) => {
  try {
    const data = await analyticsService.getCampaignPerformance(req.userId!);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/today', async (req: AuthRequest, res: Response) => {
  try {
    const data = await analyticsService.getTodayStats(req.userId!);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/outcomes', async (req: AuthRequest, res: Response) => {
  try {
    const data = await analyticsService.getCallOutcomes(req.userId!);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/sentiment', async (req: AuthRequest, res: Response) => {
  try {
    const data = await analyticsService.getSentimentAnalysis(req.userId!);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/languages', async (req: AuthRequest, res: Response) => {
  try {
    const data = await analyticsService.getLanguageDistribution(req.userId!);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
