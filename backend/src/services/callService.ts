import { adminClient } from '../lib/insforge.js';

export class CallService {
  async create(userId: string, input: {
    campaign_id: string;
    contact_id: string;
    twilio_sid?: string;
    direction?: string;
  }) {
    const { data, error } = await adminClient.database
      .from('calls')
      .insert({ user_id: userId, ...input })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getByTwilioSid(twilioSid: string) {
    const { data, error } = await adminClient.database
      .from('calls')
      .select('*')
      .eq('twilio_sid', twilioSid)
      .single();
    if (error) throw error;
    return data;
  }

  async updateByTwilioSid(twilioSid: string, input: Partial<{
    status: string;
    duration_seconds: number;
    recording_url: string;
    recording_duration: number;
    transcript: any[];
    customer_intent: string;
    interest_level: string;
    sentiment: string;
    follow_up_required: boolean;
    key_notes: string;
    ai_summary: string;
    started_at: string;
    ended_at: string;
  }>) {
    const { data, error } = await adminClient.database
      .from('calls')
      .update(input)
      .eq('twilio_sid', twilioSid)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async logEvent(callId: string, eventType: string, eventData: Record<string, any> = {}) {
    const { error } = await adminClient.database
      .from('call_events')
      .insert({ call_id: callId, event_type: eventType, event_data: eventData });
    if (error) throw error;
  }

  async getAll(userId: string, campaignId?: string) {
    let query = adminClient.database
      .from('calls')
      .select('*, contact:contacts(name, phone), campaign:campaigns(name)')
      .eq('user_id', userId);
    if (campaignId) query = query.eq('campaign_id', campaignId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getById(id: string, userId: string) {
    const { data, error } = await adminClient.database
      .from('calls')
      .select('*, contact:contacts(name, phone), campaign:campaigns(name)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  }

  async getByCampaign(campaignId: string) {
    const { data, error } = await adminClient.database
      .from('calls')
      .select('*, contact:contacts(name, phone)')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
}
