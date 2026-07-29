import { Router, Response } from 'express';
import { adminClient } from '../lib/insforge.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const [callsRes, leadsRes, campaignsRes, agentsRes] = await Promise.all([
      adminClient.database.from('calls').select('status, duration_seconds, created_at').eq('user_id', req.userId!).limit(500),
      adminClient.database.from('crm_leads').select('status, sentiment').eq('user_id', req.userId!).limit(500),
      adminClient.database.from('campaigns').select('name, status, interested_count, total_contacts').eq('user_id', req.userId!),
      adminClient.database.from('agents').select('name, total_calls, success_rate').eq('user_id', req.userId!),
    ]);

    const calls = callsRes.data || [];
    const leads = leadsRes.data || [];
    const campaigns = campaignsRes.data || [];
    const agents = agentsRes.data || [];

    const totalCalls = calls.length;
    const completedCalls = calls.filter((c: any) => c.status === 'completed').length;
    const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;
    const avgDuration = totalCalls > 0
      ? Math.round(calls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / totalCalls)
      : 0;
    const totalLeads = leads.length;
    const converted = leads.filter((l: any) => l.status === 'converted').length;
    const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;
    const positiveSentiment = leads.filter((l: any) => l.sentiment === 'positive').length;
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter((c: any) => c.status === 'active' || c.status === 'running').length;
    const bestCampaign = campaigns.reduce((best: any, c: any) =>
      ((c.interested_count || 0) > (best?.interested_count || 0) ? c : best), campaigns[0] || null);
    const bestAgent = agents.reduce((best: any, a: any) =>
      ((a.success_rate || 0) > (best?.success_rate || 0) ? a : best), agents[0] || null);

    const hourlyBuckets: Record<number, number> = {};
    calls.forEach((c: any) => {
      if (c.created_at) {
        const hour = new Date(c.created_at).getHours();
        hourlyBuckets[hour] = (hourlyBuckets[hour] || 0) + 1;
      }
    });
    const bestHour = Object.entries(hourlyBuckets).sort((a, b) => b[1] - a[1])[0];
    const bestCallTime = bestHour
      ? `${bestHour[0]}:00 - ${parseInt(bestHour[0]) + 1}:00 (${bestHour[1]} calls)`
      : 'Insufficient data';

    const insights: string[] = [];
    if (successRate > 60) insights.push(`Call success rate is strong at ${successRate}%.`);
    else if (successRate > 40) insights.push(`Call success rate at ${successRate}%. Consider timing adjustments.`);
    else insights.push(`Call success rate is ${successRate}%. Review contact quality.`);

    if (conversionRate > 20) insights.push(`Conversion rate ${conversionRate}% — excellent lead qualification.`);
    else if (conversionRate > 10) insights.push(`Conversion rate ${conversionRate}%. Fine-tune your scripts.`);
    else insights.push(`Conversion rate ${conversionRate}%. Review lead targeting.`);

    if (avgDuration > 120) insights.push(`Avg call duration ${Math.floor(avgDuration / 60)}m${avgDuration % 60}s — good engagement.`);
    else insights.push(`Avg call duration ${Math.floor(avgDuration / 60)}m${avgDuration % 60}s — try longer scripts.`);

    if (positiveSentiment > leads.length * 0.4) insights.push(`Positive sentiment in ${positiveSentiment}/${leads.length} leads — voice agents are well-received.`);

    return res.json({
      data: {
        summary: {
          totalCalls,
          completedCalls,
          successRate,
          avgDuration,
          totalLeads,
          converted,
          conversionRate,
          positiveSentiment,
          totalCampaigns,
          activeCampaigns,
        },
        bestCallTime,
        topCampaign: bestCampaign ? { name: bestCampaign.name, interested: bestCampaign.interested_count || 0 } : null,
        topAgent: bestAgent ? { name: bestAgent.name, successRate: bestAgent.success_rate || 0 } : null,
        trends: {
          hourly: Object.entries(hourlyBuckets).map(([hour, count]) => ({ hour: `${hour}:00`, calls: count })),
          daily: [],
        },
        insights,
      },
    });
  } catch (error: any) {
    logger.error('Failed to generate insights', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

export default router;
