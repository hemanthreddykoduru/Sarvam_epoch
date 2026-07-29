import { Router, Response } from 'express';
import multer from 'multer';
import { adminClient } from '../lib/insforge.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, campaign_id } = req.query;

    // Recordings live on the calls themselves (Sarvam gives one per call); the separate
    // `recordings` table only holds manually uploaded files. Merge both so the page shows all.
    let callQuery = adminClient.database
      .from('calls')
      .select('id, campaign_id, interaction_id, recording_url, duration_seconds, started_at, created_at, contact:contacts(name, phone), campaign:campaigns(name)')
      .eq('user_id', req.userId!)
      .not('recording_url', 'is', null);
    if (campaign_id) callQuery = callQuery.eq('campaign_id', campaign_id);

    const [{ data: callRows, error: callErr }, { data: uploaded }] = await Promise.all([
      callQuery.order('created_at', { ascending: false }),
      adminClient.database
        .from('recordings')
        .select('*, contact:contacts(name, phone), campaign:campaigns(name), agent:agents(name)')
        .eq('user_id', req.userId!)
        .order('created_at', { ascending: false }),
    ]);
    if (callErr) throw callErr;

    const fromCalls = (callRows || []).map((c: any) => ({
      id: c.id,
      user_id: req.userId!,
      // needed by the campaign filter — without it, selecting any campaign hides every row
      campaign_id: c.campaign_id,
      // Sarvam's audio_url is a dashboard page, not a media file — point at our streaming proxy,
      // which fetches the real WAV with the API key server-side.
      recording_url: c.interaction_id ? `/sarvam/recording/${c.interaction_id}` : c.recording_url,
      duration_seconds: c.duration_seconds,
      // when the call happened, not when we synced it
      created_at: c.started_at || c.created_at,
      contact: c.contact,
      campaign: c.campaign,
      source: 'sarvam',
    }));

    let data = [...fromCalls, ...(uploaded || []).map((r: any) => ({ ...r, source: 'upload' }))];
    data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (search) {
      const q = String(search).toLowerCase();
      data = data.filter((r: any) =>
        (r.contact?.name || '').toLowerCase().includes(q) ||
        (r.contact?.phone || '').includes(q) ||
        (r.campaign?.name || '').toLowerCase().includes(q));
    }
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await adminClient.database
      .from('recordings')
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

router.post('/upload', upload.single('audio'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const { call_id, contact_id, agent_id, campaign_id } = req.body;

    const uploadPath = `recordings/${req.userId!}/${Date.now()}_${req.file.originalname}`;
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('call-recordings')
      .upload(uploadPath, new Blob([req.file.buffer], { type: req.file.mimetype }));
    if (uploadError) throw uploadError;

    const recordingUrl = `https://3qxefbbq.us-east.insforge.app/storage/v1/object/public/call-recordings/${uploadPath}`;

    const { data, error } = await adminClient.database
      .from('recordings')
      .insert({
        user_id: req.userId!,
        call_id: call_id || null,
        contact_id: contact_id || null,
        agent_id: agent_id || null,
        campaign_id: campaign_id || null,
        recording_url: recordingUrl,
        duration_seconds: 0,
        file_size_bytes: req.file.size,
      })
      .select()
      .single();
    if (error) throw error;

    await adminClient.database
      .from('activity_logs')
      .insert([{ user_id: req.userId!, action: 'Recording Generated', entity_type: 'recordings', entity_id: data.id }]);

    return res.json({ data });
  } catch (error: any) {
    logger.error('Failed to upload recording', { error: error.message });
    return res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { data: rec } = await adminClient.database
      .from('recordings')
      .select('recording_url')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();
    if (rec?.recording_url) {
      try {
        const key = rec.recording_url.split('/').pop();
        if (key) await adminClient.storage.from('call-recordings').remove(key);
      } catch { }
    }
    const { error } = await adminClient.database
      .from('recordings')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);
    if (error) throw error;
    return res.json({ message: 'Recording deleted' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
