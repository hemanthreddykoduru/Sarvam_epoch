import { useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarClock, Search, MapPin, Phone, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { motion } from 'framer-motion'
import { useCalls } from '@/hooks/useQueries'
import { formatDate } from '@/lib/utils'

// A call is an escalation when the AI flagged it for follow-up or it ended badly.
const isEscalation = (c: any) =>
  c.follow_up_required || c.sentiment === 'negative' || ['failed', 'no-answer', 'busy'].includes(c.status)

const escalationState = (c: any) =>
  c.status === 'in-progress' ? 'in-progress' : c.status === 'completed' ? 'resolved' : 'open'

export function Appointments() {
  const [search, setSearch] = useState('')
  const { data: calls = [], isPending } = useCalls()

  const escalations = calls
    .filter(isEscalation)
    .filter((c: any) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (c.contact?.name || '').toLowerCase().includes(q) ||
        (c.contact?.phone || '').includes(search) ||
        (c.customer_intent || '').toLowerCase().includes(q)
    })

  const openCount = escalations.filter((c: any) => escalationState(c) === 'open').length

  const triggerOutboundCall = async (customerName: string, customerPhone: string, service: string) => {
    toast.loading(`Dialing ${customerName}...`, { id: 'outbound-call' })
    const { error } = await api.post('/outbound/trigger', { customerName, customerPhone, service })
    if (error) {
      toast.error(`Error: ${error}`, { id: 'outbound-call' })
    } else {
      toast.success(`Connected! AI is calling ${customerName}.`, { id: 'outbound-call' })
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Support Escalations
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Calls the AI flagged for a human follow-up.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search escalations..."
            className="h-10 pl-9 pr-4 rounded-full bg-muted/40 border border-border/50 text-sm focus:outline-none focus:border-primary/50 transition-colors w-64 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 border border-border/50"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-lg">Today's Overview</h2>
              <Badge variant="info" className="bg-primary/10 text-primary border-primary/20">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/40 rounded-xl p-4 border border-border/30">
                <p className="text-2xl font-bold">{escalations.length}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">Total Escalations</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 border border-border/30">
                <p className="text-2xl font-bold text-amber-400">{openCount}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">Open</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border/30">
              <p className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">AI Employee Status</p>
              <div className="flex items-center justify-between bg-primary/5 border border-primary/10 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Tech Support AI</p>
                    <p className="text-xs text-green-400">Online & Assisting</p>
                  </div>
                </div>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 glass rounded-2xl p-6 border border-border/50 flex flex-col"
        >
          <h2 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Escalation Queue
          </h2>

          {isPending ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />)}
            </div>
          ) : escalations.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No escalations"
              description="Calls flagged for follow-up will appear here."
            />
          ) : (
            <div className="flex-1 space-y-4">
              {escalations.map((apt: any) => {
                const state = escalationState(apt)
                return (
                  <div key={apt.id} className="relative pl-6 pb-4 border-l-2 border-border/50 last:border-l-transparent last:pb-0">
                    <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-background ${
                      state === 'resolved' ? 'bg-muted-foreground' :
                      state === 'in-progress' ? 'bg-primary animate-pulse' : 'bg-amber-400'
                    }`} />

                    <div className="bg-muted/40 border border-border/30 rounded-xl p-4 hover:border-primary/30 transition-colors">
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            <p className="text-sm font-bold font-mono">{formatDate(apt.created_at)}</p>
                            <Badge variant="info" className={`mt-1 text-[10px] uppercase ${
                              state === 'resolved' ? 'text-muted-foreground border-muted-foreground/30' :
                              state === 'in-progress' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                            }`}>
                              {state}
                            </Badge>
                          </div>

                          <div className="w-px h-12 bg-border/50 hidden sm:block mx-2" />

                          <div>
                            <h3 className="text-lg font-semibold">{apt.contact?.name || 'Unknown caller'}</h3>
                            <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {apt.status}</span>
                              <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {apt.customer_intent || apt.key_notes || 'No intent captured'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            disabled={!apt.contact?.phone}
                            onClick={() => triggerOutboundCall(
                              apt.contact?.name || 'Customer',
                              apt.contact?.phone,
                              apt.customer_intent || 'Support escalation'
                            )}
                          >
                            <Phone className="h-4 w-4 mr-2" /> Call back
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
