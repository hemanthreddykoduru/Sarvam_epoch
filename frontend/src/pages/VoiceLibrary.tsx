import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { useVoiceLibrary, useCreateVoice, useUpdateVoice, useDeleteVoice } from '@/hooks/useQueries'
import { Plus, Play, Edit, Trash2, Volume2, Copy, AlertCircle, Headphones } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import { api } from '@/lib/api'
import { GridSkeleton } from '@/components/ui/PageSkeleton'

const providerOptions = [
  { value: 'all', label: 'All Providers' },
  { value: 'Google', label: 'Google' },
  { value: 'Azure', label: 'Azure' },
  { value: 'AWS', label: 'AWS' },
]

const languageFilterOptions = [
  { value: 'all', label: 'All Languages' },
  { value: 'te', label: 'Telugu' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
]

const languageOptions = [
  { value: 'te', label: 'Telugu (te)' },
  { value: 'en', label: 'English (en)' },
  { value: 'hi', label: 'Hindi (hi)' },
]

const addProviderOptions = [
  { value: 'Google', label: 'Google' },
  { value: 'Azure', label: 'Azure' },
  { value: 'AWS', label: 'AWS' },
]

export function VoiceLibrary() {
  const { data: voices = [], isPending, isError, error } = useVoiceLibrary()
  const createVoice = useCreateVoice()
  const updateVoice = useUpdateVoice()
  const deleteVoice = useDeleteVoice()

  const [providerFilter, setProviderFilter] = useState('all')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [formName, setFormName] = useState('')
  const [formProvider, setFormProvider] = useState('Google')
  const [formVoiceId, setFormVoiceId] = useState('')
  const [formLanguage, setFormLanguage] = useState('te')
  const [formSettings, setFormSettings] = useState('')
  const [formPreviewUrl, setFormPreviewUrl] = useState('')

  const filtered = voices.filter(v => {
    if (providerFilter !== 'all' && v.provider !== providerFilter) return false
    if (languageFilter !== 'all' && v.language !== languageFilter) return false
    return true
  })

  function resetForm() {
    setFormName('')
    setFormProvider('Google')
    setFormVoiceId('')
    setFormLanguage('te')
    setFormSettings('')
    setFormPreviewUrl('')
    setEditId(null)
  }

  function openEdit(voice: typeof voices[0]) {
    setEditId(voice.id)
    setFormName(voice.name)
    setFormProvider(voice.provider)
    setFormVoiceId(voice.voice_id)
    setFormLanguage(voice.language)
    setFormSettings(voice.settings ? JSON.stringify(voice.settings, null, 2) : '')
    setFormPreviewUrl(voice.preview_url || '')
    setAddOpen(true)
  }

  async function handleSave() {
    if (!formName.trim() || !formVoiceId.trim()) {
      toast.error('Name and Voice ID are required')
      return
    }
    let settings: Record<string, any> | undefined
    if (formSettings.trim()) {
      try {
        settings = JSON.parse(formSettings)
      } catch {
        toast.error('Invalid JSON in settings')
        return
      }
    }
    const payload = {
      name: formName,
      provider: formProvider,
      voice_id: formVoiceId,
      language: formLanguage,
      settings,
      preview_url: formPreviewUrl || undefined,
    }

    try {
      if (editId) {
        await updateVoice.mutateAsync({ id: editId, ...payload })
        toast.success('Voice updated')
      } else {
        await createVoice.mutateAsync(payload)
        toast.success('Voice added')
      }
      setAddOpen(false)
      resetForm()
    } catch {
      toast.error(editId ? 'Failed to update voice' : 'Failed to add voice')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteVoice.mutateAsync(id)
      toast.success('Voice deleted')
    } catch {
      toast.error('Failed to delete voice')
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await api.patch(`/voices/${id}`, { is_default: true })
      toast.success('Set as default voice')
    } catch {
      toast.error('Failed to set as default')
    }
  }

  if (isPending) {
    return <GridSkeleton cards={6} />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-amber-500/60" />
        <p className="text-lg font-medium">{error?.message || 'Failed to load voice library'}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Voices</h1>
          <p className="text-muted-foreground mt-1 text-sm">Configure multilingual voices and assign unique voice personas to your digital employees.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Employee Voice
        </Button>
      </div>

      <div className="flex gap-2">
        <Select
          options={providerOptions}
          value={providerFilter}
          onChange={e => setProviderFilter(e.target.value)}
          className="w-40"
        />
        <Select
          options={languageFilterOptions}
          value={languageFilter}
          onChange={e => setLanguageFilter(e.target.value)}
          className="w-40"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center border rounded-xl">
          <Headphones className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No voices found</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => { resetForm(); setAddOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" />
            Add your first voice
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(voice => (
            <Card key={voice.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{voice.name}</CardTitle>
                  {voice.is_default && <Badge variant="success">Default</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 flex-1">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="font-medium">{voice.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Voice ID</span>
                    <span className="font-medium text-xs font-mono">{voice.voice_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Language</span>
                    <Badge variant="info">{voice.language}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="text-xs">{formatDate(voice.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 mt-auto">
                  {voice.preview_url && (
                    <a href={voice.preview_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Play className="h-3.5 w-3.5 mr-1" />
                        Preview
                      </Button>
                    </a>
                  )}
                  {!voice.is_default && (
                    <Button variant="ghost" size="sm" onClick={() => handleSetDefault(voice.id)}>
                      <Volume2 className="h-3.5 w-3.5 mr-1" />
                      Set Default
                    </Button>
                  )}
                  <div className="ml-auto flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(voice)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(voice.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onClose={() => { setAddOpen(false); resetForm() }} title={editId ? 'Edit Voice' : 'Add Voice'}>
        <div className="space-y-4">
          <Input label="Name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="My Voice" />
          <Select
            label="Provider"
            options={addProviderOptions}
            value={formProvider}
            onChange={e => setFormProvider(e.target.value)}
          />
          <Input label="Voice ID" value={formVoiceId} onChange={e => setFormVoiceId(e.target.value)} placeholder="en-US-Wavenet-D" />
          <Select
            label="Language"
            options={languageOptions}
            value={formLanguage}
            onChange={e => setFormLanguage(e.target.value)}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium">Settings (JSON)</label>
            <textarea
              className="flex w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] font-mono"
              value={formSettings}
              onChange={e => setFormSettings(e.target.value)}
              placeholder='{"pace": 1.0}'
            />
          </div>
          <Input label="Preview URL" value={formPreviewUrl} onChange={e => setFormPreviewUrl(e.target.value)} placeholder="https://..." />
          <Button className="w-full" onClick={handleSave} loading={createVoice.isPending || updateVoice.isPending}>
            {editId ? 'Update Voice' : 'Add Voice'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
