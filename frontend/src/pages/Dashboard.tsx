import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, MessageSquare, Smile, Bot, Clock, ArrowRight, Circle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { VoiceChat } from '@/components/VoiceChat'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardStats, useTodayStats, useCalls, useFollowUps } from '@/hooks/useQueries'
import { formatDuration } from '@/lib/utils'

const statusDot: Record<string, string> = {
  'in-progress': 'bg-green-400',
  completed: 'fill-primary text-primary',
  failed: 'fill-red-400 text-red-400',
  'no-answer': 'fill-amber-400 text-amber-400',
  busy: 'fill-amber-400 text-amber-400',
  queued: 'fill-muted-foreground text-muted-foreground',
}

export function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const { data: overview, isPending: statsPending } = useDashboardStats()
  const { data: today } = useTodayStats()
  const { data: calls = [], isPending: callsPending } = useCalls()
  const { data: followUps = [] } = useFollowUps()

  const totalCalls = overview?.total_calls ?? 0
  const completed = overview?.completed_calls ?? 0
  const avgHandle = completed > 0 ? Math.round((overview?.total_duration ?? 0) / completed) : 0
  const resolutionRate = totalCalls > 0 ? Math.round((completed / totalCalls) * 100) : 0
  const pendingFollowUps = followUps.filter((f: any) => f.status !== 'completed').length
  const failedCalls = calls.filter((c: any) => c.status === 'failed').length

  const stats = [
    { label: 'Calls Handled', value: String(totalCalls), icon: Phone, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Calls Today', value: String(today?.callsToday ?? 0), icon: MessageSquare, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Avg Handle Time', value: formatDuration(avgHandle), icon: Clock, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Resolution Rate', value: `${resolutionRate}%`, icon: Smile, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'Pending Follow-ups', value: String(pendingFollowUps), icon: ArrowRight, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Failed Calls', value: String(failedCalls), icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  ]

  const recentCalls = calls.slice(0, 6)

  const tasks = [
    { label: 'Calls Completed', value: String(completed) },
    { label: 'Leads Captured', value: String(overview?.total_leads ?? 0) },
    { label: 'Leads Converted', value: String(overview?.converted_leads ?? 0) },
    { label: 'Positive Sentiment', value: String(overview?.positive_sentiment ?? 0) },
    { label: 'Failed Calls', value: String(failedCalls), alert: failedCalls > 0 },
  ]

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Overview
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Live operations handled by Deal My Calls.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="info" className="bg-primary/5 text-primary border-primary/20 px-3 py-1">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            System Online
          </Badge>
          <div className="text-sm font-medium text-muted-foreground glass px-4 py-1.5 rounded-full border border-border/50">
            {currentTime.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Top Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-xl p-4 border border-border/50 hover:border-primary/50 transition-colors cursor-pointer group"
          >
            <div className={`h-10 w-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground mb-1">
              {statsPending ? <span className="inline-block h-7 w-12 rounded bg-muted/40 animate-pulse" /> : stat.value}
            </p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* AI Employee Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1 glass rounded-2xl p-6 border border-border/50 relative overflow-hidden flex flex-col"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Deal My Calls Agent</h2>
                <p className="text-sm text-green-400 font-medium flex items-center gap-1 mt-0.5">
                  <Clock className="h-3.5 w-3.5" /> Working 24/7
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Workload Summary</h3>

            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.label} className="flex justify-between items-center p-3 rounded-lg bg-muted/40 border border-border/30">
                  <span className="text-sm font-medium">{task.label}</span>
                  <span className={`text-sm font-bold ${task.alert ? 'text-amber-400' : 'text-foreground'}`}>{task.value}</span>
                </div>
              ))}
            </div>
          </div>

          <Button
            className="w-full mt-6 gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all"
            onClick={() => navigate('/calls')}
          >
            View Live Activity <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>

        {/* Live Call Center */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 glass rounded-2xl p-6 border border-border/50"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Live Call Center</h2>
            <Button variant="outline" size="sm" className="h-8 text-xs bg-muted/40 border-border/50" onClick={() => navigate('/calls')}>
              View All
            </Button>
          </div>

          <div className="mb-8">
            <VoiceChat
              agentId={import.meta.env.VITE_SAMVAAD_AGENT_ID}
              customerName={user?.full_name || user?.email || 'Guest'}
            />
          </div>

          <div className="overflow-x-auto">
            {callsPending ? (
              <div className="space-y-2">
                {[0, 1, 2].map(i => <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />)}
              </div>
            ) : recentCalls.length === 0 ? (
              <EmptyState
              icon={Phone}
              title="No calls yet"
              description="Start a campaign and calls will show up here live."
            />
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase tracking-wider bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Direction</th>
                    <th className="px-4 py-3 font-medium">Intent</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 rounded-r-lg font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {recentCalls.map((call: any) => (
                    <tr
                      key={call.id}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => navigate(`/calls/${call.id}`)}
                    >
                      <td className="px-4 py-4 font-medium text-foreground">{call.contact?.name || 'Unknown'}</td>
                      <td className="px-4 py-4">
                        <Badge variant="info" className="bg-primary/10 text-primary border-primary/20 text-xs px-2 py-0.5">
                          {call.direction || 'outbound'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{call.customer_intent || '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          {call.status === 'in-progress' ? (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                            </span>
                          ) : (
                            <Circle className={`h-2 w-2 ${statusDot[call.status] || 'fill-muted-foreground text-muted-foreground'}`} />
                          )}
                          <span className="text-xs font-medium">{call.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-mono text-muted-foreground">{formatDuration(call.duration_seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
