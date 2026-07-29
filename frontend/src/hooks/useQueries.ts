import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Campaign, Contact, Call, DashboardStats, DailyCallsData,
  CampaignPerformance, FollowUp, CreateCampaignInput, UpdateCampaignInput,
  CreateFollowUpInput, AdminStats, User,
  TodayStats, CallOutcomes, SentimentAnalysis, LanguageDistribution,
  AIInsights, Agent, AgentPerformance, Notification, SystemStatus, SearchResults,
  Prompt, PromptVersion, VoiceLibrary, KnowledgeBase, Recording,
  ActivityLog, InsightData, ReportData, CreatePromptInput, UpdatePromptInput,
  CreateVoiceInput, CreateKnowledgeInput
} from '@/types'

// ============ Campaigns ============
export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get<Campaign[]>('/campaigns'),
    select: (res) => res.data || [],
  })
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.get<Campaign>(`/campaigns/${id}`),
    enabled: !!id,
    select: (res) => res.data,
  })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCampaignInput) => api.post<Campaign>('/campaigns', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}

export function useUpdateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateCampaignInput) =>
      api.patch(`/campaigns/${id}`, input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      qc.invalidateQueries({ queryKey: ['campaign', vars.id] })
    },
  })
}

export function useUpdateCampaignStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/campaigns/${id}/status`, { status }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      qc.invalidateQueries({ queryKey: ['campaign', vars.id] })
    },
  })
}

export function useDeleteCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/campaigns/${id}`)
      if (res.error) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}

// ============ Contacts ============
export function useContacts(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['contacts', campaignId],
    queryFn: () => api.get<Contact[]>(`/contacts/campaign/${campaignId}`),
    enabled: !!campaignId,
    select: (res) => res.data || [],
  })
}

export function useImportContacts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ campaignId, contacts }: { campaignId: string; contacts: { name: string; phone: string }[] }) =>
      api.post(`/contacts/campaign/${campaignId}/import`, { contacts }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['contacts', vars.campaignId] })
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useDeleteContacts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ campaignId, contactIds }: { campaignId: string; contactIds: string[] }) =>
      api.post(`/contacts/campaign/${contactIds.join(',')}/bulk-delete`, { ids: contactIds }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['contacts', vars.campaignId] })
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

// ============ Calls ============
export function useCalls(statusFilter?: string) {
  return useQuery({
    queryKey: ['calls', statusFilter],
    queryFn: () => {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      return api.get<Call[]>(`/calls${params}`)
    },
    select: (res) => res.data || [],
    refetchInterval: 5000,
  })
}

export function useCampaignCalls(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['calls', 'campaign', campaignId],
    queryFn: () => api.get<Call[]>(`/calls/campaign/${campaignId}`),
    enabled: !!campaignId,
    select: (res) => res.data || [],
  })
}

export function useCall(id: string | undefined) {
  return useQuery({
    queryKey: ['call', id],
    queryFn: () => api.get<Call>(`/calls/${id}`),
    enabled: !!id,
    select: (res) => res.data,
  })
}

export function useCreateCall() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { campaign_id: string; contact_id: string; direction?: string }) =>
      api.post<Call>('/calls', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calls'] })
    },
  })
}

export function useUpdateCall() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<{
      transcript: any[];
      duration_seconds: number;
      status: string;
      ended_at: string;
      recording_url: string;
    }>) => api.patch(`/calls/${id}`, input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['calls'] })
      qc.invalidateQueries({ queryKey: ['call', vars.id] })
    },
  })
}

// ============ Dashboard ============
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get<DashboardStats>('/analytics/overview'),
    select: (res) => res.data,
  })
}

// ============ Analytics ============
export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get<DashboardStats>('/analytics/overview'),
    select: (res) => res.data,
  })
}

export function useDailyCalls() {
  return useQuery({
    queryKey: ['analytics', 'daily-calls'],
    queryFn: () => api.get<DailyCallsData[]>('/analytics/daily-calls'),
    select: (res) => res.data || [],
  })
}

export function useCampaignPerformance() {
  return useQuery({
    queryKey: ['analytics', 'campaign-performance'],
    queryFn: () => api.get<CampaignPerformance[]>('/analytics/campaign-performance'),
    select: (res) => res.data || [],
  })
}

// ============ CRM ============
export function useLeads(params?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['crm', 'leads', params],
    queryFn: () => {
      const sp = new URLSearchParams()
      if (params?.status) sp.set('status', params.status)
      if (params?.search) sp.set('search', params.search)
      const qs = sp.toString()
      return api.get<Contact[]>(`/crm/leads${qs ? `?${qs}` : ''}`)
    },
    select: (res) => res.data || [],
  })
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/crm/leads/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm'] })
    },
  })
}

// ============ Follow-ups ============
export function useFollowUps() {
  return useQuery({
    queryKey: ['followups'],
    queryFn: () => api.get<FollowUp[]>('/crm/followups'),
    select: (res) => res.data || [],
  })
}

export function useCreateFollowUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFollowUpInput) => api.post('/crm/followups', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['followups'] }),
  })
}

export function useUpdateFollowUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; status: string; notes?: string }) =>
      api.patch(`/crm/followups/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['followups'] }),
  })
}

// ============ Admin ============
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get<AdminStats>('/admin/stats'),
    select: (res) => res.data,
  })
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<User[]>('/admin/users'),
    select: (res) => res.data || [],
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAdminCampaigns() {
  return useQuery({
    queryKey: ['admin', 'campaigns'],
    queryFn: () => api.get<Campaign[]>('/admin/campaigns'),
    select: (res) => res.data || [],
  })
}

// ============ Analytics Extensions ============
export function useTodayStats() {
  return useQuery({
    queryKey: ['analytics', 'today'],
    queryFn: () => api.get<TodayStats>('/analytics/today'),
    select: (res) => res.data,
    refetchInterval: 30000,
  })
}

export function useCallOutcomes() {
  return useQuery({
    queryKey: ['analytics', 'outcomes'],
    queryFn: () => api.get<CallOutcomes>('/analytics/outcomes'),
    select: (res) => res.data,
  })
}

export function useSentimentAnalysis() {
  return useQuery({
    queryKey: ['analytics', 'sentiment'],
    queryFn: () => api.get<SentimentAnalysis>('/analytics/sentiment'),
    select: (res) => res.data,
  })
}

export function useLanguageDistribution() {
  return useQuery({
    queryKey: ['analytics', 'languages'],
    queryFn: () => api.get<LanguageDistribution>('/analytics/languages'),
    select: (res) => res.data,
  })
}

// ============ AI Insights ============
export function useAIInsights() {
  return useQuery({
    queryKey: ['gemini', 'insights'],
    queryFn: () => api.get<AIInsights>('/gemini/insights'),
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000,
  })
}

// ============ Agents ============
export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get<Agent[]>('/agents'),
    select: (res) => res.data || [],
  })
}

export function useAgentPerformance(id: string | undefined) {
  return useQuery({
    queryKey: ['agents', 'performance', id],
    queryFn: () => api.get<AgentPerformance>(`/agents/${id}/performance`),
    enabled: !!id,
    select: (res) => res.data,
  })
}

// ============ Notifications ============
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications'),
    select: (res) => res.data || [],
    refetchInterval: 60000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/notifications/read-all', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

// ============ System ============
export function useSystemStatus() {
  return useQuery({
    queryKey: ['system', 'status'],
    queryFn: () => api.get<SystemStatus>('/system/status'),
    select: (res) => res.data,
    refetchInterval: 60000,
  })
}

// ============ Search ============
export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => api.get<SearchResults>(`/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
    select: (res) => res.data,
  })
}

// ============ Contacts (global) ============
export function useAllContacts(params?: { search?: string; campaign_id?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['contacts', 'all', params],
    queryFn: () => {
      const sp = new URLSearchParams()
      if (params?.search) sp.set('search', params.search)
      if (params?.campaign_id) sp.set('campaign_id', params.campaign_id)
      if (params?.page) sp.set('page', String(params.page))
      if (params?.limit) sp.set('limit', String(params.limit))
      const qs = sp.toString()
      return api.get<Contact[]>(`/contacts${qs ? `?${qs}` : ''}`)
    },
    select: (res) => res.data || [],
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; phone: string; email?: string; campaign_id?: string }) =>
      api.post<Contact>('/contacts', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useUpdateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; phone?: string; email?: string; status?: string }) =>
      api.patch(`/contacts/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useBulkDeleteContacts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => api.post('/contacts/bulk-delete', { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useBulkAssignCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, campaign_id }: { ids: string[]; campaign_id: string }) =>
      api.patch('/contacts/bulk-assign-campaign', { ids, campaign_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

// ============ Prompts ============
export function usePrompts() {
  return useQuery({
    queryKey: ['prompts'],
    queryFn: () => api.get<Prompt[]>('/prompts'),
    select: (res) => res.data || [],
  })
}

export function usePrompt(id: string | undefined) {
  return useQuery({
    queryKey: ['prompts', id],
    queryFn: () => api.get<Prompt>(`/prompts/${id}`),
    enabled: !!id,
    select: (res) => res.data,
  })
}

export function useCreatePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePromptInput) => api.post<Prompt>('/prompts', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompts'] }),
  })
}

export function useUpdatePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdatePromptInput) =>
      api.patch(`/prompts/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] })
    },
  })
}

export function useDeletePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/prompts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompts'] }),
  })
}

export function usePromptVersions(promptId: string | undefined) {
  return useQuery({
    queryKey: ['prompts', 'versions', promptId],
    queryFn: () => api.get<PromptVersion[]>(`/prompts/${promptId}/versions`),
    enabled: !!promptId,
    select: (res) => res.data || [],
  })
}

export function usePromptTemplates() {
  return useQuery({
    queryKey: ['prompts', 'templates'],
    queryFn: () => api.get<Prompt[]>('/prompts/templates'),
    select: (res) => res.data || [],
  })
}

export function useTestPrompt() {
  return useMutation({
    mutationFn: ({ prompt_id, test_input }: { prompt_id: string; test_input: string }) =>
      api.post(`/prompts/${prompt_id}/test`, { test_input }),
  })
}

// ============ Voices ============
export function useVoiceLibrary() {
  return useQuery({
    queryKey: ['voices'],
    queryFn: () => api.get<VoiceLibrary[]>('/voices'),
    select: (res) => res.data || [],
  })
}

export function useCreateVoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateVoiceInput) => api.post<VoiceLibrary>('/voices', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['voices'] }),
  })
}

export function useUpdateVoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<CreateVoiceInput>) =>
      api.patch(`/voices/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['voices'] }),
  })
}

export function useDeleteVoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/voices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['voices'] }),
  })
}

// ============ Knowledge Base ============
export function useKnowledgeBase() {
  return useQuery({
    queryKey: ['knowledge'],
    queryFn: () => api.get<KnowledgeBase[]>('/knowledge'),
    select: (res) => res.data || [],
  })
}

export function useCreateKnowledge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateKnowledgeInput) => api.post<KnowledgeBase>('/knowledge', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge'] }),
  })
}

export function useUploadKnowledgeFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, agent_id }: { file: File; agent_id?: string }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (agent_id) formData.append('agent_id', agent_id)
      const token = localStorage.getItem('insforge_access_token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      return api.post('/knowledge/upload', formData)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge'] }),
  })
}

export function useDeleteKnowledge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/knowledge/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge'] }),
  })
}

// ============ Transcripts ============
export function useTranscripts(params?: { campaign_id?: string; contact_id?: string }) {
  return useQuery({
    queryKey: ['transcripts', params],
    queryFn: () => {
      const sp = new URLSearchParams()
      if (params?.campaign_id) sp.set('campaign_id', params.campaign_id)
      if (params?.contact_id) sp.set('contact_id', params.contact_id)
      const qs = sp.toString()
      return api.get<any[]>(`/transcripts${qs ? `?${qs}` : ''}`)
    },
    select: (res) => res.data || [],
  })
}

export function useTranscriptDetail(callId: string | undefined) {
  return useQuery({
    queryKey: ['transcripts', 'detail', callId],
    queryFn: () => api.get<any[]>(`/transcripts/${callId}`),
    enabled: !!callId,
    select: (res) => res.data,
  })
}

export function useDeleteTranscript() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (callId: string) => api.delete(`/transcripts/${callId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transcripts'] }),
  })
}

// ============ Recordings ============
export function useRecordings(params?: { campaign_id?: string; agent_id?: string }) {
  return useQuery({
    queryKey: ['recordings', params],
    queryFn: () => {
      const sp = new URLSearchParams()
      if (params?.campaign_id) sp.set('campaign_id', params.campaign_id)
      if (params?.agent_id) sp.set('agent_id', params.agent_id)
      const qs = sp.toString()
      return api.get<Recording[]>(`/recordings${qs ? `?${qs}` : ''}`)
    },
    select: (res) => res.data || [],
  })
}

export function useUploadRecording() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, campaign_id, agent_id }: { file: File; campaign_id?: string; agent_id?: string }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (campaign_id) formData.append('campaign_id', campaign_id)
      if (agent_id) formData.append('agent_id', agent_id)
      const token = localStorage.getItem('insforge_access_token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      return fetch(`${import.meta.env.VITE_API_URL}/recordings/upload`, {
        method: 'POST',
        body: formData,
        headers,
      }).then(r => r.json())
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recordings'] }),
  })
}

export function useDeleteRecording() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/recordings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recordings'] }),
  })
}

// ============ Insights ============
export function useInsights() {
  return useQuery({
    queryKey: ['insights'],
    queryFn: () => api.get<InsightData>('/insights'),
    select: (res) => res.data,
  })
}

// ============ Reports ============
export function useReport(period: string, format?: string) {
  return useQuery({
    queryKey: ['reports', period, format],
    queryFn: () => {
      const sp = format ? `?format=${format}` : ''
      return api.get<ReportData>(`/reports/${period}${sp}`)
    },
    select: (res) => res.data,
  })
}

// ============ Activity Logs ============
export function useActivityLogs(params?: { action?: string; entity_type?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['logs', params],
    queryFn: () => {
      const sp = new URLSearchParams()
      if (params?.action) sp.set('action', params.action)
      if (params?.entity_type) sp.set('entity_type', params.entity_type)
      if (params?.page) sp.set('page', String(params.page))
      if (params?.limit) sp.set('limit', String(params.limit))
      const qs = sp.toString()
      return api.get<ActivityLog[]>(`/logs${qs ? `?${qs}` : ''}`)
    },
    select: (res) => res.data || [],
  })
}

// ============ Agents (additional) ============
export function useAgent(id: string | undefined) {
  return useQuery({
    queryKey: ['agents', id],
    queryFn: () => api.get<Agent>(`/agents/${id}`),
    enabled: !!id,
    select: (res) => res.data,
  })
}

export function useCreateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; type?: string; language?: string; voice_type?: string; system_prompt?: string; description?: string }) =>
      api.post<Agent>('/agents', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })
}

export function useUpdateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<Agent>) =>
      api.patch(`/agents/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })
}

export function useCloneAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/agents/${id}/clone`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })
}

export function useDeleteAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/agents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })
}

export function useTestAgent() {
  return useMutation({
    mutationFn: ({ id, test_input }: { id: string; test_input: string }) =>
      api.post(`/agents/${id}/test`, { test_input }),
  })
}

// ============ Sarvam Agents Platform ============
// Every endpoint in the Sarvam Agents API Reference is reachable through the backend passthrough
// at /api/sarvam/:service/*, which injects the API key and org/workspace ids server-side.
// Paths below mirror the docs sidebar; correct one here and every caller follows.
/** Pull calls (inbound + outbound) from Sarvam analytics into the local DB. */
export function useSarvamSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (days?: number) => api.post('/sarvam/sync', { days: days ?? 90 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calls'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['transcripts'] })
    },
  })
}

