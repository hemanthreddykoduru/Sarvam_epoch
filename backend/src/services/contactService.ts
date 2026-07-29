import { adminClient } from '../lib/insforge.js';

export class ContactService {
  async getAll(userId: string, campaignId?: string) {
    let query = adminClient.database
      .from('contacts')
      .select('*')
      .eq('user_id', userId);
    if (campaignId) query = query.eq('campaign_id', campaignId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getById(id: string, userId: string) {
    const { data, error } = await adminClient.database
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  }

  async create(userId: string, input: { campaign_id?: string; name: string; phone: string; phone_normalized?: string; email?: string }) {
    const { data, error } = await adminClient.database
      .from('contacts')
      .insert({ user_id: userId, ...input })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async bulkCreate(userId: string, campaignId: string, contacts: Array<{ name: string; phone: string }>) {
    const records = contacts.map(c => ({
      user_id: userId,
      campaign_id: campaignId,
      name: c.name,
      phone: c.phone,
      phone_normalized: c.phone.replace(/\D/g, '').slice(-10),
    }));
    const { data, error } = await adminClient.database
      .from('contacts')
      .insert(records)
      .select();
    if (error) throw error;
    return data;
  }

  async updateStatus(id: string, userId: string, status: string) {
    const { data, error } = await adminClient.database
      .from('contacts')
      .update({ status, last_called_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async incrementAttempts(id: string) {
    const { data: contact, error: fetchError } = await adminClient.database
      .from('contacts')
      .select('call_attempts')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;
    
    const { error } = await adminClient.database
      .from('contacts')
      .update({ call_attempts: (contact?.call_attempts || 0) + 1 })
      .eq('id', id);
    if (error) throw error;
  }

  async delete(id: string, userId: string) {
    const { error } = await adminClient.database
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async bulkDelete(ids: string[], userId: string) {
    const { error } = await adminClient.database
      .from('contacts')
      .delete()
      .in('id', ids)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async getNewContacts(campaignId: string, limit = 1) {
    const { data, error } = await adminClient.database
      .from('contacts')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'new')
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data;
  }
}
