export interface Prompt {
  id: string
  user_id: string
  name: string
  content: string
  category: string
  is_template: boolean
  version: number
  created_at: string
  updated_at: string
}

export interface PromptVersion {
  id: string
  prompt_id: string
  version: number
  content: string
  created_at: string
}

export interface VoiceLibrary {
  id: string
  user_id: string
  name: string
  provider: string
  voice_id: string
  language: string
  settings: Record<string, any>
  preview_url?: string
  is_default: boolean
  created_at: string
}

export interface KnowledgeBase {
  id: string
  user_id: string
  name: string
  type: 'file' | 'url'
  content: string
  file_url?: string
  file_type?: string
  agent_id?: string
  created_at: string
}

export interface Recording {
  id: string
  user_id: string
  campaign_id?: string
  agent_id?: string
  recording_url: string
  duration_seconds?: number
  file_size?: number
  created_at: string
  campaign?: { name: string }
  agent?: { name: string }
}

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface InsightData {
  summary: {
    totalCalls: number
    totalLeads: number
    totalCampaigns: number
    totalAgents: number
  }
  bestCallTime: { hour: number; count: number } | null
  topCampaign: { id: string; name: string; count: number } | null
  topAgent: { id: string; name: string; count: number } | null
  hourlyTrends: Array<{ hour: number; count: number }>
  insights: string[]
}

export interface ReportData {
  period: string
  generatedAt: string
  calls: { total: number; completed: number; failed: number; noAnswer: number; avgDuration: number }
  leads: { total: number; new: number; interested: number; converted: number; notInterested: number }
  campaigns: { total: number; active: number; totalContacts: number; totalInterested: number }
  conversionRate: number
}

export interface CreatePromptInput {
  name: string
  content: string
  category?: string
  is_template?: boolean
}

export interface UpdatePromptInput {
  name?: string
  content?: string
  category?: string
}

export interface CreateVoiceInput {
  name: string
  provider: string
  voice_id: string
  language?: string
  settings?: Record<string, any>
  preview_url?: string
}

export interface CreateKnowledgeInput {
  name: string
  type: 'file' | 'url'
  content?: string
  agent_id?: string
}

export interface BulkAssignInput {
  ids: string[]
  campaign_id?: string
  agent_id?: string
}

export interface User {
  id: string
  email: string
  full_name?: string
  role: 'user' | 'admin' | 'superadmin'
  plan: 'free' | 'starter' | 'professional' | 'enterprise'
  credits_remaining: number
  created_at: string
  updated_at?: string
}

export interface Campaign {
  id: string
  user_id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed'
  total_contacts: number
  called_count: number
  connected_count: number
  interested_count: number
  voice_language: 'te' | 'en' | 'mixed'
  /** Derived server-side from the campaign's calls; null when it has none yet. */
  last_call_at?: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  campaign_id: string
  user_id: string
  name: string
  phone: string
  phone_normalized?: string
  status: ContactStatus
  call_attempts: number
  last_called_at?: string
  created_at: string
  campaign?: { name: string }
  last_call?: { id: string; status: string; duration_seconds: number }
  summary?: Summary
}

export type ContactStatus =
  | 'pending' | 'calling' | 'connected' | 'completed' | 'failed' | 'invalid'
  | 'new' | 'contacted' | 'interested' | 'follow-up' | 'converted' | 'not-interested'

export interface ParsedContact {
  name: string
  phone: string
}

export interface Call {
  id: string
  campaign_id: string
  contact_id: string
  user_id: string
  twilio_sid?: string
  status: CallStatus
  duration_seconds: number
  recording_url?: string
  recording_duration?: number
  direction: 'outbound' | 'inbound' | 'browser'
  transcript?: Array<{ role: string; text: string; timestamp?: string }>
  ai_summary?: string
  customer_intent?: string
  interest_level?: string
  sentiment?: string
  follow_up_required?: boolean
  key_notes?: string
  started_at?: string
  ended_at?: string
  created_at: string
  contact?: { name: string; phone: string }
  campaign?: { name: string }
  transcripts?: Transcript[]
  summaries?: Summary
}

export type CallStatus =
  | 'queued' | 'ringing' | 'in-progress' | 'completed'
  | 'failed' | 'no-answer' | 'busy' | 'canceled'

export interface Transcript {
  id: string
  call_id: string
  role: 'ai' | 'customer'
  message: string
  original_language: string
  timestamp_seconds: number
  created_at: string
}

export interface Summary {
  id: string
  call_id: string
  customer_intent?: string
  interest_level: 'high' | 'medium' | 'low' | 'unknown'
  sentiment: 'positive' | 'neutral' | 'negative'
  follow_up_required: boolean
  key_notes?: string
  ai_summary?: string
  created_at: string
}

export interface FollowUp {
  id: string
  call_id: string
  campaign_id: string
  user_id: string
  contact_id: string
  status: 'pending' | 'completed' | 'cancelled'
  scheduled_date: string
  notes?: string
  created_at: string
  contact?: { name: string; phone: string }
  campaign?: { name: string }
}

export interface CreateFollowUpInput {
  call_id?: string
  campaign_id: string
  contact_id: string
  scheduled_date: string
  notes?: string
}

export interface Agent {
  id: string
  user_id: string
  name: string
  type: string
  language: string
  voice_type: string
  system_prompt?: string
  created_at: string
}

export interface AgentPerformance {
  agent: Agent
  performance: {
    callsHandled: number
    avgDuration: number
    successRate: number
    conversionRate: number
  }
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  created_at: string
}

export interface SystemStatus {
  postgresql: string
  gemini: string
  redis: string
  voiceEngine: string
  backend: string
}

export interface SearchResults {
  campaigns: Array<{ id: string; name: string }>
  contacts: Array<{ id: string; name: string; phone: string }>
  calls: Array<{ id: string; status: string; created_at: string }>
}

export interface TodayStats {
  callsToday: number
  callsYesterday: number
  connectedToday: number
  connectedYesterday: number
}

export interface CallOutcomes {
  completed: number
  'no-answer': number
  busy: number
  failed: number
}

export interface SentimentAnalysis {
  positive: number
  neutral: number
  negative: number
}

export interface LanguageDistribution {
  te: number
  en: number
  mixed: number
}

export interface AIInsights {
  insights: string[]
}

// Shape returned by GET /analytics/overview (analyticsService.getOverview)
export interface DashboardStats {
  total_calls: number
  completed_calls: number
  total_duration: number
  total_leads: number
  converted_leads: number
  positive_sentiment: number
  total_campaigns: number
  total_agents: number
}

export interface DailyCallsData {
  date: string
  total: number
  completed: number
  failed: number
}

export interface CampaignPerformance {
  id: string
  name: string
  status: string
  total_contacts: number
  called_count: number
  connected_count: number
  interested_count: number
  call_rate: number
  connect_rate: number
  interest_rate: number
}

export interface AdminStats {
  totalUsers: number
  totalCampaigns: number
  totalCalls: number
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ data: any; error: string | null }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

export interface CreateCampaignInput {
  name: string
  description?: string
  voice_language?: 'te' | 'en' | 'mixed'
}

export interface UpdateCampaignInput {
  name?: string
  description?: string
}
