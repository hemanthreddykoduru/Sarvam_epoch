import { useState } from 'react'
import { Search, Users, AlertCircle, Phone, MessageSquare, CreditCard } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { cn, formatDate } from '@/lib/utils'
import { useLeads, useUpdateLeadStatus } from '@/hooks/useQueries'
import toast from 'react-hot-toast'
import { TableSkeleton } from '@/components/ui/PageSkeleton'

const statusFilters = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'converted', label: 'Converted' },
  { value: 'not-interested', label: 'Not Interested' },
]

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  'new': 'default',
  'contacted': 'info',
  'interested': 'success',
  'follow-up': 'warning',
  'converted': 'success',
  'not-interested': 'danger',
}

const statusOptions = [
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'converted', label: 'Converted' },
  { value: 'not-interested', label: 'Not Interested' },
]

export function CRM() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: leads = [], isPending, isError, error, refetch } = useLeads({
    status: statusFilter || undefined,
    search: undefined,
  })

  const updateStatusMutation = useUpdateLeadStatus()

  const handleStatusUpdate = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status }, {
      onSuccess: () => {
        toast.success('Status updated')
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to update status')
      },
    })
  }

  const filteredLeads = leads.filter(lead => {
    if (!search) return true
    const q = search.toLowerCase()
    return lead.name.toLowerCase().includes(q) || lead.phone.includes(q)
  })

  if (isPending && leads.length === 0) {
    return <TableSkeleton />
  }

  if (isError && leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">{error?.message || 'Failed to load leads'}</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Employee CRM & Omnichannel Timeline</h1>
          <p className="text-muted-foreground mt-1 text-sm">Unified customer timeline integrating Voice Calls, WhatsApp follow-ups, Payments, Appointments & AI Summaries.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              statusFilter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredLeads.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No leads found"
              description="Leads will appear here once campaigns start calling contacts."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Assigned AI Employee</TableHead>
                  <TableHead>Omnichannel Timeline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Interaction</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map(lead => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell className="text-muted-foreground font-medium">
                      {lead.campaign_id ? 'Sales Executive AI' : 'Receptionist AI'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-semibold"><Phone className="h-3 w-3" /> Voice</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold"><MessageSquare className="h-3 w-3" /> WhatsApp</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 font-semibold"><CreditCard className="h-3 w-3" /> Payment Link</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant[lead.status] || 'default'}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.last_called_at ? formatDate(lead.last_called_at) : 'Just now'}
                    </TableCell>
                    <TableCell>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleStatusUpdate(lead.id, e.target.value)
                        }}
                        className="h-8 rounded-md border border-input bg-background text-foreground px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Quick update...</option>
                        {statusOptions.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
