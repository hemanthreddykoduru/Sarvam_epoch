// Shared types for TeluguAI Caller

// ============ User ============
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

// ============ Campaign ============
export interface Campaign {
  id: string
  user_id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  total_contacts: number
  called_count: number
  connected_count: number
  interested_count: number
  voice_language: 'te' | 'en' | 'mixed'
  created_at: string
  updated_at: string
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

// ============ Contact ============
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
  // Joined fields
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

// ============ Call ============
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
  direction: 'outbound' | 'inbound'
  started_at?: string
  ended_at?: string
  created_at: string
  // Joined fields
  contact?: { name: string; phone: string }
  campaign?: { name: string }
  transcripts?: Transcript[]
  summaries?: Summary
}

export type CallStatus =
  | 'queued' | 'ringing' | 'in-progress' | 'completed'
  | 'failed' | 'no-answer' | 'busy' | 'canceled'

// ============ Transcript ============
export interface Transcript {
  id: string
  call_id: string
  role: 'ai' | 'customer'
  message: string
  original_language: string
  timestamp_seconds: number
  created_at: string
}

// ============ Summary ============
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

// ============ FollowUp ============
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
  // Joined fields
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

// ============ Dashboard ============
export interface DashboardStats {
  totalCampaigns: number
  totalCalls: number
  connectedCalls: number
  interestedLeads: number
  followUpLeads: number
}

// ============ Analytics ============
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

// ============ Admin ============
export interface AdminStats {
  totalUsers: number
  totalCampaigns: number
  totalCalls: number
}

// ============ API Responses ============
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// ============ Auth ============
export interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ data: any; error: string | null }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}
