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

router.get('/token', async (req: AuthRequest, res: Response) => {
  const apiKey = resolveApiKey(await getUserGeminiKey(req.userId!));
  if (!apiKey) {
    return res.status(503).json({ error: 'Gemini API key not configured' });
  }
  return res.json({ data: { apiKey } });
});

router.post('/calls/:id/analyze', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { data: call } = await adminClient.database
      .from('call_transcripts')
      .select('*')
      .eq('call_id', id)
      .eq('user_id', req.userId!)
      .single();

    if (!call) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    const geminiKey = resolveApiKey(await getUserGeminiKey(req.userId!));
    if (!geminiKey) {
      return res.status(503).json({ error: 'Gemini API key not configured' });
    }

    const prompt = `Analyze this sales call transcript and provide:
1. Summary (2-3 sentences)
2. Key points discussed
3. Objections raised
4. Recommended next action
5. Overall sentiment (positive/neutral/negative)

Transcript:
${call.content?.slice(0, 10000)}

Respond in JSON format with keys: summary, keyPoints (array), objections (array), nextAction, sentiment`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      }),
    });

    if (!geminiRes.ok) {
      throw new Error(`Gemini API error: ${geminiRes.status}`);
    }

    const geminiData: any = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let analysis;
    try {
      const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      analysis = { summary: text.slice(0, 500), sentiment: 'neutral' };
    }

    await adminClient.database
      .from('crm_leads')
      .update({
        notes: analysis.summary || text.slice(0, 500),
        sentiment: analysis.sentiment || 'neutral',
      })
      .eq('user_id', req.userId!)
      .eq('last_call_id', id);

    return res.json({ data: analysis });
  } catch (error: any) {
    logger.error('Failed to analyze call transcript', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

router.post('/calls/:id/intent', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { data: call } = await adminClient.database
      .from('call_transcripts')
      .select('*')
      .eq('call_id', id)
      .eq('user_id', req.userId!)
      .single();

    if (!call) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    const geminiKey = resolveApiKey(await getUserGeminiKey(req.userId!));
    if (!geminiKey) {
      return res.status(503).json({ error: 'Gemini API key not configured' });
    }

    const prompt = `What is the primary intent of this call transcript? Choose one: "interested", "not_interested", "callback", "wrong_number", "information_seeking", "completed", "other". Respond with only the intent word.

Transcript:
${call.content?.slice(0, 5000)}`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 50 },
      }),
    });

    if (!geminiRes.ok) {
      throw new Error(`Gemini API error: ${geminiRes.status}`);
    }

    const geminiData: any = await geminiRes.json();
    const intent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() || 'other';

    return res.json({ data: { intent } });
  } catch (error: any) {
    logger.error('Failed to detect call intent', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

router.get('/insights', async (req: AuthRequest, res: Response) => {
  try {
    const [leadsRes, callsRes, campaignsRes] = await Promise.all([
      adminClient.database
        .from('crm_leads')
        .select('status, sentiment')
        .eq('user_id', req.userId!)
        .limit(50),
      adminClient.database
        .from('calls')
        .select('status, duration_seconds')
        .eq('user_id', req.userId!)
        .order('created_at', { ascending: false })
        .limit(100),
      adminClient.database
        .from('campaigns')
        .select('name, status')
        .eq('user_id', req.userId!),
    ]);

    const leads = leadsRes.data || [];
    const calls = callsRes.data || [];
    const campaigns = campaignsRes.data || [];

    const totalLeads = leads.length;
    const converted = leads.filter((l: any) => l.status === 'converted').length;
    const positiveSentiment = leads.filter((l: any) => l.sentiment === 'positive').length;
    const avgDuration = calls.length > 0
      ? Math.round(calls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / calls.length)
      : 0;
    const activeCampaigns = campaigns.filter((c: any) => c.status === 'active').length;
    const totalCalls = calls.length;
    const completedCalls = calls.filter((c: any) => c.status === 'completed').length;
    const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;
    const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

    const insights: string[] = [];

    if (conversionRate > 20) insights.push(`High conversion rate (${conversionRate}%) — your targeting and messaging are effective.`);
    else if (conversionRate > 10) insights.push(`Moderate conversion rate (${conversionRate}%). Consider A/B testing your call scripts.`);
    else insights.push(`Low conversion rate (${conversionRate}%). Review your lead qualification and call scripts.`);

    if (successRate > 70) insights.push(`Call success rate is strong at ${successRate}%. `);
    else if (successRate > 50) insights.push(`Call success rate at ${successRate}%. Check for timing or number quality issues.`);
    else insights.push(`Call success rate is ${successRate}% — consider reviewing your contact list quality and call timing.`);

    if (avgDuration > 120) insights.push(`Average call duration is ${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s — good engagement levels.`);
    else insights.push(`Average call duration is ${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s — consider scripts that encourage longer conversations.`);

    if (positiveSentiment > totalLeads * 0.4) insights.push(`Majority sentiment is positive (${positiveSentiment}/${totalLeads} leads) — your voice agents are well-received.`);
    else insights.push(`Sentiment is mixed (${positiveSentiment}/${totalLeads} positive). Review call recordings for improvement areas.`);

    if (activeCampaigns === 0) insights.push('No active campaigns. Start a campaign to generate leads.');

    return res.json({ data: { insights } });
  } catch (error: any) {
    logger.error('Failed to generate AI insights', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

export default router;
