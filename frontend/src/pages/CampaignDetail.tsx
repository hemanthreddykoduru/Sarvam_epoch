import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useCampaign, useContacts, useCampaignCalls,
  useUpdateCampaign, useUpdateCampaignStatus, useDeleteCampaign, useImportContacts, useDeleteContacts
} from '@/hooks/useQueries'
import { campaignUpdateSchema, type CampaignUpdateFormData } from '@/lib/schemas'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { CallSimulation } from '@/components/CallSimulation'
import {
  ArrowLeft, Loader2, Upload, Download, Phone, Settings, Users,
  Play, Pause, CheckCircle, Trash2, PhoneCall
} from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { DetailSkeleton } from '@/components/ui/PageSkeleton'

type Tab = 'contacts' | 'calls' | 'settings'

const contactStatusBadge = (status: string) => {
  const map: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
    pending: { variant: 'default', label: 'Pending' },
    calling: { variant: 'warning', label: 'Calling' },
    connected: { variant: 'info', label: 'Connected' },
    completed: { variant: 'success', label: 'Completed' },
    failed: { variant: 'danger', label: 'Failed' },
    invalid: { variant: 'danger', label: 'Invalid' },
  }
  return map[status] || { variant: 'default', label: status }
}

const callStatusBadge = (status: string) => {
  const map: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
    completed: { variant: 'success', label: 'Completed' },
    'in-progress': { variant: 'warning', label: 'In Progress' },
    ringing: { variant: 'info', label: 'Ringing' },
    failed: { variant: 'danger', label: 'Failed' },
    busy: { variant: 'danger', label: 'Busy' },
    'no-answer': { variant: 'default', label: 'No Answer' },
  }
  return map[status] || { variant: 'default', label: status }
}

const campaignStatusActions = (status: string) => {
  switch (status) {
    case 'draft':
    case 'paused':
      return { label: 'Start Campaign', icon: Play, nextStatus: 'running', variant: 'primary' as const }
    case 'running':
      return { label: 'Pause', icon: Pause, nextStatus: 'paused', variant: 'secondary' as const }
    default:
      return null
  }
}

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<Tab>('contacts')
  const [parsedContacts, setParsedContacts] = useState<{ name: string; phone: string }[]>([])
  const [uploadLoading, setUploadLoading] = useState(false)

  const [statusAction, setStatusAction] = useState<{ status: string; label: string } | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Call simulation
  const [simulatingContact, setSimulatingContact] = useState<{
    id: string; name: string; phone: string;
  } | null>(null)

  const { data: campaign, isPending: campaignPending } = useCampaign(id)
  const { data: contacts = [], isPending: contactsPending } = useContacts(id)
  const { data: calls = [], isPending: callsPending } = useCampaignCalls(id)

  const updateCampaign = useUpdateCampaign()
  const updateStatus = useUpdateCampaignStatus()
  const deleteCampaign = useDeleteCampaign()
  const importContacts = useImportContacts()
  const deleteContacts = useDeleteContacts()

  const { register, handleSubmit, formState: { errors } } = useForm<CampaignUpdateFormData>({
    resolver: zodResolver(campaignUpdateSchema),
    values: {
      name: campaign?.name || '',
      description: campaign?.description || '',
    },
  })

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadLoading(true)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = evt.target?.result
      if (!data) { setUploadLoading(false); return }

      try {
        if (file.name.endsWith('.csv')) {
          const result = Papa.parse<Record<string, string>>(data as string, { header: true, skipEmptyLines: true })
          const rows = result.data.map(r => ({
            name: String(r.name || r.Name || ''),
            phone: String(r.phone || r.Phone || ''),
          })).filter(r => r.name && r.phone)
          setParsedContacts(rows)
        } else {
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet)
          const rows = json.map(r => ({
            name: String(r.name || r.Name || ''),
            phone: String(r.phone || r.Phone || ''),
          })).filter(r => r.name && r.phone)
          setParsedContacts(rows)
        }
      } catch {
        setParsedContacts([])
      }
      setUploadLoading(false)
    }

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file)
    } else {
      reader.readAsBinaryString(file)
    }
  }

  const handleImport = () => {
    if (!id || parsedContacts.length === 0) return
    importContacts.mutate({ campaignId: id, contacts: parsedContacts }, {
      onSuccess: () => {
        toast.success(`${parsedContacts.length} contacts imported`)
        setParsedContacts([])
        if (fileInputRef.current) fileInputRef.current.value = ''
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to import contacts')
      },
    })
  }

  const handleStatusAction = () => {
    if (!id || !statusAction) return
    updateStatus.mutate({ id, status: statusAction.status }, {
      onSuccess: () => {
        toast.success(`Campaign ${statusAction.status === 'running' ? 'started' : statusAction.status === 'paused' ? 'paused' : 'completed'}`)
        setStatusAction(null)
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to update status')
        setStatusAction(null)
      },
    })
  }

  const onSaveSettings = (data: CampaignUpdateFormData) => {
    if (!id) return
    updateCampaign.mutate({ id, ...data }, {
      onSuccess: () => toast.success('Campaign updated'),
      onError: (err) => toast.error(err.message || 'Failed to update campaign'),
    })
  }

  const handleDelete = () => {
    if (!id) return
    deleteCampaign.mutate(id, {
      onSuccess: () => { toast.success('Campaign deleted'); navigate('/campaigns') },
      onError: (err) => toast.error(err.message || 'Failed to delete campaign'),
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)))
    }
  }

  const toggleSelect = (contactId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(contactId)) next.delete(contactId)
      else next.add(contactId)
      return next
    })
  }

  const handleBulkDelete = () => {
    if (!id || selectedIds.size === 0) return
    deleteContacts.mutate({ campaignId: id, contactIds: Array.from(selectedIds) }, {
      onSuccess: () => { toast.success(`${selectedIds.size} contacts deleted`); setSelectedIds(new Set()) },
      onError: (err) => toast.error(err.message || 'Failed to delete contacts'),
    })
  }

  const getToken = async (): Promise<string> => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/gemini/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('insforge_access_token')}`,
      },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data.data.name
  }

  if (campaignPending) {
    return <DetailSkeleton />
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <p className="text-lg">Campaign not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/campaigns')}>
          Back to Campaigns
        </Button>
      </div>
    )
  }

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: 'contacts', label: 'Contacts', icon: Users },
    { key: 'calls', label: 'Calls', icon: Phone },
    { key: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Campaigns
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-muted-foreground mt-1">{campaign.description}</p>
          )}
        </div>
        <Badge variant={campaign.status === 'running' ? 'success' : campaign.status === 'paused' ? 'warning' : campaign.status === 'completed' ? 'info' : 'default'}>
          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Contacts', value: campaign.total_contacts },
          { label: 'Called', value: campaign.called_count },
          { label: 'Connected', value: campaign.connected_count },
          { label: 'Interested', value: campaign.interested_count },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex border-b">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'contacts' && (
        <div className="space-y-6">
          {parsedContacts.length > 0 ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Preview Contacts</CardTitle>
                  <CardDescription>{parsedContacts.length} contacts found</CardDescription>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setParsedContacts([]); if (fileInputRef.current) fileInputRef.current.value = '' }}>
                    Cancel
                  </Button>
                  <Button loading={importContacts.isPending} onClick={handleImport}>
                    <Download className="mr-2 h-4 w-4" /> Import {parsedContacts.length} Contacts
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedContacts.slice(0, 50).map((c, i) => (
                      <TableRow key={i}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>{c.phone}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedContacts.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    Showing first 50 of {parsedContacts.length} contacts
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Contacts</CardTitle>
                <CardDescription>Upload a CSV or Excel file to import contacts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      const csv = 'Name,Phone\nRamesh Kumar,+919876543210\nPriya Sharma,+919876543211\nSuresh Reddy,+919876543212\nLakshmi Devi,+919876543213\nVenkat Rao,+919876543214'
                      const blob = new Blob([csv], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'sample_contacts.csv'
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download sample CSV
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {uploadLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload CSV or Excel</p>
                      <p className="text-xs text-muted-foreground mt-1">Files should have Name and Phone columns</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {contacts.length > 0 && (
            <Card>
              <CardContent className="p-0">
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/50">
                    <span className="text-sm font-medium">{selectedIds.size} selected</span>
                    <Button variant="destructive" size="sm" loading={deleteContacts.isPending} onClick={handleBulkDelete}>
                      <Trash2 className="mr-1 h-3 w-3" /> Delete Selected
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                      Clear
                    </Button>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === contacts.length && contacts.length > 0}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Last Called</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map(contact => {
                      const badge = contactStatusBadge(contact.status)
                      return (
                        <TableRow key={contact.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(contact.id)}
                              onChange={() => toggleSelect(contact.id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{contact.name}</TableCell>
                          <TableCell>{String(contact.phone)}</TableCell>
                          <TableCell>
                            <Badge variant={badge.variant as any}>{badge.label}</Badge>
                          </TableCell>
                          <TableCell>{contact.call_attempts}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {contact.last_called_at ? formatDateTime(contact.last_called_at) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSimulatingContact({
                                id: contact.id,
                                name: contact.name,
                                phone: contact.phone,
                              })}
                            >
                              <PhoneCall className="h-3 w-3 mr-1" /> Call
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'calls' && (
        <Card>
          <CardContent className="p-0">
            {callsPending ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : calls.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Phone className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No calls made yet</p>
                <p className="text-sm mt-1">Click "Call" on a contact to start a simulation</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map(call => {
                    const badge = callStatusBadge(call.status)
                    const callSecs = call.duration_seconds
                    const duration = callSecs
                      ? `${Math.floor(callSecs / 60)}:${(callSecs % 60).toString().padStart(2, '0')}`
                      : '-'
                    return (
                      <TableRow
                        key={call.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/calls/${call.id}`)}
                      >
                        <TableCell className="font-medium">{call.contact?.name || 'Unknown'}</TableCell>
                        <TableCell>{call.contact?.phone || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={badge.variant as any}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell>{duration}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {call.created_at ? formatDateTime(call.created_at) : '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>Edit your campaign name and description</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSaveSettings)} className="space-y-4">
                <Input
                  label="Campaign Name"
                  {...register('name')}
                  error={errors.name?.message}
                />
                <div className="space-y-1">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    {...register('description')}
                  />
                  {errors.description?.message && (
                    <p className="text-sm text-destructive">{errors.description.message}</p>
                  )}
                </div>
                <Button type="submit" loading={updateCampaign.isPending}>Save Changes</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Status</CardTitle>
              <CardDescription>Control your campaign lifecycle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {campaign.status !== 'completed' && campaign.status !== 'failed' ? (
                (() => {
                  const action = campaignStatusActions(campaign.status)
                  if (!action) return null
                  const Icon = action.icon
                  return (
                    <Button
                      variant={action.variant}
                      onClick={() => setStatusAction({ status: action.nextStatus, label: action.label })}
                    >
                      <Icon className="mr-2 h-4 w-4" /> {action.label}
                    </Button>
                  )
                })()
              ) : null}
              {campaign.status === 'paused' && (
                <p className="text-xs text-muted-foreground">
                  Campaign is paused. Start it again to resume.
                </p>
              )}
              {(campaign.status === 'running' || campaign.status === 'paused') && (
                <Button
                  variant="outline"
                  onClick={() => setStatusAction({ status: 'completed', label: 'Complete Campaign' })}
                >
                  <CheckCircle className="mr-2 h-4 w-4" /> Complete Campaign
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setShowDelete(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Campaign
              </Button>
            </CardContent>
          </Card>

          <Dialog open={!!statusAction} onClose={() => setStatusAction(null)} title={statusAction?.label || 'Confirm'}>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to {statusAction?.label?.toLowerCase()}?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStatusAction(null)}>Cancel</Button>
              <Button loading={updateStatus.isPending} onClick={handleStatusAction}>Confirm</Button>
            </div>
          </Dialog>

          <Dialog open={showDelete} onClose={() => setShowDelete(false)} title="Delete Campaign">
            <p className="text-muted-foreground mb-6">
              Are you sure? All contacts and call data will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
              <Button variant="destructive" loading={deleteCampaign.isPending} onClick={handleDelete}>Delete</Button>
            </div>
          </Dialog>
        </div>
      )}

      {/* Call Simulation Dialog */}
      <Dialog
        open={!!simulatingContact}
        onClose={() => setSimulatingContact(null)}
        title="Voice Simulation"
      >
        {simulatingContact && (
          <div className="h-[500px]">
            <CallSimulation
              contactId={simulatingContact.id}
              contactName={simulatingContact.name}
              contactPhone={simulatingContact.phone}
              campaignId={id!}
              campaignName={campaign.name}
              apiBaseUrl={import.meta.env.VITE_API_URL}
              authToken={localStorage.getItem('insforge_access_token') || ''}
              onCallEnd={(data) => {
                toast.success(`Call ended. ${data.transcript.length} messages recorded.`)
                setSimulatingContact(null)
              }}
              onClose={() => setSimulatingContact(null)}
            />
          </div>
        )}
      </Dialog>
    </div>
  )
}
