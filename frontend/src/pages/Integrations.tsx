import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plug, MessageSquare, CreditCard, Table2, Slack, Mail, Webhook, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

const integrations = [
  { id: 'whatsapp', name: 'WhatsApp Business', icon: MessageSquare, category: 'Messaging', desc: 'Send call summaries and follow-ups over WhatsApp.' },
  { id: 'razorpay', name: 'Razorpay', icon: CreditCard, category: 'Payments', desc: 'Billing, subscriptions and payment-link handoff.' },
  { id: 'sheets', name: 'Google Sheets', icon: Table2, category: 'Data', desc: 'Sync contacts and call outcomes to a spreadsheet.' },
  { id: 'slack', name: 'Slack', icon: Slack, category: 'Alerts', desc: 'Post escalations to a Slack channel.' },
  { id: 'email', name: 'Email / SMTP', icon: Mail, category: 'Alerts', desc: 'Daily digest and escalation emails.' },
  { id: 'webhook', name: 'Custom Webhook', icon: Webhook, category: 'Developer', desc: 'POST every call event to your own endpoint.' },
]

// ponytail: connection state is local-only; move to users.integrations JSONB + /api/settings when a
// real OAuth handshake or credential storage is needed.
const STORE_KEY = 'dealmycalls_integrations'

function loadConnected(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]')
  } catch {
    return []
  }
}

export function Integrations() {
  const [connected, setConnected] = useState<string[]>(loadConnected)

  const toggle = (id: string, name: string) => {
    const next = connected.includes(id) ? connected.filter(c => c !== id) : [...connected, id]
    setConnected(next)
    localStorage.setItem(STORE_KEY, JSON.stringify(next))
    toast.success(`${name} ${next.includes(id) ? 'connected' : 'disconnected'}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Connect Deal My Calls to the tools your team already uses.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map(item => {
          const isOn = connected.includes(item.id)
          return (
            <div key={item.id} className="glass rounded-2xl p-5 border border-border/50 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                {isOn
                  ? <Badge variant="success" className="gap-1"><Check className="h-3 w-3" /> Connected</Badge>
                  : <Badge variant="default">Not connected</Badge>}
              </div>

              <div className="flex-1">
                <h2 className="font-semibold">{item.name}</h2>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{item.category}</p>
                <p className="text-sm text-muted-foreground mt-2">{item.desc}</p>
              </div>

              <Button
                variant={isOn ? 'outline' : 'primary'}
                size="sm"
                className="w-full"
                onClick={() => toggle(item.id, item.name)}
              >
                <Plug className="h-4 w-4 mr-2" />
                {isOn ? 'Disconnect' : 'Connect'}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
