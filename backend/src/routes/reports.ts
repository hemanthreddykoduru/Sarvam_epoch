import { Router, Response } from 'express';
import { adminClient } from '../lib/insforge.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(requireAuth);

router.get('/:period', async (req: AuthRequest, res: Response) => {
  try {
    const { period } = req.params;
    const { format } = req.query;
    const validPeriods = ['daily', 'weekly', 'monthly'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: 'Period must be daily, weekly, or monthly' });
    }

    const now = new Date();
    let dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === 'weekly') {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'monthly') {
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    const fromStr = dateFrom.toISOString();

    const [callsRes, leadsRes, campaignsRes] = await Promise.all([
      adminClient.database.from('calls').select('status, duration_seconds').eq('user_id', req.userId!).gte('created_at', fromStr),
      adminClient.database.from('crm_leads').select('status').eq('user_id', req.userId!).gte('created_at', fromStr),
      adminClient.database.from('campaigns').select('name, status, total_contacts, interested_count').eq('user_id', req.userId!),
    ]);

    const calls = callsRes.data || [];
    const leads = leadsRes.data || [];
    const campaigns = campaignsRes.data || [];

    const report = {
      period,
      generatedAt: now.toISOString(),
      calls: {
        total: calls.length,
        completed: calls.filter((c: any) => c.status === 'completed').length,
        failed: calls.filter((c: any) => c.status === 'failed').length,
        noAnswer: calls.filter((c: any) => c.status === 'no-answer').length,
        avgDuration: calls.length > 0
          ? Math.round(calls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / calls.length)
          : 0,
      },
      leads: {
        total: leads.length,
        new: leads.filter((l: any) => l.status === 'new').length,
        interested: leads.filter((l: any) => l.status === 'interested').length,
        converted: leads.filter((l: any) => l.status === 'converted').length,
        notInterested: leads.filter((l: any) => l.status === 'not-interested').length,
      },
      campaigns: {
        total: campaigns.length,
        active: campaigns.filter((c: any) => c.status === 'active' || c.status === 'running').length,
        totalContacts: campaigns.reduce((s: number, c: any) => s + (c.total_contacts || 0), 0),
        totalInterested: campaigns.reduce((s: number, c: any) => s + (c.interested_count || 0), 0),
      },
      conversionRate: leads.length > 0
        ? Math.round((leads.filter((l: any) => l.status === 'converted').length / leads.length) * 100)
        : 0,
    };

    if (format === 'csv') {
      const csv = [
        'metric,value',
        `period,${period}`,
        `total_calls,${report.calls.total}`,
        `completed_calls,${report.calls.completed}`,
        `failed_calls,${report.calls.failed}`,
        `avg_duration_seconds,${report.calls.avgDuration}`,
        `total_leads,${report.leads.total}`,
        `interested_leads,${report.leads.interested}`,
        `converted_leads,${report.leads.converted}`,
        `conversion_rate_pct,${report.conversionRate}`,
        `total_campaigns,${report.campaigns.total}`,
        `active_campaigns,${report.campaigns.active}`,
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report-${period}-${now.toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    }

    return res.json({ data: report });
  } catch (error: any) {
    logger.error('Failed to generate report', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

export default router;
