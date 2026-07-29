import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useKnowledgeBase, useCreateKnowledge, useUploadKnowledgeFile, useDeleteKnowledge, useAgents } from '@/hooks/useQueries'
import { Search, Plus, FileText, Link, Download, Trash2, File, Loader2, AlertCircle, BookOpen } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import { api } from '@/lib/api'
import { GridSkeleton } from '@/components/ui/PageSkeleton'

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'file', label: 'Files' },
  { value: 'url', label: 'URLs' },
]

export function KnowledgeBase() {
  const { data: items = [], isPending, isError, error } = useKnowledgeBase()
  const { data: agents = [] } = useAgents()
  const createKnowledge = useCreateKnowledge()
  const uploadFile = useUploadKnowledgeFile()
  const deleteKnowledge = useDeleteKnowledge()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addTab, setAddTab] = useState('file')
  const [uploading, setUploading] = useState(false)
  const [urlName, setUrlName] = useState('')
  const [urlValue, setUrlValue] = useState('')
  const [urlAgentId, setUrlAgentId] = useState('')
  const [fileAgentId, setFileAgentId] = useState('')

  const selected = items.find(i => i.id === selectedId) || null

  const filtered = items.filter(i => {
    if (typeFilter !== 'all' && i.type !== typeFilter) return false
    if (agentFilter !== 'all' && i.agent_id !== agentFilter) return false
    if (search) return i.name.toLowerCase().includes(search.toLowerCase())
    return true
  })

  const agentOptions = [
    { value: 'all', label: 'All Agents' },
    ...agents.map(a => ({ value: a.id, label: a.name })),
  ]

  const assignAgentOptions = [
    { value: '', label: 'No agent' },
    ...agents.map(a => ({ value: a.id, label: a.name })),
  ]

  function resetAddForm() {
    setUrlName('')
    setUrlValue('')
    setUrlAgentId('')
    setFileAgentId('')
    setAddTab('file')
  }

  async function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadFile.mutateAsync({ file, agent_id: fileAgentId || undefined })
      toast.success('File uploaded successfully')
      setAddOpen(false)
      resetAddForm()
    } catch {
      toast.error('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  async function handleAddUrl() {
    if (!urlName.trim() || !urlValue.trim()) {
      toast.error('Name and URL are required')
      return
    }
    try {
      await createKnowledge.mutateAsync({
        name: urlName,
        type: 'url',
        content: urlValue,
        agent_id: urlAgentId || undefined,
      })
      toast.success('URL added successfully')
      setAddOpen(false)
      resetAddForm()
    } catch {
      toast.error('Failed to add URL')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteKnowledge.mutateAsync(id)
      toast.success('Knowledge item deleted')
      if (selectedId === id) setSelectedId(null)
    } catch {
      toast.error('Failed to delete')
    }
  }

  if (isPending) {
    return <GridSkeleton cards={6} />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-amber-500/60" />
        <p className="text-lg font-medium">{error?.message || 'Failed to load knowledge base'}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Knowledge & Employee Training</h1>
          <p className="text-muted-foreground mt-1 text-sm">Upload PDFs, FAQs, pricing, policies, brochures, and menus to train your AI Employees.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Train Employee Memory
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="flex h-10 w-full rounded-lg border border-input bg-background text-foreground pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Search knowledge..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select
              options={typeOptions}
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="flex-1"
            />
            <Select
              options={agentOptions}
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="border rounded-xl divide-y">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No knowledge items found</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add your first item
                </Button>
              </div>
            ) : (
              filtered.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${selectedId === item.id ? 'bg-muted' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{item.name}</span>
                    <Badge variant={item.type === 'file' ? 'info' : 'default'}>{item.type === 'file' ? 'File' : 'URL'}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {item.type === 'file' && item.file_type && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">{item.file_type.toUpperCase()}</Badge>
                    )}
                    {item.agent_id && (
                      <span>Assigned to {agents.find(a => a.id === item.agent_id)?.name || 'Unknown'}</span>
                    )}
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <Card>
              <CardHeader>
                <CardTitle>{selected.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant={selected.type === 'file' ? 'info' : 'default'}>
                    {selected.type === 'file' ? 'File' : 'URL'}
                  </Badge>
                  {selected.type === 'file' && selected.file_type && (
                    <Badge variant="default" className="text-xs">{selected.file_type.toUpperCase()}</Badge>
                  )}
                </div>

                {selected.type === 'file' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <File className="h-8 w-8 text-primary/60" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selected.name}</p>
                        {selected.content && (
                          <p className="text-xs text-muted-foreground">{selected.content.length} chars</p>
                        )}
                      </div>
                      {selected.file_url && (
                        <a href={selected.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </a>
                      )}
                    </div>
                    {selected.content && (
                      <div className="p-3 rounded-lg bg-muted/20">
                        <p className="text-xs font-medium mb-2 text-muted-foreground">Content preview:</p>
                        <p className="text-sm line-clamp-6">
                          {selected.content.substring(0, 500)}
                          {selected.content.length > 500 ? '...' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                      <Link className="h-4 w-4 text-primary/60" />
                      <a href={selected.content} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate">
                        {selected.content}
                      </a>
                    </div>
                    {selected.content && (
                      <div className="p-3 rounded-lg bg-muted/20">
                        <p className="text-xs font-medium mb-2 text-muted-foreground">Content preview:</p>
                        <p className="text-sm line-clamp-6">
                          {selected.content.substring(0, 500)}
                          {selected.content.length > 500 ? '...' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selected.agent_id && (
                  <div className="p-3 rounded-lg bg-muted/20">
                    <span className="text-xs text-muted-foreground">Assigned to: </span>
                    <span className="text-sm font-medium">{agents.find(a => a.id === selected.agent_id)?.name || 'Unknown'}</span>
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t">
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(selected.id)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center border rounded-xl">
              <FileText className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Select a knowledge item to preview</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={addOpen} onClose={() => { setAddOpen(false); resetAddForm() }} title="Add Knowledge">
        <TabsRoot defaultValue="file" value={addTab} onValueChange={setAddTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="file" className="flex-1">Upload File</TabsTrigger>
            <TabsTrigger value="url" className="flex-1">Add URL</TabsTrigger>
          </TabsList>
          <TabsContent value="file">
            <div className="space-y-4">
              <Select
                label="Assign to Agent (optional)"
                options={assignAgentOptions}
                value={fileAgentId}
                onChange={e => setFileAgentId(e.target.value)}
              />
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleUploadFile}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload a file</p>
                      <p className="text-xs text-muted-foreground">PDF, DOCX, or TXT</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="url">
            <div className="space-y-4">
              <Input label="Name" value={urlName} onChange={e => setUrlName(e.target.value)} placeholder="My reference URL" />
              <Input label="URL" value={urlValue} onChange={e => setUrlValue(e.target.value)} placeholder="https://example.com/doc" />
              <Select
                label="Assign to Agent (optional)"
                options={assignAgentOptions}
                value={urlAgentId}
                onChange={e => setUrlAgentId(e.target.value)}
              />
              <Button className="w-full" onClick={handleAddUrl} loading={createKnowledge.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                Add URL
              </Button>
            </div>
          </TabsContent>
        </TabsRoot>
      </Dialog>
    </div>
  )
}
