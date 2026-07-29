import { adminClient } from '../lib/insforge.js';

export class AnalyticsService {
  async getOverview(userId: string) {
    const [calls, leads, campaigns, agents] = await Promise.all([
      adminClient.database.from('calls').select('id, status, duration_seconds, created_at').eq('user_id', userId).limit(500),
      adminClient.database.from('crm_leads').select('id, status, sentiment').eq('user_id', userId).limit(500),
      adminClient.database.from('campaigns').select('id').eq('user_id', userId),
      adminClient.database.from('agents').select('id').eq('user_id', userId),
    ]);

    const callsData = calls.data || [];
    const leadsData = leads.data || [];

    const totalCalls = callsData.length;
    const completedCalls = callsData.filter((c: any) => c.status === 'completed').length;
    const totalDuration = callsData.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0);
    const totalLeads = leadsData.length;
    const convertedLeads = leadsData.filter((l: any) => l.status === 'converted').length;
    const positiveSentiment = leadsData.filter((l: any) => l.sentiment === 'positive').length;

    return {
      total_calls: totalCalls,
      completed_calls: completedCalls,
      total_duration: totalDuration,
      total_leads: totalLeads,
      converted_leads: convertedLeads,
      positive_sentiment: positiveSentiment,
      total_campaigns: campaigns.data?.length || 0,
      total_agents: agents.data?.length || 0,
    };
  }

  async getDailyCalls(userId: string, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await adminClient.database
      .from('calls')
      .select('created_at, status')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const dailyMap: Record<string, { total: number; completed: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { total: 0, completed: 0 };
    }

    (data || []).forEach((c: any) => {
      const key = new Date(c.created_at).toISOString().split('T')[0];
      if (dailyMap[key]) {
        dailyMap[key].total++;
        if (c.status === 'completed') dailyMap[key].completed++;
      }
    });

    return Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));
  }

  async getCampaignPerformance(userId: string) {
    const { data, error } = await adminClient.database
      .from('campaigns')
      .select('id, name, status, interested_count, total_contacts')
      .eq('user_id', userId)
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  async getDashboardStats(userId: string) {
    const [calls, leads, campaigns] = await Promise.all([
      adminClient.database.from('calls').select('id, duration_seconds, created_at').eq('user_id', userId).limit(1000),
      adminClient.database.from('crm_leads').select('id').eq('user_id', userId),
      adminClient.database.from('campaigns').select('id, interested_count').eq('user_id', userId),
    ]);

    const callsData = calls.data || [];
    const leadsData = leads.data || [];
    const campaignsData = campaigns.data || [];

    const totalCalls = callsData.length;
    const totalDuration = callsData.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0);
    const interested = campaignsData.reduce((s: number, c: any) => s + (c.interested_count || 0), 0);

    return {
      total_calls: totalCalls,
      total_duration: totalDuration,
      total_leads: leadsData.length,
      total_campaigns: campaignsData.length,
      interested_leads: interested,
    };
  }

  async getTodayStats(userId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    const yesterdayEnd = todayStart;

    const [todayCalls, yesterdayCalls, todayConnected, yesterdayConnected] = await Promise.all([
      adminClient.database.from('calls').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', todayStart),
      adminClient.database.from('calls').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', yesterdayStart).lt('created_at', yesterdayEnd),
      adminClient.database.from('calls').select('*', { count: 'exact', head: true }).eq('user_id', userId).in('status', ['completed', 'in-progress']).gte('created_at', todayStart),
      adminClient.database.from('calls').select('*', { count: 'exact', head: true }).eq('user_id', userId).in('status', ['completed', 'in-progress']).gte('created_at', yesterdayStart).lt('created_at', yesterdayEnd),
    ]);

    return {
      callsToday: todayCalls.count || 0,
      callsYesterday: yesterdayCalls.count || 0,
      connectedToday: todayConnected.count || 0,
      connectedYesterday: yesterdayConnected.count || 0,
    };
  }

  async getCallOutcomes(userId: string) {
    const { data, error } = await adminClient.database
      .from('calls')
      .select('status')
      .eq('user_id', userId);
    if (error) throw error;

    const counts: Record<string, number> = {
      completed: 0, 'no-answer': 0, busy: 0, failed: 0,
    };
    data?.forEach((c: any) => {
      const s = c.status === 'completed' ? 'completed'
        : c.status === 'no-answer' ? 'no-answer'
        : c.status === 'busy' ? 'busy'
        : 'failed';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }

  async getSentimentAnalysis(userId: string) {
    const { data, error } = await adminClient.database
      .from('crm_leads')
      .select('sentiment')
      .eq('user_id', userId)
      .not('sentiment', 'is', null);
    if (error) throw error;

    const counts: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
    data?.forEach((l: any) => {
      if (l.sentiment in counts) counts[l.sentiment]++;
    });
    return counts;
  }

  async getLanguageDistribution(userId: string) {
    const { data, error } = await adminClient.database
      .from('campaigns')
      .select('voice_language')
      .eq('user_id', userId);
    if (error) throw error;

    const counts: Record<string, number> = { te: 0, en: 0, mixed: 0 };
    data?.forEach((c: any) => {
      if (c.voice_language in counts) counts[c.voice_language]++;
    });
    return counts;
  }
}
