import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCampaigns, useDeleteCampaign } from '@/hooks/useQueries'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Plus, Search, Megaphone, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { GridSkeleton } from '@/components/ui/PageSkeleton'

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const statusBadge = (status: string) => {
  const map: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
    draft: { variant: 'default', label: 'Draft' },
    active: { variant: 'success', label: 'Active' },
    paused: { variant: 'warning', label: 'Paused' },
    completed: { variant: 'info', label: 'Completed' },
    cancelled: { variant: 'danger', label: 'Cancelled' },
  }
  return map[status] || { variant: 'default', label: status }
}

export function Campaigns() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: campaigns = [], isPending } = useCampaigns()
  const deleteMutation = useDeleteCampaign()

  const filtered = useMemo(() => {
    return campaigns.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [campaigns, search, statusFilter])

  const handleDelete = () => {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Campaign deleted')
        setDeleteId(null)
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to delete campaign')
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Digital Employees</h1>
          <p className="text-muted-foreground mt-1">Deploy, monitor, and manage your autonomous multilingual AI workforce.</p>
        </div>
        <Button onClick={() => navigate('/campaigns/new')}>
          <Plus className="mr-2 h-4 w-4" /> Deploy AI Employee
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search employees by role or business function..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {isPending ? (
        <GridSkeleton cards={6} />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Megaphone className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">No digital employees deployed yet</p>
            <p className="text-sm mt-1">
              {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Deploy your first AI Employee to manage customer conversations'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button className="mt-6" onClick={() => navigate('/campaigns/new')}>
                <Plus className="mr-2 h-4 w-4" /> Deploy AI Employee
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(campaign => {
            const badge = statusBadge(campaign.status)
            return (
              <Card
                key={campaign.id}
                className="cursor-pointer hover:border-primary/50 transition-all duration-300 shadow-sm group overflow-hidden"
                onClick={() => navigate(`/campaigns/${campaign.id}`)}
              >
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                          {campaign.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Deployed AI Employee Role</p>
                    </div>
                    <Badge variant={badge.variant as any}>{badge.label}</Badge>
                  </div>

                  {/* Business Performance Metric Breakdown */}
                  <div className="p-3 rounded-xl bg-accent/40 border space-y-2 text-xs">
                    <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Performance</p>
                    <div className="space-y-1 text-foreground/90 font-medium">
                      <p>{campaign.called_count || 0} calls handled</p>
                      <p>{campaign.connected_count || 0} connected</p>
                      <p className="text-muted-foreground font-normal">
                        {campaign.last_call_at
                          ? `Last call ${formatDateTime(campaign.last_call_at)}`
                          : 'No calls yet'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground border-t">
                    <span>{campaign.total_contacts || 0} contacts</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => { e.stopPropagation(); setDeleteId(campaign.id) }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} title="Remove AI Employee">
        <p className="text-muted-foreground mb-6">
          Are you sure you want to remove this AI Employee? This action cannot be undone and will stop all active calls.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="destructive" loading={deleteMutation.isPending} onClick={handleDelete}>
            Remove Employee
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
