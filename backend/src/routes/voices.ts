import { Router, Response } from 'express';
import { adminClient } from '../lib/insforge.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { generateSarvamTTS } from '../services/sarvamService.js';

const router = Router();

// Sarvam AI available voices metadata
const SARVAM_VOICES = [
  { id: 'anushka', name: 'Anushka', gender: 'female', language: 'te', model: 'bulbul:v2', description: 'Telugu Female (Expressive & Clear)' },
  { id: 'kavya', name: 'Kavya', gender: 'female', language: 'te', model: 'bulbul:v3', description: 'Telugu Female (Conversational & Natural)' },
  { id: 'pavithra', name: 'Pavithra', gender: 'female', language: 'te', model: 'bulbul:v3', description: 'Telugu Female (Professional & Smooth)' },
  { id: 'maitreyi', name: 'Maitreyi', gender: 'female', language: 'te', model: 'bulbul:v3', description: 'Telugu Female (Warm & Engaging)' },
  { id: 'arvind', name: 'Arvind', gender: 'male', language: 'te', model: 'bulbul:v3', description: 'Telugu Male (Deep & Professional)' },
  { id: 'amartya', name: 'Amartya', gender: 'male', language: 'te', model: 'bulbul:v3', description: 'Telugu Male (Clear & Energetic)' },
  { id: 'kaveri', name: 'Kaveri', gender: 'female', language: 'te', model: 'bulbul:v3', description: 'Telugu Female (Soft & Friendly)' },
];

router.use(requireAuth);

// Get available Sarvam voices list
router.get('/sarvam/list', async (_req: AuthRequest, res: Response) => {
  return res.json({ data: SARVAM_VOICES });
});

// Synthesize text to speech using Sarvam AI
router.post('/synthesize', async (req: AuthRequest, res: Response) => {
  try {
    const { text, speaker = 'kavya', language = 'te' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS synthesis' });
    }

    const targetLangCode = language === 'te' ? 'te-IN' : `${language}-IN`;
    const result = await generateSarvamTTS({
      text,
      speaker,
      targetLanguageCode: targetLangCode,
    });

    return res.json({
      success: true,
      audioBase64: result.audioBase64,
      speaker: result.speaker,
      sampleRate: result.sampleRate,
      format: result.format,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await adminClient.database
      .from('voice_library')
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
      .from('voice_library')
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
    const { name, gender, language, description, audio_url, category } = req.body;
    const { data, error } = await adminClient.database
      .from('voice_library')
      .insert({
        user_id: req.userId!,
        name,
        gender: gender || 'female',
        language: language || 'te',
        description,
        audio_url,
        category: category || 'standard',
      })
      .select()
      .single();
    if (error) throw error;
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, gender, language, description, audio_url, category } = req.body;
    const updates: any = {};
    if (name) updates.name = name;
    if (gender) updates.gender = gender;
    if (language) updates.language = language;
    if (description !== undefined) updates.description = description;
    if (audio_url) updates.audio_url = audio_url;
    if (category) updates.category = category;

    const { data, error } = await adminClient.database
      .from('voice_library')
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

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { error } = await adminClient.database
      .from('voice_library')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);
    if (error) throw error;
    return res.json({ message: 'Voice deleted' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/:id/assign', async (req: AuthRequest, res: Response) => {
  try {
    const { agent_id } = req.body;
    const { data: voice } = await adminClient.database
      .from('voice_library')
      .select('name, voice_type, language')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();
    if (!voice) return res.status(404).json({ error: 'Voice not found' });

    const { error } = await adminClient.database
      .from('agents')
      .update({ voice_type: voice.voice_type || voice.name, language: voice.language })
      .eq('id', agent_id)
      .eq('user_id', req.userId!);
    if (error) throw error;
    return res.json({ message: 'Voice assigned to agent' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
