import { adminClient } from '../lib/insforge.js';

export class CrmService {
  async getAll(userId: string, status?: string) {
    let query = adminClient.database
      .from('crm_leads')
      .select('*, contact:contacts(name, phone), campaign:campaigns(name)')
      .eq('user_id', userId);
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async upsert(userId: string, contactId: string, campaignId: string, callId: string, data: {
    status?: string;
    interest_level?: string;
    sentiment?: string;
    notes?: string;
  }) {
    const { data: lead, error } = await adminClient.database
      .from('crm_leads')
      .upsert({
        user_id: userId,
        contact_id: contactId,
        campaign_id: campaignId,
        last_call_id: callId,
        ...data,
      }, { onConflict: 'user_id,contact_id' })
      .select()
      .single();
    if (error) throw error;
    return lead;
  }

  async update(id: string, userId: string, data: Partial<{
    status: string;
    interest_level: string;
    sentiment: string;
    notes: string;
  }>) {
    const { data: lead, error } = await adminClient.database
      .from('crm_leads')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return lead;
  }

  async getStats(userId: string) {
    const { data, error } = await adminClient.database
      .from('crm_leads')
      .select('status')
      .eq('user_id', userId);
    if (error) throw error;

    const stats: Record<string, number> = {
      total: data?.length || 0,
      new: 0, contacted: 0, interested: 0, 'follow-up': 0, converted: 0, 'not-interested': 0,
    };
    data?.forEach((lead: any) => {
      if (lead.status in stats) stats[lead.status]++;
    });
    return stats;
  }

  // Follow-ups
  async getFollowUps(userId: string) {
    const { data, error } = await adminClient.database
      .from('followups')
      .select('*, contact:contacts(name, phone), campaign:campaigns(name)')
      .eq('user_id', userId)
      .order('scheduled_date', { ascending: true });
    if (error) throw error;
    return data;
  }

  async createFollowUp(userId: string, input: {
    call_id?: string;
    campaign_id: string;
    contact_id: string;
    scheduled_date: string;
    notes?: string;
  }) {
    const { data, error } = await adminClient.database
      .from('followups')
      .insert({ user_id: userId, ...input })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateFollowUp(id: string, userId: string, data: Partial<{
    status: string;
    notes: string;
    scheduled_date: string;
  }>) {
    const { data: fu, error } = await adminClient.database
      .from('followups')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return fu;
  }
}
