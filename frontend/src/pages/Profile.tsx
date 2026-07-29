import { Sun, Moon, LogOut, User, Crown, Star, Zap, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { getInitials } from '@/lib/utils'

const roleBadgeVariant = (role: string) => {
  switch (role) {
    case 'superadmin': return 'danger'
    case 'admin': return 'warning'
    default: return 'info'
  }
}

const planIcon = (plan: string) => {
  switch (plan) {
    case 'enterprise': return Crown
    case 'professional': return Star
    case 'starter': return Zap
    default: return User
  }
}

export function Profile() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  if (!user) return null

  const PlanIcon = planIcon(user.plan)
  const planLimits: Record<string, number> = { free: 10, starter: 100, professional: 500, enterprise: 999999 }
  const totalCredits = planLimits[user.plan] || 10
  const creditsUsed = Math.max(0, totalCredits - user.credits_remaining)
  const usagePercent = Math.min(100, Math.round((creditsUsed / totalCredits) * 100))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {getInitials(user.full_name || user.email)}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{user.full_name || 'Unnamed User'}</h2>
              <Badge variant={roleBadgeVariant(user.role)}>{user.role}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              Joined {new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PlanIcon className="h-5 w-5 text-primary" />
            <CardTitle>Plan: {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Credits Remaining</span>
            <span className="text-lg font-bold">{user.credits_remaining}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Usage</span>
              <span>{creditsUsed} / {totalCredits}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
          <Button variant="primary" className="w-full mt-4" onClick={() => navigate('/subscription')}>
            <CreditCard className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-muted-foreground">Toggle between light and dark theme</p>
            </div>
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-4 w-4 mr-1" /> : <Moon className="h-4 w-4 mr-1" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
          </div>
          <hr className="border-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-600 dark:text-red-400">Sign Out</p>
              <p className="text-sm text-muted-foreground">Sign out of your account</p>
            </div>
            <Button variant="destructive" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
