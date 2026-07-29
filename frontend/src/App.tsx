import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { api } from '@/lib/api'
import { AppLayout } from './components/layout/AppLayout'
import { Integrations } from './pages/Integrations'
import { WhatsApp } from './pages/WhatsApp'
import { Appointments } from './pages/Appointments'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { Dashboard } from './pages/Dashboard'
import { Campaigns } from './pages/Campaigns'
import { CampaignDetail } from './pages/CampaignDetail'
import { NewCampaign } from './pages/NewCampaign'
import { Contacts } from './pages/Contacts'
import { Calls } from './pages/Calls'
import { CallDetail } from './pages/CallDetail'
import { Analytics } from './pages/Analytics'
import { CRM } from './pages/CRM'
import { AIFDE } from './pages/AIFDE'
import { Agents } from './pages/Agents'
import { PromptStudio } from './pages/PromptStudio'
import { VoiceLibrary } from './pages/VoiceLibrary'
import { KnowledgeBase } from './pages/KnowledgeBase'
import { Transcripts } from './pages/Transcripts'
import { Recordings } from './pages/Recordings'
import { Insights } from './pages/Insights'
import { Reports } from './pages/Reports'
import { Logs } from './pages/Logs'
import { VoiceSimulation } from './pages/VoiceSimulation'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminUsers } from './pages/AdminUsers'
import { AdminCampaigns } from './pages/AdminCampaigns'
import { Profile } from './pages/Profile'
import { Settings } from './pages/Settings'
import { Subscription } from './pages/Subscription'
import { FollowUps } from './pages/FollowUps'
import { WorkforceAnalytics } from './pages/WorkforceAnalytics'
import { Loader2 } from 'lucide-react'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) return <Navigate to="/dashboard" />
  return <>{children}</>
}

function CallbackHandler() {
  const { refreshUser } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken && refreshToken) {
        localStorage.setItem('insforge_access_token', accessToken)
        localStorage.setItem('insforge_refresh_token', refreshToken)

        await api.post('/auth/callback', { accessToken, refreshToken })
        await refreshUser()
        window.location.href = '/dashboard'
      } else {
        setError('Authentication failed. Please try again.')
      }
    }
    handleCallback()
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive text-lg font-medium">{error}</p>
        <a href="/login" className="text-primary hover:underline">Back to Login</a>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/callback" element={<CallbackHandler />} />


      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calls" element={<Calls />} />
        <Route path="/calls/:id" element={<CallDetail />} />
        <Route path="/inbound" element={<Calls direction="inbound" />} />
        <Route path="/outbound" element={<Calls direction="outbound" />} />
        <Route path="/whatsapp" element={<WhatsApp />} />
        <Route path="/escalations" element={<Appointments />} />
        <Route path="/appointments" element={<Navigate to="/escalations" replace />} />
        <Route path="/recordings" element={<Recordings />} />
        <Route path="/transcripts" element={<Transcripts />} />
        <Route path="/followups" element={<FollowUps />} />

        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/new" element={<NewCampaign />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />

        <Route path="/subscription" element={<Subscription />} />
        <Route path="/customers" element={<Contacts />} />
        <Route path="/crm" element={<CRM />} />

        <Route path="/analytics" element={<Analytics />} />
        <Route path="/workforce" element={<WorkforceAnalytics />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/ai-fde" element={<AIFDE />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/knowledge" element={<KnowledgeBase />} />
        <Route path="/prompts" element={<PromptStudio />} />
        <Route path="/voices" element={<VoiceLibrary />} />
        <Route path="/simulation" element={<VoiceSimulation />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/logs" element={<Logs />} />

        <Route path="/integrations" element={<Integrations />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route element={<AdminRoute><AppLayout /></AdminRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/campaigns" element={<AdminCampaigns />} />
      </Route>
    </Routes>
  )
}
