import { Shield, Users, PhoneCall, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAdminStats } from '@/hooks/useQueries'
import { MetricCardsSkeleton } from '@/components/ui/PageSkeleton'

export function AdminDashboard() {
  const { data: stats, isPending } = useAdminStats()

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Total Campaigns', value: stats?.totalCampaigns ?? 0, icon: BarChart3, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: 'Total Calls', value: stats?.totalCalls ?? 0, icon: PhoneCall, color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Platform overview and management</p>
        </div>
        <Badge variant="danger" className="ml-auto">Admin</Badge>
      </div>

      {isPending ? (
        <MetricCardsSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.label}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`rounded-lg p-3 ${card.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-bold">{card.value}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
