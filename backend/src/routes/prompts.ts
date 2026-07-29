import { Router, Response } from 'express';
import { adminClient } from '../lib/insforge.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { decrypt } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(requireAuth);

async function getUserGeminiKey(userId: string): Promise<string | null> {
  try {
    const { data: user } = await adminClient.database
      .from('users')
      .select('gemini_api_key')
      .eq('id', userId)
      .single();
    if (user?.gemini_api_key) {
      return decrypt(user.gemini_api_key);
    }
  } catch { /* ignore */ }
  return null;
}

function resolveApiKey(userKey: string | null): string | undefined {
  return userKey || process.env.GEMINI_API_KEY || undefined;
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await adminClient.database
      .from('prompts')
      .select('*')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ data: data || [] });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/templates', async (_req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await adminClient.database
      .from('prompts')
      .select('*')
      .eq('is_template', true)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const templates = (data || []).map((p: any) => ({
      name: p.name,
      slug: p.id,
      system_prompt: p.system_prompt,
    }));
    return res.json({ data: templates });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await adminClient.database
      .from('prompts')
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

router.get('/:id/versions', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await adminClient.database
      .from('prompt_versions')
      .select('*')
      .eq('prompt_id', req.params.id)
      .order('version', { ascending: false });
    if (error) throw error;
    return res.json({ data: data || [] });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, system_prompt, template_type, agent_id } = req.body;
    if (!name || !system_prompt) {
      return res.status(400).json({ error: 'Name and system_prompt are required' });
    }

    const { data, error } = await adminClient.database
      .from('prompts')
      .insert({
        user_id: req.userId!,
        name,
        system_prompt,
        template_type: template_type || 'custom',
        agent_id: agent_id || null,
        version: 1,
      })
      .select()
      .single();
    if (error) throw error;

    await adminClient.database
      .from('prompt_versions')
      .insert([{ prompt_id: data.id, version: 1, system_prompt }]);

    await adminClient.database
      .from('activity_logs')
      .insert([{ user_id: req.userId!, action: 'Prompt Created', entity_type: 'prompts', entity_id: data.id }]);

    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, system_prompt, template_type, agent_id } = req.body;

    const { data: existing } = await adminClient.database
      .from('prompts')
      .select('version')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();
    if (!existing) return res.status(404).json({ error: 'Prompt not found' });

    const newVersion = (existing.version || 0) + 1;
    const updates: any = { version: newVersion };
    if (name) updates.name = name;
    if (system_prompt) updates.system_prompt = system_prompt;
    if (template_type) updates.template_type = template_type;
    if (agent_id !== undefined) updates.agent_id = agent_id;

    const { data, error } = await adminClient.database
      .from('prompts')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select()
      .single();
    if (error) throw error;

    if (system_prompt) {
      await adminClient.database
        .from('prompt_versions')
        .insert([{ prompt_id: data.id, version: newVersion, system_prompt }]);
    }

    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await adminClient.database.from('prompt_versions').delete().eq('prompt_id', req.params.id);
    const { error } = await adminClient.database
      .from('prompts')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);
    if (error) throw error;
    return res.json({ message: 'Prompt deleted' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/:id/test', async (req: AuthRequest, res: Response) => {
  try {
    const { data: prompt } = await adminClient.database
      .from('prompts')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

    const geminiKey = resolveApiKey(await getUserGeminiKey(req.userId!));
    if (!geminiKey) return res.status(503).json({ error: 'Gemini API key not configured' });

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${prompt.system_prompt}\n\nSay a brief test greeting as this agent.` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
      }),
    });

    if (!geminiRes.ok) throw new Error(`Gemini API error: ${geminiRes.status}`);
    const geminiData: any = await geminiRes.json();
    const response = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

    return res.json({ data: { prompt_id: prompt.id, response } });
  } catch (error: any) {
    logger.error('Failed to test prompt', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

export default router;
