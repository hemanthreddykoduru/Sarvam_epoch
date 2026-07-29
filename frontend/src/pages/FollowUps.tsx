import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFollowUps, useCreateFollowUp, useUpdateFollowUp, useCampaigns, useContacts } from '@/hooks/useQueries'
import { followUpSchema, type FollowUpFormData } from '@/lib/schemas'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { CalendarClock, Plus, CheckCircle, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { ListSkeleton } from '@/components/ui/PageSkeleton'
import toast from 'react-hot-toast'

const statusFilters = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  completed: 'success',
  pending: 'warning',
  cancelled: 'danger',
}

export function FollowUps() {
  const { data: followUps = [], isLoading } = useFollowUps()
  const { data: campaigns = [] } = useCampaigns()
  const createFollowUp = useCreateFollowUp()
  const updateFollowUp = useUpdateFollowUp()

  const [statusFilter, setStatusFilter] = useState('')
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState('')

  const { data: contacts = [] } = useContacts(selectedCampaign || undefined)

  const filtered = useMemo(() => {
    if (!statusFilter) return followUps
    return followUps.filter(f => f.status === statusFilter)
  }, [followUps, statusFilter])

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FollowUpFormData>({
    resolver: zodResolver(followUpSchema),
  })

  const watchCampaignId = watch('campaign_id')

  const handleCreate = async (data: FollowUpFormData) => {
    await createFollowUp.mutateAsync(data, {
      onSuccess: () => {
        toast.success('Follow-up created')
        setShowNewDialog(false)
        reset()
      },
      onError: (err: any) => toast.error(err.message || 'Failed to create'),
    })
  }

  const handleStatusChange = async (id: string, status: string) => {
    await updateFollowUp.mutateAsync({ id, status }, {
      onSuccess: () => toast.success(`Follow-up ${status}`),
      onError: (err: any) => toast.error(err.message || 'Failed to update'),
    })
  }

  if (isLoading) {
    return <ListSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks & Follow-ups</h1>
          <p className="text-muted-foreground mt-1 text-sm">Automated customer follow-ups and scheduled task execution by AI Employees.</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Follow-up Task
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CalendarClock className="h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">
                {followUps.length === 0 ? 'No follow-ups yet' : 'No follow-ups match your filter'}
              </p>
              <p className="text-sm mt-1">
                {followUps.length === 0 ? 'Create a follow-up to get started.' : 'Try a different filter.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.contact?.name || 'Unknown'}</TableCell>
                    <TableCell className="text-muted-foreground">{f.campaign?.name || '-'}</TableCell>
                    <TableCell>{formatDate(f.scheduled_date)}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadge[f.status] || 'default'}>
                        {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {f.notes || '-'}
                    </TableCell>
                    <TableCell>
                      {f.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusChange(f.id, 'completed')}
                            title="Complete"
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusChange(f.id, 'cancelled')}
                            title="Cancel"
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNewDialog} onClose={() => setShowNewDialog(false)} title="New Follow-up">
        <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
          <Select
            label="Campaign"
            {...register('campaign_id')}
            options={[
              { value: '', label: 'Select campaign...' },
              ...campaigns.map(c => ({ value: c.id, label: c.name })),
            ]}
            error={errors.campaign_id?.message}
            onChange={(e) => {
              register('campaign_id').onChange(e)
              setSelectedCampaign(e.target.value)
            }}
          />
          <Select
            label="Contact"
            {...register('contact_id')}
            options={[
              { value: '', label: 'Select contact...' },
              ...contacts.map(c => ({ value: c.id, label: `${c.name} (${c.phone})` })),
            ]}
            error={errors.contact_id?.message}
            disabled={!watchCampaignId}
          />
          <Input
            label="Scheduled Date"
            type="date"
            {...register('scheduled_date')}
            error={errors.scheduled_date?.message}
          />
          <Input
            label="Notes (optional)"
            {...register('notes')}
            error={errors.notes?.message}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createFollowUp.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
