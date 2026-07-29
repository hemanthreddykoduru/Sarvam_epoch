import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Phone, Clock, AlertCircle, RefreshCw, PhoneOutgoing } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { cn, formatDuration, formatDateTime } from '@/lib/utils'
import { useCalls } from '@/hooks/useQueries'
import toast from 'react-hot-toast'
import { TableSkeleton } from '@/components/ui/PageSkeleton'
import { PlaceCallDialog } from '@/components/calls/PlaceCallDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

const statusFilters = [
  { value: '', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'no-answer', label: 'No-Answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'in-progress', label: 'In-Progress' },
  { value: 'queued', label: 'Queued' },
]

const statusBadgeVariant: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
  completed: 'success',
  failed: 'danger',
  'no-answer': 'warning',
  busy: 'warning',
  'in-progress': 'info',
  queued: 'default',
}

/** created_at is when we synced the row; started_at is when the call actually happened. */
const callTime = (c: any) => c.started_at || c.ended_at || c.created_at

const pageCopy = {
  inbound: {
    title: 'Inbound Calls',
    subtitle: 'Calls customers placed to your AI Employees.',
  },
  outbound: {
    title: 'Outbound Calls',
    subtitle: 'Calls your AI Employees placed to customers.',
  },
  all: {
    title: 'Conversations & Calls',
    subtitle: 'Real-time log of inbound and outbound voice interactions handled by AI Employees.',
  },
}

export function Calls({ direction }: { direction?: 'inbound' | 'outbound' } = {}) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: calls = [], isPending, isError, error, isFetching } = useCalls()
  const [callOpen, setCallOpen] = useState(false)
  const copy = pageCopy[direction || 'all']

  const filteredCalls = useMemo(() => {
    return calls.filter(call => {
      const matchesSearch = !search ||
        (call.contact?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (call.contact?.phone || '').includes(search)
      const matchesStatus = !statusFilter || call.status === statusFilter
      // Legacy rows carry values other than inbound/outbound (older builds wrote 'browser'),
      // so treat anything that isn't explicitly inbound as outbound rather than dropping it.
      const matchesDirection = !direction || (call.direction === 'inbound' ? 'inbound' : 'outbound') === direction
      return matchesSearch && matchesStatus && matchesDirection
    })
    // newest call first — created_at is identical across a synced batch, so it can't order these
    .sort((a, b) => new Date(callTime(b)).getTime() - new Date(callTime(a)).getTime())
  }, [calls, search, statusFilter, direction])

  if (isPending) {
    return <TableSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">{error?.message || 'Failed to load calls'}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        actions={
          <>
            <div className="flex items-center gap-2">
              {direction !== 'inbound' && (
                <Button onClick={() => setCallOpen(true)} className="gap-2">
                  <PhoneOutgoing className="h-4 w-4" /> Place a call
                </Button>
              )}
              <Button variant="outline" className="gap-2 text-primary border-primary/20 bg-primary/5 pointer-events-none">
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                Live Sync Active
              </Button>
            </div>
          </>
        }
      />

      <PlaceCallDialog open={callOpen} onClose={() => setCallOpen(false)} />

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
          {filteredCalls.length === 0 ? (
            <EmptyState
              icon={Phone}
              title={calls.length === 0 ? 'No calls yet' : 'No calls match your filters'}
              description={calls.length === 0
                ? <p className="text-sm text-muted-foreground mt-2 max-w-sm text-center">
                    Waiting for real-time webhooks from Sarvam API. New calls will appear here automatically.
                  </p>
                : 'Try a different search term or clear the status filter.'}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Campaign</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map(call => (
                  <TableRow
                    key={call.id}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    tabIndex={0}
                    role="link"
                    aria-label={`Open call with ${call.contact?.name || 'unknown contact'}`}
                    onClick={() => navigate(`/calls/${call.id}`)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/calls/${call.id}`)
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      {call.contact?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>{call.contact?.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant[call.status] || 'default'}>
                        {call.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDuration(call.duration_seconds)}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(callTime(call))}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {call.campaign?.name || '—'}
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
