import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePayment } from '@/contexts/PaymentContext'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Crown, Star, Zap, User, Check, ArrowUp, CreditCard, Clock, Shield, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    priceNum: 0,
    credits: '10 credits/mo',
    creditsNum: 10,
    contacts: '50 contacts',
    features: ['Basic Telugu calls', 'Email support'],
    icon: User,
    popular: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '₹999',
    priceNum: 999,
    credits: '100 credits/mo',
    creditsNum: 100,
    contacts: '500 contacts',
    features: ['Telugu + English', 'Transcripts', 'Summaries', 'Email support'],
    icon: Zap,
    popular: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '₹2,999',
    priceNum: 2999,
    credits: '500 credits/mo',
    creditsNum: 500,
    contacts: '2,500 contacts',
    features: ['All features', 'Analytics dashboard', 'CRM', 'CSV/Excel upload', 'Recordings', 'Priority support'],
    icon: Star,
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    priceNum: 0,
    credits: 'Unlimited',
    creditsNum: 999999,
    contacts: 'Unlimited',
    features: ['Everything', 'Dedicated voice', 'Custom prompts', 'API access', 'SLA', 'Phone support'],
    icon: Crown,
    popular: false,
  },
]

const planLimits: Record<string, number> = { free: 10, starter: 100, professional: 500, enterprise: 999999 }
const planLabels: Record<string, string> = { free: 'Free', starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise' }

export function Subscription() {
  const { user } = useAuth()
  const { createCheckout, isLoading } = usePayment()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  const currentPlan = user.plan || 'free'
  const totalCredits = planLimits[currentPlan] || 10
  const creditsUsed = Math.max(0, totalCredits - user.credits_remaining)
  const usagePercent = Math.min(100, Math.round((creditsUsed / totalCredits) * 100))
  const currentPlanIndex = plans.findIndex(p => p.id === currentPlan)

  const handleCheckout = async (planId: string) => {
    setError(null)
    const plan = plans.find(p => p.id === planId)
    if (!plan || plan.priceNum === 0) return
    const success = await createCheckout(planId, plan.priceNum)
    if (success) {
      navigate('/settings')
    } else {
      setError('Payment failed. Please try again.')
    }
  }

  const CurrentPlanIcon = plans[currentPlanIndex]?.icon || User

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Subscription & Billing</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CurrentPlanIcon className="h-5 w-5 text-primary" />
            <CardTitle>Current Plan: {planLabels[currentPlan] || 'Free'}</CardTitle>
          </div>
          <CardDescription>Your subscription details and usage</CardDescription>
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
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan, i) => {
            const isCurrent = plan.id === currentPlan
            const isHigher = plans.indexOf(plans.find(p => p.id === currentPlan)!) < i
            const PlanIcon = plan.icon

            return (
              <Card
                key={plan.id}
                className={cn(
                  'relative flex flex-col',
                  plan.popular && !isCurrent && 'border-primary shadow-lg shadow-primary/10',
                  isCurrent && 'ring-2 ring-primary'
                )}
              >
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <PlanIcon className="h-5 w-5 text-primary" />
                    {isCurrent && <Badge variant="success">Current Plan</Badge>}
                  </div>
                  <CardTitle className="mt-2">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold">{plan.price}</div>
                  <CardDescription>{plan.credits} &bull; {plan.contacts}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Current Plan
                    </div>
                  ) : isHigher ? (
                    plan.id === 'enterprise' ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate('/contact')}
                      >
                        Contact Sales
                      </Button>
                    ) : (
                      <Button
                        variant={plan.popular ? 'primary' : 'outline'}
                        className="w-full"
                        onClick={() => handleCheckout(plan.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing</>
                        ) : (
                          <><ArrowUp className="mr-2 h-4 w-4" /> Upgrade</>
                        )}
                      </Button>
                    )
                  ) : (
                    <p className="text-center text-xs text-muted-foreground py-2">
                      Contact support to downgrade
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Payment History</CardTitle>
          </div>
          <CardDescription>Your recent transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No payment history yet</p>
            <p className="text-xs text-muted-foreground mt-1">Your transactions will appear here after your first purchase.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Billing & Security</CardTitle>
          </div>
          <CardDescription>Your payment information is secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            All payments are processed securely through Razorpay. We do not store your payment details on our servers.
          </p>
          <p className="text-sm text-muted-foreground">
            For any billing inquiries, please contact{' '}
            <a href="mailto:support@teluguai.app" className="text-primary hover:underline">support@teluguai.app</a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
