import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useInsights, useAIInsights } from '@/hooks/useQueries'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { AnalyticsSkeleton } from '@/components/ui/PageSkeleton'
import { AlertCircle, RefreshCw, Phone, Users, Target, Zap, Clock, BarChart3, TrendingUp, Star, Activity, PieChart, MessageSquare, Lightbulb } from 'lucide-react'

const insightIcons: Record<string, React.ReactNode> = {
  'call': <Phone className="h-4 w-4" />,
  'lead': <Users className="h-4 w-4" />,
  'campaign': <Target className="h-4 w-4" />,
  'agent': <Zap className="h-4 w-4" />,
  'time': <Clock className="h-4 w-4" />,
  'trend': <TrendingUp className="h-4 w-4" />,
  'activity': <Activity className="h-4 w-4" />,
  'message': <MessageSquare className="h-4 w-4" />,
  'star': <Star className="h-4 w-4" />,
  'pie': <PieChart className="h-4 w-4" />,
}

function getInsightIcon(text: string): React.ReactNode {
  const lower = text.toLowerCase()
  if (lower.includes('call')) return insightIcons.call
  if (lower.includes('lead')) return insightIcons.lead
  if (lower.includes('campaign')) return insightIcons.campaign
  if (lower.includes('agent')) return insightIcons.agent
  if (lower.includes('time') || lower.includes('hour')) return insightIcons.time
  if (lower.includes('trend') || lower.includes('growth')) return insightIcons.trend
  if (lower.includes('activity')) return insightIcons.activity
  if (lower.includes('message') || lower.includes('conversation')) return insightIcons.message
  if (lower.includes('star') || lower.includes('top')) return insightIcons.star
  return insightIcons.pie
}

export function Insights() {
  const { data: insights, isPending, isError, error, refetch, isRefetching } = useInsights()
  const { data: aiInsights } = useAIInsights()

  const summaryCards = useMemo(() => {
    if (!insights?.summary) return []
    return [
      { label: 'Total Calls', value: insights.summary.totalCalls, icon: <Phone className="h-5 w-5" />, color: 'text-blue-500' },
      { label: 'Total Leads', value: insights.summary.totalLeads, icon: <Users className="h-5 w-5" />, color: 'text-green-500' },
      { label: 'Total Campaigns', value: insights.summary.totalCampaigns, icon: <Target className="h-5 w-5" />, color: 'text-amber-500' },
      { label: 'Total Agents', value: insights.summary.totalAgents, icon: <Zap className="h-5 w-5" />, color: 'text-teal-500' },
    ]
  }, [insights])

  if (isPending) {
    return <AnalyticsSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-amber-500/60" />
        <p className="text-lg font-medium">{error?.message || 'Failed to load insights'}</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    )
  }

  if (!insights) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <BarChart3 className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold">No insights available yet</h2>
        <p className="text-muted-foreground text-sm max-w-md">Start making calls to see analytics and insights here.</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    )
  }

  const allInsights = [...(insights.insights || []), ...(aiInsights?.insights || [])]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Executive Insights</h1>
          <p className="text-muted-foreground mt-1 text-sm">Real-time AI-powered intelligence across your entire digital workforce.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} loading={isRefetching}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(card => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{card.label}</span>
                <span className={card.color}>{card.icon}</span>
              </div>
              <p className="text-3xl font-bold">{card.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>Hourly Trends</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {insights.hourlyTrends && insights.hourlyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={insights.hourlyTrends}>
                    <XAxis dataKey="hour" tickFormatter={h => `${h}:00`} />
                    <YAxis />
                    <Tooltip labelFormatter={h => `${h}:00`} formatter={(value: number) => [value, 'Calls']} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                  No hourly trend data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {insights.bestCallTime && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Best Call Time</span>
                </div>
                <p className="text-2xl font-bold">{insights.bestCallTime.hour}:00</p>
                <p className="text-xs text-muted-foreground mt-1">{insights.bestCallTime.count} successful calls</p>
              </CardContent>
            </Card>
          )}

          {insights.topCampaign && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-muted-foreground">Top Campaign</span>
                </div>
                <p className="text-lg font-bold truncate">{insights.topCampaign.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{insights.topCampaign.count} calls</p>
              </CardContent>
            </Card>
          )}

          {insights.topAgent && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-teal-500" />
                  <span className="text-sm text-muted-foreground">Top Agent</span>
                </div>
                <p className="text-lg font-bold truncate">{insights.topAgent.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{insights.topAgent.count} calls</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {allInsights.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <CardTitle>AI Insights</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allInsights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="mt-0.5 text-primary/60">{getInsightIcon(insight)}</div>
                  <p className="text-sm">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
