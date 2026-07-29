import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Phone, PhoneOff, Download,
  User, Bot, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useCall, useUpdateLeadStatus } from '@/hooks/useQueries'
import { formatDateTime, formatDuration } from '@/lib/utils'
import toast from 'react-hot-toast'
import { DetailSkeleton } from '@/components/ui/PageSkeleton'

export function CallDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: call, isPending, isError, error } = useCall(id)
  const updateStatusMutation = useUpdateLeadStatus()

  const handleStatusChange = (status: string) => {
    if (!call?.contact_id) return
    updateStatusMutation.mutate({ id: call.contact_id, status }, {
      onSuccess: () => toast.success('Lead status updated'),
      onError: (err) => toast.error(err.message || 'Failed to update status'),
    })
  }

  if (isPending) {
    return <DetailSkeleton />
  }

  if (isError || !call) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{error?.message || 'Call not found'}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/calls')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Calls
        </Button>
      </div>
    )
  }

  const transcript: Array<{ role: string; text: string; timestamp?: string }> =
    (call as any).transcript || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/calls')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Call Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{call.contact?.name || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{call.contact?.phone || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PhoneOff className="h-4 w-4" />
                <span>Duration: {formatDuration(call.duration_seconds)}</span>
              </div>
            </CardContent>
          </Card>

          {call.recording_url && (
            <Card>
              <CardHeader>
                <CardTitle>Recording</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <audio controls className="w-full">
                  <source src={call.recording_url} type="audio/wav" />
                </audio>
                <a
                  href={call.recording_url}
                  download
                  className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" /> Download
                </a>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>
                {call.started_at && formatDateTime(call.started_at)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
              {transcript.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bot className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No transcript available</p>
                </div>
              ) : (
                transcript.map((entry, i) => (
                  <div
                    key={i}
                    className={`flex ${entry.role === 'ai' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        entry.role === 'ai'
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {entry.role === 'ai' ? (
                          <Bot className="h-3.5 w-3.5" />
                        ) : (
                          <User className="h-3.5 w-3.5" />
                        )}
                        <span className="text-xs font-medium opacity-70">
                          {entry.role === 'ai' ? 'AI' : 'Customer'}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{entry.text}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!(call as any).ai_summary && !call.interest_level ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No analysis available yet</p>
                </div>
              ) : (
                <>
                  {(call as any).customer_intent && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Customer Intent</p>
                      <p className="text-sm">{(call as any).customer_intent}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {call.interest_level && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Interest Level</p>
                        <Badge variant={
                          call.interest_level === 'high' ? 'success' :
                          call.interest_level === 'medium' ? 'warning' : 'danger'
                        }>
                          {call.interest_level}
                        </Badge>
                      </div>
                    )}
                    {(call as any).sentiment && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Sentiment</p>
                        <Badge variant={
                          (call as any).sentiment === 'positive' ? 'success' :
                          (call as any).sentiment === 'neutral' ? 'info' : 'danger'
                        }>
                          {(call as any).sentiment}
                        </Badge>
                      </div>
                    )}
                    {(call as any).follow_up_required !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Follow-up</p>
                        <Badge variant={(call as any).follow_up_required ? 'warning' : 'default'}>
                          {(call as any).follow_up_required ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {(call as any).key_notes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Key Notes</p>
                      <p className="text-sm">{(call as any).key_notes}</p>
                    </div>
                  )}

                  {(call as any).ai_summary && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">AI Summary</p>
                      <p className="text-sm leading-relaxed">{(call as any).ai_summary}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                label="Update Lead Status"
                options={[
                  { value: 'contacted', label: 'Contacted' },
                  { value: 'interested', label: 'Interested' },
                  { value: 'follow-up', label: 'Follow-up' },
                  { value: 'converted', label: 'Converted' },
                  { value: 'not-interested', label: 'Not Interested' },
                ]}
                value=""
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updateStatusMutation.isPending || !call.contact_id}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
