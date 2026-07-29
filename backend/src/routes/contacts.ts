import { Router, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { ContactService } from '../services/contactService.js';
import { CampaignService } from '../services/campaignService.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { adminClient } from '../lib/insforge.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const contactService = new ContactService();
const campaignService = new CampaignService();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, campaign_id } = req.query;
    let query = adminClient.database
      .from('contacts')
      .select('*, campaign:campaigns(name)')
      .eq('user_id', req.userId!);

    if (campaign_id && campaign_id !== 'all') {
      query = query.eq('campaign_id', campaign_id);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ data: data || [] });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/campaign/:campaignId', async (req: AuthRequest, res: Response) => {
  try {
    const data = await contactService.getAll(req.userId!, req.params.campaignId);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/campaign/:campaignId/upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    let records: any[] = [];

    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      const content = file.buffer.toString('utf-8');
      records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    } else if (file.mimetype.includes('spreadsheet') || file.originalname.match(/\.xlsx?$/)) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      records = XLSX.utils.sheet_to_json(sheet);
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Use CSV or Excel.' });
    }

    const contacts = records.map((r: any) => ({
      name: r.Name || r.name || r.NAME || '',
      phone: String(r.Phone || r.phone || r.PHONE || r.Mobile || r.mobile || '').replace(/\D/g, ''),
      email: r.Email || r.email || r.EMAIL || '',
    })).filter((c: any) => c.phone.length >= 10);

    const unique = new Map();
    contacts.forEach((c: any) => unique.set(c.phone, c));
    const parsedContacts = Array.from(unique.values());

    await adminClient.database
      .from('activity_logs')
      .insert([{ user_id: req.userId!, action: 'Contact Uploaded', entity_type: 'contacts', metadata: { count: parsedContacts.length, campaignId: req.params.campaignId } }]);

    return res.json({
      total: records.length,
      valid: parsedContacts.length,
      invalid: records.length - parsedContacts.length,
      duplicates: records.length - parsedContacts.length,
      preview: parsedContacts.slice(0, 10),
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/campaign/:campaignId/import', async (req: AuthRequest, res: Response) => {
  try {
    const { contacts } = req.body;
    const data = await contactService.bulkCreate(req.userId!, req.params.campaignId, contacts);
    await campaignService.updateCounts(req.params.campaignId);
    return res.json({ data, count: data?.length || 0 });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, email, campaign_id } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    const data = await contactService.create(req.userId!, {
      campaign_id: campaign_id || null, name, phone, email,
    });
    await adminClient.database
      .from('activity_logs')
      .insert([{ user_id: req.userId!, action: 'Contact Added', entity_type: 'contacts', entity_id: data.id }]);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, email, status } = req.body;
    const updates: any = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (status) updates.status = status;

    const { data, error } = await adminClient.database
      .from('contacts')
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
    await contactService.delete(req.params.id, req.userId!);
    return res.json({ message: 'Contact deleted' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/bulk-delete', async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;
    await contactService.bulkDelete(ids, req.userId!);
    return res.json({ message: 'Contacts deleted' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.patch('/bulk-assign-campaign', async (req: AuthRequest, res: Response) => {
  try {
    const { ids, campaign_id } = req.body;
    const { error } = await adminClient.database
      .from('contacts')
      .update({ campaign_id })
      .in('id', ids)
      .eq('user_id', req.userId!);
    if (error) throw error;
    return res.json({ message: `Assigned ${ids.length} contacts to campaign` });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.patch('/bulk-assign-agent', async (req: AuthRequest, res: Response) => {
  try {
    const { ids, agent_id } = req.body;
    const { error } = await adminClient.database
      .from('contacts')
      .update({ agent_id })
      .in('id', ids)
      .eq('user_id', req.userId!);
    if (error) throw error;
    return res.json({ message: `Assigned ${ids.length} contacts to agent` });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const { campaign_id } = req.query;
    let query = adminClient.database
      .from('contacts')
      .select('name, phone, email, status, call_attempts, last_called_at, created_at')
      .eq('user_id', req.userId!);
    if (campaign_id && campaign_id !== 'all') {
      query = query.eq('campaign_id', campaign_id);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    const csv = ['name,phone,email,status,call_attempts,last_called_at,created_at',
      ...(data || []).map((c: any) =>
        `"${c.name}","${c.phone}","${c.email || ''}","${c.status}","${c.call_attempts}","${c.last_called_at || ''}","${c.created_at}"`
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    return res.send(csv);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
