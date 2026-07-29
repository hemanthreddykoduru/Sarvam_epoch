import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCampaigns } from '@/hooks/useQueries'
import { formatDate, cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import {
  Search, Plus, Upload, Download, Trash2, Edit, Users,
  ChevronLeft, ChevronRight, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Contact } from '@/types'
import { TableSkeleton } from '@/components/ui/PageSkeleton'

const PAGE_SIZE = 10

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  'new': 'default',
  'contacted': 'info',
  'interested': 'success',
  'follow-up': 'warning',
  'converted': 'success',
  'not-interested': 'danger',
}

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'converted', label: 'Converted' },
  { value: 'not-interested', label: 'Not Interested' },
]

type ContactForm = {
  name: string
  phone: string
  email: string
  campaign_id: string
  status: string
}

const emptyForm: ContactForm = { name: '', phone: '', email: '', campaign_id: '', status: 'new' }

export function Contacts() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null)
  const [bulkAction, setBulkAction] = useState('')
  const [bulkCampaignId, setBulkCampaignId] = useState('')
  const [csvText, setCsvText] = useState('')
  const [importCampaignId, setImportCampaignId] = useState('')
  const [form, setForm] = useState<ContactForm>(emptyForm)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: campaigns = [] } = useCampaigns()

  const { data: contacts = [], isPending, isError, error } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.get<Contact[]>('/contacts'),
    select: (res) => res.data || [],
  })

  const createMutation = useMutation({
    mutationFn: (data: ContactForm) => api.post('/contacts', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); toast.success('Contact created') },
    onError: (err: any) => toast.error(err.message || 'Failed to create contact'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContactForm> }) => api.patch(`/contacts/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); toast.success('Contact updated') },
    onError: (err: any) => toast.error(err.message || 'Failed to update contact'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); toast.success('Contact deleted') },
    onError: (err: any) => toast.error(err.message || 'Failed to delete contact'),
  })

  const importMutation = useMutation({
    mutationFn: ({ campaignId, contacts: c }: { campaignId: string; contacts: { name: string; phone: string }[] }) =>
      api.post(`/contacts/import`, { campaign_id: campaignId, contacts: c }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); toast.success('Contacts imported') },
    onError: (err: any) => toast.error(err.message || 'Failed to import contacts'),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/contacts/bulk-delete', { ids }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); setSelectedIds(new Set()); toast.success('Contacts deleted') },
    onError: (err: any) => toast.error(err.message || 'Failed to delete contacts'),
  })

  const bulkAssignMutation = useMutation({
    mutationFn: ({ ids, campaignId }: { ids: string[]; campaignId: string }) =>
      api.post('/contacts/bulk-assign', { ids, campaign_id: campaignId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); setSelectedIds(new Set()); toast.success('Contacts assigned') },
    onError: (err: any) => toast.error(err.message || 'Failed to assign contacts'),
  })

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      const q = search.toLowerCase()
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q)
      const matchCampaign = campaignFilter === 'all' || c.campaign_id === campaignFilter
      return matchSearch && matchCampaign
    })
  }, [contacts, search, campaignFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const campaignOptions = [
    { value: 'all', label: 'All Campaigns' },
    ...campaigns.map(c => ({ value: c.id, label: c.name })),
  ]

  const allSelected = paginated.length > 0 && paginated.every(c => selectedIds.has(c.id))
  const someSelected = paginated.some(c => selectedIds.has(c.id))

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set([...selectedIds].filter(id => !paginated.find(c => c.id === id))))
    } else {
      const next = new Set(selectedIds)
      paginated.forEach(c => next.add(c.id))
      setSelectedIds(next)
    }
  }

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedIds(next)
  }

  const handleCreate = () => {
    createMutation.mutate(form, {
      onSuccess: () => { setAddDialogOpen(false); setForm(emptyForm) },
    })
  }

  const handleUpdate = () => {
    if (!editContact) return
    updateMutation.mutate({ id: editContact.id, data: form }, {
      onSuccess: () => { setEditContact(null); setForm(emptyForm) },
    })
  }

  const handleDelete = () => {
    if (!deleteContactId) return
    deleteMutation.mutate(deleteContactId, { onSuccess: () => setDeleteContactId(null) })
  }

  const handleImport = () => {
    if (!importCampaignId) { toast.error('Select a campaign'); return }
    if (!csvText.trim()) { toast.error('Paste contact data'); return }
    const lines = csvText.trim().split('\n')
    const contacts: { name: string; phone: string }[] = []
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim())
      if (parts.length >= 2) {
        contacts.push({ name: parts[0], phone: parts[1] })
      }
    }
    if (contacts.length === 0) { toast.error('No valid contacts found'); return }
    importMutation.mutate({ campaignId: importCampaignId, contacts }, {
      onSuccess: () => { setImportDialogOpen(false); setCsvText(''); setImportCampaignId('') },
    })
  }

  const handleExport = () => {
    const csvRows = [['Name', 'Phone', 'Campaign', 'Status', 'Call Attempts', 'Last Called']]
    filtered.forEach(c => {
      const campaign = campaigns.find(ca => ca.id === c.campaign_id)
      csvRows.push([c.name, c.phone, campaign?.name || '', c.status, String(c.call_attempts), c.last_called_at || ''])
    })
    const csv = csvRows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'contacts.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleBulkAction = () => {
    if (selectedIds.size === 0) { toast.error('Select contacts first'); return }
    const ids = [...selectedIds]
    if (bulkAction === 'delete') {
      bulkDeleteMutation.mutate(ids)
    } else if (bulkAction === 'assign') {
      if (!bulkCampaignId) { toast.error('Select a campaign'); return }
      bulkAssignMutation.mutate({ ids, campaignId: bulkCampaignId })
    }
    setBulkAction('')
  }

  const openEdit = (contact: Contact) => {
    setEditContact(contact)
    setForm({
      name: contact.name,
      phone: contact.phone,
      email: (contact as any).email || '',
      campaign_id: contact.campaign_id,
      status: contact.status,
    })
  }

  const openAdd = () => {
    setForm(emptyForm)
    setAddDialogOpen(true)
  }

  if (isPending) {
    return <TableSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-lg text-destructive">{error?.message || 'Failed to load contacts'}</p>
        <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ['contacts'] })}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers & Leads</h1>
          <p className="text-muted-foreground mt-1">Manage customer profiles, lead timelines, and digital employee assignments.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Contact
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-56">
          <Select
            options={campaignOptions}
            value={campaignFilter}
            onChange={e => { setCampaignFilter(e.target.value); setPage(0) }}
          />
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Select
            options={[
              { value: '', label: 'Bulk Actions...' },
              { value: 'delete', label: 'Delete Selected' },
              { value: 'assign', label: 'Assign to Campaign' },
            ]}
            value={bulkAction}
            onChange={e => setBulkAction(e.target.value)}
            className="w-48"
          />
          {bulkAction === 'assign' && (
            <Select
              options={campaigns.map(c => ({ value: c.id, label: c.name }))}
              value={bulkCampaignId}
              onChange={e => setBulkCampaignId(e.target.value)}
              className="w-48"
            />
          )}
          <Button size="sm" onClick={handleBulkAction}>Apply</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">No contacts found</p>
            <p className="text-sm mt-1">
              {search || campaignFilter !== 'all' ? 'Try adjusting your filters' : 'Add contacts to get started'}
            </p>
            {!search && campaignFilter === 'all' && (
              <Button className="mt-6" onClick={openAdd}>
                <Plus className="mr-2 h-4 w-4" /> Add your first contact
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={allSelected}
                      onChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Call Attempts</TableHead>
                  <TableHead>Last Called</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(contact => (
                  <TableRow key={contact.id} className={cn(selectedIds.has(contact.id) && 'bg-muted/50')}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={selectedIds.has(contact.id)}
                        onChange={() => toggleOne(contact.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>{contact.phone}</TableCell>
                    <TableCell className="text-muted-foreground">{(contact as any).email || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {campaigns.find(c => c.id === contact.campaign_id)?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant[contact.status] || 'default'}>
                        {contact.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{contact.call_attempts}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.last_called_at ? formatDate(contact.last_called_at) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(contact)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteContactId(contact.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              variant={i === page ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setPage(i)}
            >
              {i + 1}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} title="Add Contact">
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Select
            label="Campaign"
            options={campaigns.map(c => ({ value: c.id, label: c.name }))}
            value={form.campaign_id}
            onChange={e => setForm(f => ({ ...f, campaign_id: e.target.value }))}
          />
          <Select
            label="Status"
            options={statusOptions}
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={handleCreate}>Create</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!editContact} onClose={() => { setEditContact(null); setForm(emptyForm) }} title="Edit Contact">
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Select
            label="Status"
            options={statusOptions}
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setEditContact(null); setForm(emptyForm) }}>Cancel</Button>
            <Button loading={updateMutation.isPending} onClick={handleUpdate}>Save</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!deleteContactId} onClose={() => setDeleteContactId(null)} title="Delete Contact">
        <p className="text-muted-foreground mb-6">Are you sure you want to delete this contact?</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteContactId(null)}>Cancel</Button>
          <Button variant="destructive" loading={deleteMutation.isPending} onClick={handleDelete}>Delete</Button>
        </div>
      </Dialog>

      <Dialog open={importDialogOpen} onClose={() => { setImportDialogOpen(false); setCsvText(''); setImportCampaignId('') }} title="Import Contacts">
        <div className="space-y-4">
          <Select
            label="Target Campaign"
            options={campaigns.map(c => ({ value: c.id, label: c.name }))}
            value={importCampaignId}
            onChange={e => setImportCampaignId(e.target.value)}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium">CSV Data</label>
            <textarea
              className="flex min-h-[120px] w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
              placeholder="Name,Phone&#10;John Doe,+1234567890&#10;Jane Smith,+9876543210"
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">One contact per line: name,phone</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setCsvText(''); setImportCampaignId('') }}>Cancel</Button>
            <Button loading={importMutation.isPending} onClick={handleImport}>Import</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
