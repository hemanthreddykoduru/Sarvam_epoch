import { Router, Response } from 'express';
import { adminClient } from '../lib/insforge.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await adminClient.database
      .from('agents')
      .select('*')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ data: data || [] });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await adminClient.database
      .from('agents')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();
    if (error) throw error;
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, type, language, voice_type, system_prompt } = req.body;
    const { data, error } = await adminClient.database
      .from('agents')
      .insert({
        user_id: req.userId!,
        name,
        description,
        type: type || 'voice',
        language: language || 'te',
        voice_type: voice_type || 'female',
        system_prompt,
      })
      .select()
      .single();
    if (error) throw error;
    await adminClient.database
      .from('activity_logs')
      .insert([{ user_id: req.userId!, action: 'Agent Created', entity_type: 'agents', entity_id: data.id }]);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, type, language, voice_type, system_prompt, status } = req.body;
    const updates: any = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (type) updates.type = type;
    if (language) updates.language = language;
    if (voice_type) updates.voice_type = voice_type;
    if (system_prompt !== undefined) updates.system_prompt = system_prompt;
    if (status) updates.status = status;

    const { data, error } = await adminClient.database
      .from('agents')
      .update(updates)
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

router.post('/:id/clone', async (req: AuthRequest, res: Response) => {
  try {
    const { data: original, error: fetchError } = await adminClient.database
      .from('agents')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();
    if (fetchError) throw fetchError;
    if (!original) return res.status(404).json({ error: 'Agent not found' });

    const { data, error } = await adminClient.database
      .from('agents')
      .insert({
        user_id: req.userId!,
        name: `${original.name} (Clone)`,
        description: original.description,
        type: original.type,
        language: original.language,
        voice_type: original.voice_type,
        system_prompt: original.system_prompt,
      })
      .select()
      .single();
    if (error) throw error;
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { error } = await adminClient.database
      .from('agents')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);
    if (error) throw error;
    return res.json({ message: 'Agent deleted' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/:id/test', async (req: AuthRequest, res: Response) => {
  try {
    const { data: agent, error } = await adminClient.database
      .from('agents')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();
    if (error || !agent) return res.status(404).json({ error: 'Agent not found' });
    return res.json({ data: { message: 'Agent test initiated', agent } });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/:id/performance', async (req: AuthRequest, res: Response) => {
  try {
    const [callsResult, agentResult] = await Promise.all([
      adminClient.database
        .from('calls')
        .select('status, duration_seconds')
        .eq('user_id', req.userId!)
        .eq('campaign_id', req.params.id),
      adminClient.database
        .from('agents')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', req.userId!)
        .single(),
    ]);

    if (agentResult.error) throw agentResult.error;

    const calls = callsResult.data || [];
    const total = calls.length;
    const completed = calls.filter((c: any) => c.status === 'completed').length;
    const avgDuration = total > 0
      ? Math.round(calls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / total)
      : 0;
    const interested = calls.filter((c: any) => c.status === 'completed').length;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return res.json({
      data: {
        agent: agentResult.data,
        performance: {
          callsHandled: total,
          avgDuration,
          successRate,
          interestedLeads: interested,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to get agent performance', { error: error.message });
    return res.status(400).json({ error: error.message });
  }
});

export default router;
