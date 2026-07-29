import { Router, Response } from 'express';
import { adminClient } from '../lib/insforge.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, agent_id, campaign_id, date_from, date_to } = req.query;

    let query = adminClient.database
      .from('transcripts')
      .select('*, call:calls!inner(id, status, duration_seconds, campaign_id, contact_id, sentiment, created_at, campaign:campaigns!inner(name), contact:contacts!inner(name))')
      .eq('call.user_id', req.userId!);

    if (search) {
      query = query.ilike('message', `%${search}%`);
    }
    if (date_from) {
      query = query.gte('created_at', date_from);
    }
    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    // Ascending: turns must render in conversation order, not newest-first.
    // The limit counts transcript ROWS, not calls — 100 truncated conversations after ~15 calls.
    const { data, error } = await query.order('timestamp_seconds', { ascending: true }).limit(5000);
    if (error) throw error;

    const grouped = new Map();
    (data || []).forEach((t: any) => {
      const callId = t.call_id;
      if (!grouped.has(callId)) {
        grouped.set(callId, {
          id: callId,
          campaign_id: t.call?.campaign_id,
          contact_id: t.call?.contact_id,
          status: t.call?.status,
          duration_seconds: t.call?.duration_seconds,
          sentiment: t.call?.sentiment,
          campaign_name: t.call?.campaign?.name,
          contact_name: t.call?.contact?.name,
          created_at: t.call?.created_at,
          messages: [],
        });
      }
      grouped.get(callId).messages.push({
        id: t.id,
        role: t.role,
        message: t.message,
        original_language: t.original_language,
        timestamp_seconds: t.timestamp_seconds,
      });
    });

    // belt-and-braces: guarantee turn order per call regardless of how the rows arrived
    for (const r of grouped.values()) {
      r.messages.sort((a: any, b: any) => (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0));
    }

    let results = Array.from(grouped.values());

    if (campaign_id) {
      results = results.filter((r: any) => r.campaign_id === campaign_id);
    }
    if (agent_id) {
      results = results.filter((r: any) => r.agent_id === agent_id);
    }

    return res.json({ data: results });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await adminClient.database
      .from('transcripts')
      .select('*, call:calls!inner(id, status, duration_seconds, campaign_id, contact_id, sentiment, ai_summary, created_at, campaign:campaigns!inner(name), contact:contacts!inner(name))')
      .eq('call_id', req.params.id)
      .eq('call.user_id', req.userId!)
      .order('timestamp_seconds', { ascending: true });
    if (error) throw error;

    const messages = (data || []).map((t: any) => ({
      id: t.id,
      role: t.role,
      message: t.message,
      original_language: t.original_language,
      timestamp_seconds: t.timestamp_seconds,
    }));

    const firstCall = (data as any)?.[0]?.call;
    return res.json({
      data: {
        id: req.params.id,
        campaign_id: firstCall?.campaign_id,
        contact_id: firstCall?.contact_id,
        status: firstCall?.status,
        duration_seconds: firstCall?.duration_seconds,
        sentiment: firstCall?.sentiment,
        ai_summary: firstCall?.ai_summary,
        campaign_name: firstCall?.campaign?.name,
        contact_name: firstCall?.contact?.name,
        created_at: firstCall?.created_at,
        messages,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { data: call } = await adminClient.database
      .from('calls')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();
    if (!call) return res.status(404).json({ error: 'Call not found' });

    await adminClient.database.from('transcripts').delete().eq('call_id', req.params.id);
    return res.json({ message: 'Transcript deleted' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
