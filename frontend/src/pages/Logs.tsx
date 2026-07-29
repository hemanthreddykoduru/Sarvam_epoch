import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { useActivityLogs } from '@/hooks/useQueries'
import { AlertCircle, Activity, ChevronLeft, ChevronRight, Clock, RefreshCw, List } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { TableSkeleton } from '@/components/ui/PageSkeleton'

const actionOptions = [
  { value: '', label: 'All Actions' },
  { value: 'Contact Added', label: 'Contact Added' },
  { value: 'Contact Updated', label: 'Contact Updated' },
  { value: 'Contact Deleted', label: 'Contact Deleted' },
  { value: 'Agent Created', label: 'Agent Created' },
  { value: 'Agent Updated', label: 'Agent Updated' },
  { value: 'Agent Deleted', label: 'Agent Deleted' },
  { value: 'Campaign Created', label: 'Campaign Created' },
  { value: 'Campaign Updated', label: 'Campaign Updated' },
  { value: 'Campaign Deleted', label: 'Campaign Deleted' },
  { value: 'Call Initiated', label: 'Call Initiated' },
  { value: 'Call Completed', label: 'Call Completed' },
  { value: 'Prompt Created', label: 'Prompt Created' },
  { value: 'Prompt Updated', label: 'Prompt Updated' },
  { value: 'Voice Added', label: 'Voice Added' },
  { value: 'Voice Updated', label: 'Voice Updated' },
  { value: 'Knowledge Added', label: 'Knowledge Added' },
  { value: 'Knowledge Deleted', label: 'Knowledge Deleted' },
  { value: 'User Login', label: 'User Login' },
  { value: 'User Logout', label: 'User Logout' },
]

const entityOptions = [
  { value: '', label: 'All Entities' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'agents', label: 'Agents' },
  { value: 'campaigns', label: 'Campaigns' },
  { value: 'calls', label: 'Calls' },
  { value: 'prompts', label: 'Prompts' },
  { value: 'voices', label: 'Voices' },
  { value: 'knowledge', label: 'Knowledge' },
  { value: 'users', label: 'Users' },
]

const actionBadgeVariants: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'default'> = {
  'Contact Added': 'success',
  'Contact Updated': 'info',
  'Contact Deleted': 'danger',
  'Agent Created': 'success',
  'Agent Updated': 'info',
  'Agent Deleted': 'danger',
  'Campaign Created': 'success',
  'Campaign Updated': 'info',
  'Campaign Deleted': 'danger',
  'Call Initiated': 'warning',
  'Call Completed': 'success',
  'Prompt Created': 'success',
  'Prompt Updated': 'info',
  'Voice Added': 'success',
  'Voice Updated': 'info',
  'Knowledge Added': 'success',
  'Knowledge Deleted': 'danger',
  'User Login': 'info',
  'User Logout': 'warning',
}

function getActionVariant(action: string): 'info' | 'success' | 'warning' | 'danger' | 'default' {
  return actionBadgeVariants[action] || 'default'
}

const PAGE_SIZE = 20

export function Logs() {
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  const { data: logs = [], isPending, isError, error } = useActivityLogs({
    action: actionFilter || undefined,
    entity_type: entityFilter || undefined,
    page,
    limit: PAGE_SIZE,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(k => k + 1)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const totalPages = 5

  if (isPending) {
    return <TableSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-amber-500/60" />
        <p className="text-lg font-medium">{error?.message || 'Failed to load logs'}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity Logs</h1>
          <p className="text-muted-foreground mt-1 text-sm">Monitor all activity across the platform.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          Auto-refreshes every 30s
        </div>
      </div>

      <div className="flex gap-2">
        <Select
          options={actionOptions}
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1) }}
          className="w-48"
        />
        <Select
          options={entityOptions}
          value={entityFilter}
          onChange={e => { setEntityFilter(e.target.value); setPage(1) }}
          className="w-40"
        />
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center border rounded-xl">
          <List className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground mt-1">Logs will appear as actions are performed.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {logs.map(log => (
                <div key={log.id} className="px-6 py-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                  <Activity className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getActionVariant(log.action)}>{log.action}</Badge>
                      <Badge variant="default">{log.entity_type}</Badge>
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {JSON.stringify(log.metadata)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(log.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
