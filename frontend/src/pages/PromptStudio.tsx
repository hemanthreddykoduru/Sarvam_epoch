import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatDate, formatDateTime, cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import {
  Search, Plus, Save, Play, Trash2, FileText,
  BookOpen, Layers, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Prompt, PromptVersion } from '@/types'
import { GridSkeleton } from '@/components/ui/PageSkeleton'

const categoryOptions = [
  { value: 'outbound', label: 'Outbound' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'custom', label: 'Custom' },
]

const categoryBadge: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  outbound: 'info',
  inbound: 'success',
  qualification: 'warning',
  'follow-up': 'default',
  custom: 'danger',
}

export function PromptStudio() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('outbound')
  const [content, setContent] = useState('')
  const [isTemplate, setIsTemplate] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<number>(0)
  const [testOpen, setTestOpen] = useState(false)
  const [testInput, setTestInput] = useState('')
  const [testOutput, setTestOutput] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: prompts = [], isPending } = useQuery({
    queryKey: ['prompts'],
    queryFn: () => api.get<Prompt[]>('/prompts'),
    select: (res) => res.data || [],
  })

  const { data: versions = [] } = useQuery({
    queryKey: ['prompts', selectedId, 'versions'],
    queryFn: () => api.get<PromptVersion[]>(`/prompts/${selectedId}/versions`),
    enabled: !!selectedId,
    select: (res) => res.data || [],
  })

  useEffect(() => {
    if (selectedId) {
      const p = prompts.find(p => p.id === selectedId)
      if (p) {
        setName(p.name)
        setCategory(p.category)
        setContent(p.content)
        setIsTemplate(p.is_template)
        setSelectedVersion(p.version)
      }
    }
  }, [selectedId, prompts])

  const grouped = useMemo(() => {
    const filtered = prompts.filter(p => {
      if (showTemplates) return p.is_template
      return !p.is_template
    })
    const q = search.toLowerCase()
    const searched = q ? filtered.filter(p => p.name.toLowerCase().includes(q)) : filtered
    const groups: Record<string, Prompt[]> = {}
    for (const p of searched) {
      const cat = p.category || 'custom'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(p)
    }
    return groups
  }, [prompts, search, showTemplates])

  const selectedPrompt = selectedId ? prompts.find(p => p.id === selectedId) : null

  const versionOptions = versions.map(v => ({
    value: String(v.version),
    label: `v${v.version} — ${formatDateTime(v.created_at)}`,
  }))

  const handleVersionChange = (ver: string) => {
    const v = versions.find(v => v.version === Number(ver))
    if (v) {
      setContent(v.content)
      setSelectedVersion(v.version)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name is required'); return }
    if (!content.trim()) { toast.error('Content is required'); return }
    setSaving(true)
    try {
      if (selectedId) {
        await api.patch(`/prompts/${selectedId}`, { name, content, category, is_template: isTemplate })
        toast.success('Prompt updated')
      } else {
        await api.post('/prompts', { name, content, category, is_template: isTemplate })
        toast.success('Prompt created')
      }
      qc.invalidateQueries({ queryKey: ['prompts'] })
      qc.invalidateQueries({ queryKey: ['prompts', selectedId, 'versions'] })
    } catch (err: any) {
      toast.error(err.message || 'Failed to save prompt')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/prompts/${deleteId}`)
      qc.invalidateQueries({ queryKey: ['prompts'] })
      toast.success('Prompt deleted')
      if (selectedId === deleteId) {
        setSelectedId(null)
        setName('')
        setContent('')
        setCategory('outbound')
        setIsTemplate(false)
      }
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete prompt')
    }
  }

  const handleTest = async () => {
    if (!selectedId || !testInput.trim()) return
    setTestLoading(true)
    setTestOutput('')
    try {
      const res = await api.post<{ response: string }>(`/prompts/${selectedId}/test`, { input: testInput })
      setTestOutput(res.data?.response || 'No response')
    } catch (err: any) {
      setTestOutput(err.message || 'Test failed')
    } finally {
      setTestLoading(false)
    }
  }

  const handleCreateNew = () => {
    setSelectedId(null)
    setName('')
    setContent('')
    setCategory('outbound')
    setIsTemplate(false)
    setSelectedVersion(0)
    setCreateOpen(true)
  }

  const selectPrompt = (p: Prompt) => {
    setSelectedId(p.id)
    setName(p.name)
    setCategory(p.category)
    setContent(p.content)
    setIsTemplate(p.is_template)
    setSelectedVersion(p.version)
    setCreateOpen(false)
  }

  if (isPending) {
    return <GridSkeleton cards={6} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Behaviour</h1>
          <p className="text-muted-foreground mt-1">Configure persona tone, greeting rules, escalation triggers, and conversation guidelines for your AI Employees.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showTemplates ? 'primary' : 'outline'}
            onClick={() => setShowTemplates(!showTemplates)}
          >
            <BookOpen className="mr-2 h-4 w-4" /> Templates
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" /> New Prompt
          </Button>
        </div>
      </div>

      <div className="flex gap-6 min-h-[70vh]">
        <div className="w-80 shrink-0 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search prompts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[65vh] pr-2">
            {Object.entries(grouped).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No prompts found</p>
            ) : (
              Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 px-1">{cat}</h3>
                  <div className="space-y-1">
                    {items.map(p => (
                      <button
                        key={p.id}
                        onClick={() => selectPrompt(p)}
                        className={cn(
                          'w-full text-left p-3 rounded-lg text-sm transition-colors',
                          selectedId === p.id
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted text-foreground'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium truncate">{p.name}</span>
                          <Badge variant={categoryBadge[p.category] || 'default'} className="shrink-0 ml-2">
                            {p.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Layers className="h-3 w-3" />
                          <span>v{p.version}</span>
                          <Clock className="h-3 w-3 ml-1" />
                          <span>{formatDate(p.updated_at)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1">
          {selectedPrompt || createOpen ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {createOpen ? 'New Prompt' : `Edit: ${selectedPrompt?.name || ''}`}
                  </h2>
                  {selectedPrompt && (
                    <div className="flex gap-2">
                      <Badge variant={categoryBadge[selectedPrompt.category] || 'default'}>
                        {selectedPrompt.category}
                      </Badge>
                      <Badge>v{selectedPrompt.version}</Badge>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Prompt name"
                  />
                  <Select
                    label="Category"
                    options={categoryOptions}
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  />
                </div>

                {versionOptions.length > 0 && (
                  <Select
                    label="Version History"
                    options={versionOptions}
                    value={String(selectedVersion)}
                    onChange={e => handleVersionChange(e.target.value)}
                  />
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium">Prompt Content</label>
                  <textarea
                    className="flex min-h-[250px] w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm font-mono leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Write your prompt here..."
                  />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isTemplate}
                    onChange={e => setIsTemplate(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Create as template
                </label>

                <div className="flex justify-between">
                  <div className="flex gap-2">
                    <Button loading={saving} onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" /> Save
                    </Button>
                    {selectedPrompt && (
                      <Button
                        variant="outline"
                        onClick={() => { setTestOpen(true); setTestInput(''); setTestOutput('') }}
                      >
                        <Play className="mr-2 h-4 w-4" /> Test with Gemini
                      </Button>
                    )}
                  </div>
                  {selectedPrompt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(selectedPrompt.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-40" />
                <p className="text-lg font-medium">Select a prompt</p>
                <p className="text-sm mt-1">Choose a prompt from the list or create a new one</p>
                <Button className="mt-6" onClick={handleCreateNew}>
                  <Plus className="mr-2 h-4 w-4" /> New Prompt
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Prompt">
        <p className="text-muted-foreground mb-6">Are you sure you want to delete this prompt?</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </Dialog>

      <Dialog open={testOpen} onClose={() => setTestOpen(false)} title={`Test: ${selectedPrompt?.name || ''}`}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Test Input</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              placeholder="Enter test input..."
            />
          </div>
          <Button loading={testLoading} onClick={handleTest}>
            <Play className="mr-2 h-4 w-4" /> Run Test
          </Button>
          {testOutput && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs font-medium mb-1 text-muted-foreground">Gemini Response</p>
              <p className="text-sm whitespace-pre-wrap">{testOutput}</p>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  )
}
