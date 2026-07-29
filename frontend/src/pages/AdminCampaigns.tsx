import { useState, useMemo } from 'react'
import { Shield } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useAdminCampaigns } from '@/hooks/useQueries'
import { formatDate } from '@/lib/utils'
import { TableSkeleton } from '@/components/ui/PageSkeleton'

const campaignStatusBadge = (status: string) => {
  switch (status) {
    case 'active': return 'success'
    case 'paused': return 'warning'
    case 'completed': return 'info'
    case 'cancelled': return 'danger'
    default: return 'default'
  }
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function AdminCampaigns() {
  const { data: campaigns = [], isPending } = useAdminCampaigns()
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    return statusFilter === 'all'
      ? campaigns
      : campaigns.filter(c => c.status === statusFilter)
  }, [campaigns, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">All Campaigns</h1>
      </div>

      {isPending ? (
        <TableSkeleton />
      ) : (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Campaigns</CardTitle>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_OPTIONS}
              className="w-40"
            />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Contacts</TableHead>
                  <TableHead className="text-right">Called</TableHead>
                  <TableHead className="text-right">Connected</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No campaigns found</TableCell>
                  </TableRow>
                ) : filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{(c as any).user_name || (c as any).user_email || '—'}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>
                      <Badge variant={campaignStatusBadge(c.status)}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{c.total_contacts}</TableCell>
                    <TableCell className="text-right">{c.called_count}</TableCell>
                    <TableCell className="text-right">{c.connected_count}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
