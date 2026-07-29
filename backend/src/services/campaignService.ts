import { adminClient } from '../lib/insforge.js';

export class CampaignService {
  async getAll(userId: string) {
    const { data, error } = await adminClient.database
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return this.withLiveCounts(userId, data || []);
  }

  /**
   * The stored *_count columns are only maintained by the legacy campaign runner, so campaigns
   * created from Sarvam syncs report zero. Derive the numbers from the calls themselves at read
   * time: they can't drift out of sync with reality the way denormalised counters do.
   *
   * ponytail: two extra queries + an in-memory group-by. Fine at this size; move to a SQL
   * GROUP BY (or reinstate maintained counters) if a workspace ever holds a lot of calls.
   */
  private async withLiveCounts(userId: string, campaigns: any[]) {
    if (!campaigns.length) return campaigns;

    const [{ data: calls }, { data: contacts }] = await Promise.all([
      adminClient.database
        .from('calls')
        .select('campaign_id, status, started_at, created_at')
        .eq('user_id', userId),
      adminClient.database
        .from('contacts')
        .select('campaign_id')
        .eq('user_id', userId),
    ]);

    const stats = new Map<string, { called: number; connected: number; lastCallAt?: string }>();
    for (const c of calls || []) {
      const s = stats.get(c.campaign_id) || { called: 0, connected: 0 };
      s.called++;
      if (c.status === 'completed' || c.status === 'in-progress') s.connected++;
      const at = c.started_at || c.created_at;
      if (at && (!s.lastCallAt || at > s.lastCallAt)) s.lastCallAt = at;
      stats.set(c.campaign_id, s);
    }

    const contactCounts = new Map<string, number>();
    for (const c of contacts || []) {
      contactCounts.set(c.campaign_id, (contactCounts.get(c.campaign_id) || 0) + 1);
    }

    return campaigns.map(c => {
      const s = stats.get(c.id);
      return {
        ...c,
        called_count: s?.called ?? c.called_count ?? 0,
        connected_count: s?.connected ?? c.connected_count ?? 0,
        total_contacts: contactCounts.get(c.id) ?? c.total_contacts ?? 0,
        last_call_at: s?.lastCallAt ?? null,
      };
    });
  }

  async getById(id: string, userId: string) {
    const { data, error } = await adminClient.database
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  }

  async create(userId: string, input: { name: string; description?: string; voice_language?: string }) {
    const { data, error } = await adminClient.database
      .from('campaigns')
      .insert({ user_id: userId, ...input })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: string, userId: string, input: Partial<{ name: string; description: string; status: string; voice_language: string }>) {
    const { data, error } = await adminClient.database
      .from('campaigns')
      .update(input)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async delete(id: string, userId: string) {
    await adminClient.database.from('contacts').delete().eq('campaign_id', id).eq('user_id', userId);
    await adminClient.database.from('calls').delete().eq('campaign_id', id).eq('user_id', userId);
    
    const { error } = await adminClient.database
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async updateCounts(campaignId: string) {
    // Use raw SQL to get accurate counts
    const { data, error } = await adminClient.database
      .rpc('get_campaign_stats', { campaign_uuid: campaignId });
    if (error) throw error;
    const stats = data?.[0];
    if (!stats) return;
    
    const { error: updateError } = await adminClient.database
      .from('campaigns')
      .update({
        total_contacts: stats.total_contacts,
        called_count: stats.called_count,
        connected_count: stats.connected_count,
        interested_count: stats.interested_count,
        failed_count: stats.failed_count,
        no_answer_count: stats.no_answer_count,
      })
      .eq('id', campaignId);
    if (updateError) throw updateError;
  }
}
