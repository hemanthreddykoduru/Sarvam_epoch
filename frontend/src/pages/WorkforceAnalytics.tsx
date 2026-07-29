import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import {
  Users, TrendingUp, Sparkles, Clock, CalendarCheck, Award, Bot
} from 'lucide-react'
import {
  useAnalyticsOverview, useSentimentAnalysis, useFollowUps, useAgents, useCalls
} from '@/hooks/useQueries'

function Metric({
  label, value, hint, icon: Icon, tone,
}: { label: string; value: string; hint: string; icon: any; tone: string }) {
  return (
    <Card className="border bg-card/60 backdrop-blur-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className={`p-2 rounded-lg ${tone}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-3xl font-extrabold tracking-tight">{value}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  )
}

export function WorkforceAnalytics() {
  const { data: overview } = useAnalyticsOverview()
  const { data: sentiment } = useSentimentAnalysis()
  const { data: followUps = [] } = useFollowUps()
  const { data: agents = [] } = useAgents()
  const { data: calls = [] } = useCalls()

  const talkSeconds = overview?.total_duration ?? 0
  const hoursSaved = (talkSeconds / 3600).toFixed(1)
  const sentimentTotal = (sentiment?.positive ?? 0) + (sentiment?.neutral ?? 0) + (sentiment?.negative ?? 0)
  const satisfaction = sentimentTotal > 0 ? Math.round(((sentiment?.positive ?? 0) / sentimentTotal) * 100) : 0
  const activeAgents = agents.filter((a: any) => a.status !== 'inactive').length

  // ponytail: calls carry no agent_id, so per-agent activity can't be attributed.
  // Add calls.agent_id + a GROUP BY in analyticsService if you need a real per-employee breakdown.
  const callsPerAgent = agents.length > 0 ? Math.round(calls.length / agents.length) : 0

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workforce Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Executive performance report for your autonomous digital employees.
          </p>
        </div>
        <Badge variant="success" className="w-fit text-xs px-3 py-1">
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          AI Workforce Status: {activeAgents} Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Metric
          label="AI Talk Time"
          value={`${hoursSaved} hrs`}
          hint={`Across ${overview?.total_calls ?? 0} calls handled without staff`}
          icon={Clock}
          tone="bg-blue-500/10 text-blue-500"
        />
        <Metric
          label="Leads Converted"
          value={String(overview?.converted_leads ?? 0)}
          hint={`Out of ${overview?.total_leads ?? 0} leads captured`}
          icon={Users}
          tone="bg-emerald-500/10 text-emerald-500"
        />
        <Metric
          label="Follow-ups Scheduled"
          value={String(followUps.length)}
          hint={`${followUps.filter((f: any) => f.status !== 'completed').length} still pending`}
          icon={CalendarCheck}
          tone="bg-amber-500/10 text-amber-500"
        />
        <Metric
          label="Positive Sentiment"
          value={sentimentTotal > 0 ? `${satisfaction}%` : '—'}
          hint={sentimentTotal > 0 ? `Based on ${sentimentTotal} scored conversations` : 'No scored conversations yet'}
          icon={Award}
          tone="bg-purple-500/10 text-purple-500"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Your Digital Employees
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <EmptyState
              icon={Bot}
              title="No AI employees yet"
              description="Create one under AI Studio → AI Employee."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((emp: any) => (
                <div key={emp.id} className="p-4 rounded-xl border bg-card hover:border-primary/40 transition-colors space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-base">{emp.name}</span>
                    <Badge variant="info">{emp.voice_type || 'default'} · {emp.language || 'te'}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground capitalize">{emp.type || 'voice'}</p>
                      <p>Role</p>
                    </div>
                    <div>
                      <p className="font-medium text-emerald-500">~{callsPerAgent} calls</p>
                      <p>Avg Workload</p>
                    </div>
                    <div>
                      <p className="font-medium text-purple-500 capitalize">{emp.status || 'active'}</p>
                      <p>Status</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
