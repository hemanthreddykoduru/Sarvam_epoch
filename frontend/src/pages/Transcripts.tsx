import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCampaigns } from '@/hooks/useQueries'
import { formatDate, formatDateTime, cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import {
  Search, Trash2, MessageSquare, Phone, ChevronDown,
  ChevronRight, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Call } from '@/types'
import { TableSkeleton } from '@/components/ui/PageSkeleton'

export function Transcripts() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: campaigns = [] } = useCampaigns()

  const { data: calls = [], isPending, isError, error } = useQuery({
    queryKey: ['calls', 'transcripts'],
    queryFn: () => api.get<Call[]>('/calls?has_transcript=true'),
    select: (res) => res.data || [],
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/calls/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calls', 'transcripts'] }); toast.success('Transcript deleted') },
    onError: (err: any) => toast.error(err.message || 'Failed to delete transcript'),
  })

  const campaignOptions = [
    { value: 'all', label: 'All Campaigns' },
    ...campaigns.map(c => ({ value: c.id, label: c.name })),
  ]

  const filtered = useMemo(() => {
    return calls.filter(c => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        (c.contact?.name || '').toLowerCase().includes(q) ||
        (c.contact?.phone || '').includes(q)
      const matchCampaign = campaignFilter === 'all' || c.campaign_id === campaignFilter
      return matchSearch && matchCampaign
    })
  }, [calls, search, campaignFilter])

  const messageCount = (call: Call) => {
    if (call.transcript) return call.transcript.length
    if (call.transcripts) return call.transcripts.length
    return 0
  }

  if (isPending) {
    return <TableSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-lg text-destructive">{error?.message || 'Failed to load transcripts'}</p>
        <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ['calls', 'transcripts'] })}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Call Transcripts</h1>
          <p className="text-muted-foreground mt-1">View and analyze call conversations</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by contact name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-56">
          <Select
            options={campaignOptions}
            value={campaignFilter}
            onChange={e => setCampaignFilter(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">No transcripts found</p>
            <p className="text-sm mt-1">
              {search || campaignFilter !== 'all' ? 'Try adjusting your filters' : 'Transcripts will appear here after calls are made'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(call => {
            const isExpanded = expandedId === call.id
            const messages = call.transcript || call.transcripts || []

            return (
              <Card key={call.id}>
                <CardContent className="p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : call.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{call.contact?.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{call.contact?.phone || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="hidden sm:block">
                        {campaigns.find(c => c.id === call.campaign_id)?.name || '-'}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{messageCount(call)} msgs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDate(call.created_at)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => { e.stopPropagation(); setDeleteId(call.id) }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </div>

                  {isExpanded && messages.length > 0 && (
                    <div className="mt-4 space-y-2 border-t pt-4">
                      {messages.map((msg: any, idx: number) => {
                        const role = msg.role || 'customer'
                        const isAI = role === 'ai' || role === 'assistant'
                        const text = msg.text || msg.message || ''
                        const timestamp = msg.timestamp || msg.timestamp_seconds || msg.created_at
                        return (
                          <div key={idx} className={cn('flex gap-3', isAI ? 'justify-start' : 'justify-end')}>
                            <div
                              className={cn(
                                'max-w-[80%] rounded-lg p-3 text-sm',
                                isAI
                                  ? 'bg-primary/10 text-foreground'
                                  : 'bg-muted text-foreground'
                              )}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={isAI ? 'info' : 'default'} className="text-[10px] px-1.5 py-0">
                                  {isAI ? 'AI' : 'Customer'}
                                </Badge>
                                {timestamp && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {typeof timestamp === 'number' ? `${timestamp}s` : formatDateTime(timestamp)}
                                  </span>
                                )}
                              </div>
                              <p className="whitespace-pre-wrap">{text}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {isExpanded && messages.length === 0 && (
                    <div className="mt-4 text-sm text-muted-foreground border-t pt-4">
                      No transcript messages available
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Transcript">
        <p className="text-muted-foreground mb-6">Are you sure you want to delete this transcript?</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="destructive" loading={deleteMutation.isPending} onClick={() => {
            if (deleteId) deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
          }}>Delete</Button>
        </div>
      </Dialog>
    </div>
  )
}
