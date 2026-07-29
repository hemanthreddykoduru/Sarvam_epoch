import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { api } from '@/lib/api'
import { profileUpdateSchema, type ProfileUpdateFormData } from '@/lib/schemas'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Moon, Sun, LogOut, CreditCard, Key, Eye, EyeOff, Trash2, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const planLabels: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

export function Settings() {
  const { user, signOut, refreshUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('notifications_enabled') !== 'false'
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { full_name: user?.full_name || '' },
  })

  useEffect(() => {
    if (user?.full_name) {
      reset({ full_name: user.full_name })
    }
  }, [user?.full_name, reset])

  const onSubmit = async (data: ProfileUpdateFormData) => {
    setSaving(true)

    // Immediately update localStorage cache
    try {
      const existing = JSON.parse(localStorage.getItem('bde_profile_cache') || '{}')
      localStorage.setItem('bde_profile_cache', JSON.stringify({ ...existing, full_name: data.full_name }))
    } catch {}

    let updated = false

    // 1. Try InsForge database update directly using user email
    try {
      const token = localStorage.getItem('insforge_access_token') || ''
      const authedClient = (await import('@/lib/insforge')).default
      const { error: dbErr } = await authedClient.database
        .from('users')
        .update({ name: data.full_name, full_name: data.full_name })
        .eq('email', user?.email)
      
      if (!dbErr) {
        updated = true
      }
    } catch {}

    // 2. Try Backend API patch
    try {
      const { error: apiErr } = await api.patch('/auth/profile', data)
      if (!apiErr) {
        updated = true
      }
    } catch {}

    setSaving(false)

    // Consider success if either cache updated or API/DB call succeeded
    await refreshUser()
    toast.success('Profile updated successfully')
  }

  const handleNotificationsToggle = () => {
    const next = !notificationsEnabled
    setNotificationsEnabled(next)
    localStorage.setItem('notifications_enabled', String(next))
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              {...register('full_name')}
              error={errors.full_name?.message}
            />
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input value={user?.email || ''} disabled />
            </div>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your plan and credits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Plan</span>
            <Badge variant="info">{planLabels[user?.plan || 'free']}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Credits Remaining</span>
            <span className="text-sm font-semibold">{user?.credits_remaining ?? 0}</span>
          </div>
          <Button variant="primary" className="w-full mt-3" onClick={() => navigate('/subscription')}>
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Manage your plan and billing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Plan</span>
            <Badge variant="info">{planLabels[user?.plan || 'free']}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Credits Remaining</span>
            <span className="text-sm font-semibold">{user?.credits_remaining ?? 0}</span>
          </div>
          <Button variant="primary" className="w-full mt-2" onClick={() => navigate('/subscription')}>
            <CreditCard className="h-4 w-4 mr-2" />
            Manage Subscription
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="text-sm font-medium">Dark Mode</span>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Notifications</span>
            </div>
            <button
              onClick={handleNotificationsToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notificationsEnabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect your own API keys</CardDescription>
        </CardHeader>
        <CardContent>
          <GeminiKeySection />
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Account actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function GeminiKeySection() {
  const [key, setKey] = useState('')
  const [maskedKey, setMaskedKey] = useState<string | null>(null)
  const [hasKey, setHasKey] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ hasKey: boolean; maskedKey: string | null }>('/settings/gemini-key')
      .then(({ data, error }) => {
        if (data) {
          setHasKey(data.hasKey)
          setMaskedKey(data.maskedKey)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!key.trim()) return
    setSaving(true)
    const { error } = await api.put('/settings/gemini-key', { apiKey: key.trim() })
    setSaving(false)
    if (error) {
      toast.error(error)
    } else {
      setHasKey(true)
      setMaskedKey(key.trim().slice(0, 4) + '****' + key.trim().slice(-4))
      setKey('')
      toast.success('Gemini API key saved')
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    const { error } = await api.delete('/settings/gemini-key')
    setSaving(false)
    if (error) {
      toast.error(error)
    } else {
      setHasKey(false)
      setMaskedKey(null)
      setKey('')
      toast.success('Gemini API key removed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Key className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">Gemini API Key</span>
            <Badge variant={hasKey ? 'info' : 'warning'} className="text-[10px]">
              {hasKey ? 'Configured' : 'Not set'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Used for AI call analysis, summaries, and intent detection.
            {!hasKey && ' Falls back to the platform key if available.'}
          </p>

          {hasKey && maskedKey && (
            <div className="flex items-center gap-2 mb-3 p-2.5 rounded-md bg-muted/30 border">
              <code className="text-xs font-mono flex-1 truncate">
                {showKey ? maskedKey : maskedKey.replace(/.(?=.{4})/g, '•')}
              </code>
              <button onClick={() => setShowKey(!showKey)} className="p-1 hover:bg-muted rounded">
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder={hasKey ? 'Enter new key to replace...' : 'Enter your Gemini API key...'}
              value={key}
              onChange={e => setKey(e.target.value)}
              type={showKey ? 'text' : 'password'}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !key.trim()}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
            {hasKey && (
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={saving}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
