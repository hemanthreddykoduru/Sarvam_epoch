import { Router, Response } from 'express';
import multer from 'multer';
import { adminClient } from '../lib/insforge.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await adminClient.database
      .from('knowledge_base')
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
      .from('knowledge_base')
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

router.post('/upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ext = req.file.originalname.split('.').pop()?.toLowerCase() || '';
    const allowed = ['pdf', 'docx', 'txt'];
    if (!allowed.includes(ext)) {
      return res.status(400).json({ error: 'Only PDF, DOCX, and TXT files are supported' });
    }

    const content = req.file.buffer.toString('utf-8').slice(0, 50000);

    const { data, error } = await adminClient.database
      .from('knowledge_base')
      .insert({
        user_id: req.userId!,
        name: req.file.originalname,
        file_type: ext,
        content,
      })
      .select()
      .single();
    if (error) throw error;

    await adminClient.database
      .from('activity_logs')
      .insert([{ user_id: req.userId!, action: 'Knowledge Base Updated', entity_type: 'knowledge_base', entity_id: data.id }]);

    return res.json({ data });
  } catch (error: any) {
    logger.error('Failed to upload knowledge base file', { error: error.message });
    return res.status(400).json({ error: error.message });
  }
});

router.post('/url', async (req: AuthRequest, res: Response) => {
  try {
    const { name, url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    let content = '';
    try {
      const resp = await fetch(url);
      content = await resp.text();
      content = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 50000);
    } catch {
      content = `[Content from ${url} could not be fetched]`;
    }

    const { data, error } = await adminClient.database
      .from('knowledge_base')
      .insert({
        user_id: req.userId!,
        name: name || url,
        file_type: 'url',
        source_url: url,
        content,
      })
      .select()
      .single();
    if (error) throw error;
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.patch('/:id/assign', async (req: AuthRequest, res: Response) => {
  try {
    const { agent_id } = req.body;
    const { data, error } = await adminClient.database
      .from('knowledge_base')
      .update({ agent_id: agent_id || null })
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

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { error } = await adminClient.database
      .from('knowledge_base')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);
    if (error) throw error;
    return res.json({ message: 'Document deleted' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
