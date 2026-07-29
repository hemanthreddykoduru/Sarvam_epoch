import {
  Phone, PhoneCall, TrendingUp, Megaphone
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { useAnalyticsOverview, useDailyCalls, useCampaignPerformance } from '@/hooks/useQueries'
import { formatDate } from '@/lib/utils'
import { AnalyticsSkeleton } from '@/components/ui/PageSkeleton'

const PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b']

const statCards = [
  { key: 'totalCalls', label: 'Total Calls', icon: Phone, color: 'text-blue-600 dark:text-blue-400' },
  { key: 'connectedCalls', label: 'Completed', icon: PhoneCall, color: 'text-green-600 dark:text-green-400' },
  { key: 'successRate', label: 'Success Rate', icon: TrendingUp, color: 'text-teal-600 dark:text-teal-400', suffix: '%' },
  { key: 'activeCampaigns', label: 'Active Campaigns', icon: Megaphone, color: 'text-orange-600 dark:text-orange-400' },
]

export function Analytics() {
  const { data: stats, isPending: statsPending } = useAnalyticsOverview()
  const { data: dailyCalls = [], isPending: dailyPending } = useDailyCalls()
  const { data: campaigns = [], isPending: campaignsPending } = useCampaignPerformance()

  if (statsPending || dailyPending || campaignsPending) {
    return <AnalyticsSkeleton />
  }

  const totalCalls = stats?.total_calls || 0
  const connectedCalls = stats?.completed_calls || 0
  const successRate = totalCalls ? Math.round((connectedCalls / totalCalls) * 100) : 0

  const pieData = [
    { name: 'Completed', value: connectedCalls },
    { name: 'Not connected', value: Math.max(totalCalls - connectedCalls, 0) },
  ].filter(d => d.value > 0)

  const statValues: Record<string, string | number> = {
    totalCalls,
    connectedCalls,
    successRate,
    activeCampaigns: stats?.total_campaigns || 0,
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.key}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  <p className="text-3xl font-bold mt-1">
                    {statValues[card.key]}
                    {card.suffix || ''}
                  </p>
                </div>
                <div className={`p-3 rounded-full bg-secondary ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Calls (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyCalls}>
                  <defs>
                    <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => formatDate(d)}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(d) => formatDate(d)}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    fill="url(#totalGradient)"
                    strokeWidth={2}
                    name="Total"
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="#22c55e"
                    fill="url(#completedGradient)"
                    strokeWidth={2}
                    name="Completed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Call Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead>Call Rate</TableHead>
                <TableHead>Connect Rate</TableHead>
                <TableHead>Interest Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No campaign data available
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((camp) => (
                  <TableRow key={camp.id}>
                    <TableCell className="font-medium">{camp.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          camp.status === 'active' ? 'success' :
                          camp.status === 'paused' ? 'warning' :
                          camp.status === 'completed' ? 'info' : 'default'
                        }
                      >
                        {camp.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{camp.total_contacts}</TableCell>
                    <TableCell>{camp.call_rate}%</TableCell>
                    <TableCell>{camp.connect_rate}%</TableCell>
                    <TableCell>{camp.interest_rate}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
