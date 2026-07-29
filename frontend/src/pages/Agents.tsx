import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAgents } from '@/hooks/useQueries'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import {
  Plus, Edit, Trash2, Copy, Play, Bot, Search,
  MessageSquare, Phone, Clock, Users
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Agent } from '@/types'
import { GridSkeleton } from '@/components/ui/PageSkeleton'

type AgentForm = {
  name: string
  type: string
  language: string
  voice_type: string
  description: string
  system_prompt: string
}

const emptyForm: AgentForm = {
  name: '', type: 'outbound', language: 'te', voice_type: 'default',
  description: '', system_prompt: '',
}

const typeOptions = [
  { value: 'outbound', label: 'Outbound' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'qa', label: 'QA' },
]

const languageOptions = [
  { value: 'te', label: 'Telugu' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
]

export function Agents() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editAgent, setEditAgent] = useState<Agent | null>(null)
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null)
  const [testAgent, setTestAgent] = useState<Agent | null>(null)
  const [testInput, setTestInput] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [form, setForm] = useState<AgentForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [cloning, setCloning] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: agents = [], isPending, isError, error } = useAgents()

  const filtered = useMemo(() => {
    if (!search) return agents
    const q = search.toLowerCase()
    return agents.filter(a => a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q))
  }, [agents, search])

  const handleCreate = async () => {
    setSaving(true)
    try {
      await api.post('/agents', form)
      qc.invalidateQueries({ queryKey: ['agents'] })
      toast.success('Agent created')
      setCreateOpen(false)
      setForm(emptyForm)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create agent')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editAgent) return
    setSaving(true)
    try {
      await api.patch(`/agents/${editAgent.id}`, form)
      qc.invalidateQueries({ queryKey: ['agents'] })
      toast.success('Agent updated')
      setEditAgent(null)
      setForm(emptyForm)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update agent')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteAgentId) return
    try {
      await api.delete(`/agents/${deleteAgentId}`)
      qc.invalidateQueries({ queryKey: ['agents'] })
      toast.success('Agent deleted')
      setDeleteAgentId(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete agent')
    }
  }

  const handleClone = async (agent: Agent) => {
    setCloning(agent.id)
    try {
      await api.post(`/agents/${agent.id}/clone`, {})
      qc.invalidateQueries({ queryKey: ['agents'] })
      toast.success('Agent cloned')
    } catch (err: any) {
      toast.error(err.message || 'Failed to clone agent')
    } finally {
      setCloning(null)
    }
  }

  const handleTest = async () => {
    if (!testAgent || !testInput.trim()) return
    setTestLoading(true)
    setTestResponse('')
    try {
      const res = await api.post<{ response: string }>(`/agents/${testAgent.id}/test`, { input: testInput })
      setTestResponse(res.data?.response || 'No response')
    } catch (err: any) {
      setTestResponse(err.message || 'Test failed')
    } finally {
      setTestLoading(false)
    }
  }

  const openEdit = (agent: Agent) => {
    setEditAgent(agent)
    setForm({
      name: agent.name,
      type: agent.type,
      language: agent.language,
      voice_type: agent.voice_type,
      description: '',
      system_prompt: agent.system_prompt || '',
    })
  }

  const openCreate = () => {
    setForm(emptyForm)
    setCreateOpen(true)
  }

  if (isPending) {
    return <GridSkeleton cards={6} />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-lg text-destructive">{error?.message || 'Failed to load agents'}</p>
        <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ['agents'] })}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Digital Roles</h1>
          <p className="text-muted-foreground mt-1">Configure and manage autonomous digital employee roles for your business workforce.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Create Digital Role
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search agents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bot className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">No agents found</p>
            <p className="text-sm mt-1">
              {search ? 'Try a different search' : 'Create your first AI agent to get started'}
            </p>
            {!search && (
              <Button className="mt-6" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Create your first agent
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(agent => {
            const isExpanded = expandedId === agent.id
            return (
              <Card
                key={agent.id}
                className={cn('cursor-pointer', isExpanded && 'md:col-span-2 lg:col-span-3')}
                onClick={() => setExpandedId(isExpanded ? null : agent.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>{agent.name}</CardTitle>
                        <p className="text-sm text-muted-foreground capitalize">{agent.type}</p>
                      </div>
                    </div>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(agent)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" loading={cloning === agent.id} onClick={() => handleClone(agent)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteAgentId(agent.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3 mb-3">
                    <Badge variant="info">{agent.language === 'te' ? 'Telugu' : agent.language === 'hi' ? 'Hindi' : 'English'}</Badge>
                    <Badge variant="default">{agent.voice_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {(agent as any).description || 'No description'}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{(agent as any).total_calls || 0} calls</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{(agent as any).success_rate || 0}% success</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{(agent as any).interested_leads || 0} interested</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{(agent as any).avg_duration || '0s'} avg</span>
                    </div>
                  </div>
                  {isExpanded && agent.system_prompt && (
                    <div className="mt-4 p-3 rounded-lg bg-muted">
                      <p className="text-xs font-medium mb-1">System Prompt</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{agent.system_prompt}</p>
                    </div>
                  )}
                  {isExpanded && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setTestAgent(agent); setTestInput(''); setTestResponse('') }}
                      >
                        <Play className="mr-2 h-4 w-4" /> Test Agent
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Create Agent">
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Select label="Type" options={typeOptions} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
          <Select label="Language" options={languageOptions} value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} />
          <Input label="Voice Type" value={form.voice_type} onChange={e => setForm(f => ({ ...f, voice_type: e.target.value }))} />
          <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="space-y-1">
            <label className="text-sm font-medium">System Prompt</label>
            <textarea
              className="flex min-h-[120px] w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
              value={form.system_prompt}
              onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
              placeholder="Instructions for the AI agent..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleCreate}>Create</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!editAgent} onClose={() => { setEditAgent(null); setForm(emptyForm) }} title="Edit Agent">
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Select label="Type" options={typeOptions} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
          <Select label="Language" options={languageOptions} value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} />
          <Input label="Voice Type" value={form.voice_type} onChange={e => setForm(f => ({ ...f, voice_type: e.target.value }))} />
          <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="space-y-1">
            <label className="text-sm font-medium">System Prompt</label>
            <textarea
              className="flex min-h-[120px] w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
              value={form.system_prompt}
              onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setEditAgent(null); setForm(emptyForm) }}>Cancel</Button>
            <Button loading={saving} onClick={handleUpdate}>Save</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!deleteAgentId} onClose={() => setDeleteAgentId(null)} title="Delete Agent">
        <p className="text-muted-foreground mb-6">Are you sure you want to delete this agent? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteAgentId(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </Dialog>

      <Dialog open={!!testAgent} onClose={() => setTestAgent(null)} title={`Test: ${testAgent?.name || ''}`}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Test Input</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              placeholder="Type a test message..."
            />
          </div>
          <Button loading={testLoading} onClick={handleTest}>
            <Play className="mr-2 h-4 w-4" /> Run Test
          </Button>
          {testResponse && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs font-medium mb-1 text-muted-foreground">AI Response</p>
              <p className="text-sm whitespace-pre-wrap">{testResponse}</p>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  )
}
