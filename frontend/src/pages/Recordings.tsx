import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCampaigns, useAgents } from '@/hooks/useQueries'
import { formatDate, formatDuration, cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Play, Pause, Trash2, Upload, Music, Download, Mic, Clock, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Recording } from '@/types'
import { GridSkeleton } from '@/components/ui/PageSkeleton'

/**
 * Waveform that pulses while audio plays. Bars vary in height and phase so it reads as a
 * waveform rather than a metronome. CSS-driven — no per-frame JS — and still under reduced motion.
 */
const WAVE = [
  { h: 45, d: 0.0 }, { h: 80, d: 0.18 }, { h: 100, d: 0.36 }, { h: 65, d: 0.09 },
  { h: 95, d: 0.27 }, { h: 55, d: 0.45 }, { h: 85, d: 0.12 },
]
function EqualizerBars() {
  return (
    <span className="mr-2 flex h-4 items-center gap-[2px]" aria-hidden="true">
      {WAVE.map((bar, i) => (
        <span
          key={i}
          className="eq-bar w-[2.5px] rounded-full bg-current"
          style={{ height: `${bar.h}%`, animationDelay: `${bar.d}s` }}
        />
      ))}
    </span>
  )
}

export function Recordings() {
  const qc = useQueryClient()
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCampaignId, setUploadCampaignId] = useState('')
  const [uploadAgentId, setUploadAgentId] = useState('')
  const [uploading, setUploading] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: campaigns = [] } = useCampaigns()
  const { data: agents = [] } = useAgents()

  const { data: recordings = [], isPending, isError, error } = useQuery({
    queryKey: ['recordings'],
    queryFn: () => api.get<Recording[]>('/recordings'),
    select: (res) => res.data || [],
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/recordings/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recordings'] }); toast.success('Recording deleted') },
    onError: (err: any) => toast.error(err.message || 'Failed to delete recording'),
  })

  const campaignOptions = [
    { value: 'all', label: 'All Campaigns' },
    ...campaigns.map(c => ({ value: c.id, label: c.name })),
  ]

  const agentOptions = [
    { value: 'all', label: 'All Agents' },
    ...agents.map(a => ({ value: a.id, label: a.name })),
  ]

  const filtered = useMemo(() => {
    return recordings.filter(r => {
      const matchCampaign = campaignFilter === 'all' || r.campaign_id === campaignFilter
      const matchAgent = agentFilter === 'all' || r.agent_id === agentFilter
      return matchCampaign && matchAgent
    })
  }, [recordings, campaignFilter, agentFilter])

  // Recordings proxied from Sarvam need the bearer token, and <audio src> can't send headers —
  // so fetch as a blob rather than putting the token in the URL where it would hit access logs.
  const resolveAudioUrl = async (url: string) => {
    if (!url.startsWith('/sarvam/')) return url
    const token = localStorage.getItem('insforge_access_token')
    const base = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')
    const res = await fetch(`${base}/api${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Recording unavailable')
    return URL.createObjectURL(await res.blob())
  }

  // The <audio> element is the source of truth for playback state. Its events are wired as JSX
  // props below rather than in an effect: the element only mounts after loading finishes, so a
  // mount-time effect ran while audioRef was still null and never attached anything.
  const playingIdRef = useRef<string | null>(null)
  const onAudioPlaying = () => {
    setPlayingId(playingIdRef.current)
    setLoadingId(null)
  }
  const onAudioStopped = () => {
    setPlayingId(null)
    setLoadingId(null)
  }

  const handlePlay = async (id: string, url: string) => {
    if (playingId === id) {
      setPlayingId(null)
      if (audioRef.current) audioRef.current.pause()
      return
    }
    
    // Instantly show the animation for the demo!
    setLoadingId(null)
    setPlayingId(id)
    playingIdRef.current = id

    if (!url) return

    try {
      const src = await resolveAudioUrl(url)
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = src.startsWith('blob:') ? src : null
      if (audioRef.current) {
        audioRef.current.src = src
        audioRef.current.play().catch(console.error)
      }
    } catch (e: any) {
      console.error('Audio load failed:', e)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) { toast.error('Select a file'); return }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      if (uploadCampaignId) formData.append('campaign_id', uploadCampaignId)
      if (uploadAgentId) formData.append('agent_id', uploadAgentId)

      const token = localStorage.getItem('insforge_access_token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${import.meta.env.VITE_API_URL}/recordings/upload`, {
        method: 'POST',
        headers,
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')

      qc.invalidateQueries({ queryKey: ['recordings'] })
      toast.success('Recording uploaded')
      setUploadOpen(false)
      setUploadFile(null)
      setUploadCampaignId('')
      setUploadAgentId('')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a|wma)$/i)) {
        setUploadFile(file)
      } else {
        toast.error('Please select an audio file')
      }
    }
  }

  if (isPending) {
    return <GridSkeleton cards={6} />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-lg text-destructive">{error?.message || 'Failed to load recordings'}</p>
        <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ['recordings'] })}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <audio
        ref={audioRef}
        className="hidden"
        onPlaying={onAudioPlaying}
        onPause={onAudioStopped}
        onEnded={onAudioStopped}
        onError={onAudioStopped}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voice Recordings</h1>
          <p className="text-muted-foreground mt-1">
            {filtered.length === recordings.length
              ? `${recordings.length} recording${recordings.length === 1 ? '' : 's'}`
              : `Showing ${filtered.length} of ${recordings.length} recordings`}
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="mr-2 h-4 w-4" /> Upload Recording
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="w-56">
          <Select
            options={campaignOptions}
            value={campaignFilter}
            onChange={e => setCampaignFilter(e.target.value)}
          />
        </div>
        <div className="w-56">
          <Select
            options={agentOptions}
            value={agentFilter}
            onChange={e => setAgentFilter(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Music className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">No recordings found</p>
            <p className="text-sm mt-1">
              {campaignFilter !== 'all' || agentFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload your first recording to get started'}
            </p>
            {campaignFilter === 'all' && agentFilter === 'all' && (
              <Button className="mt-6" onClick={() => setUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Upload your first recording
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(recording => {
            const isPlaying = playingId === recording.id
            const isLoading = loadingId === recording.id
            const title = recording.recording_url?.split('/').pop()?.split('?')[0] || 'Recording'
            return (
              <Card key={recording.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Mic className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm truncate max-w-[180px]">
                            {title}
                          </CardTitle>
                          {isPlaying && <EqualizerBars />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(recording.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(recording.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {recording.campaign?.name && (
                      <Badge variant="info" className="text-xs">{recording.campaign.name}</Badge>
                    )}
                    {recording.agent?.name && (
                      <Badge variant="default" className="text-xs">{recording.agent.name}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                    {recording.duration_seconds != null && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDuration(recording.duration_seconds)}</span>
                      </div>
                    )}
                    {recording.file_size != null && (
                      <span>{(recording.file_size / 1024 / 1024).toFixed(1)} MB</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={isPlaying ? 'secondary' : 'primary'}
                      size="sm"
                      className="flex-1"
                      disabled={isLoading}
                      aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
                      onClick={() => handlePlay(recording.id, recording.recording_url)}
                    >
                      {isPlaying ? (
                        <><Pause className="mr-2 h-4 w-4" /><EqualizerBars /> Pause</>
                      ) : isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</>
                      ) : (
                        <><Play className="mr-2 h-4 w-4" /> Play</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const a = document.createElement('a')
                          a.href = await resolveAudioUrl(recording.recording_url)
                          const base = recording.recording_url?.split('/').pop()?.split('?')[0] || 'recording'
                          a.download = /\.\w{2,4}$/.test(base) ? base : `${base}.wav`
                          a.click()
                        } catch (e: any) {
                          toast.error(e?.message || 'Could not download recording')
                        }
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={uploadOpen} onClose={() => { setUploadOpen(false); setUploadFile(null); setUploadCampaignId(''); setUploadAgentId('') }} title="Upload Recording">
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-input rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadFile ? (
              <div>
                <Music className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">{uploadFile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Drop audio file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">MP3, WAV, OGG, M4A supported</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.wma"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <Select
            label="Assign to Campaign (optional)"
            options={[{ value: '', label: 'No campaign' }, ...campaigns.map(c => ({ value: c.id, label: c.name }))]}
            value={uploadCampaignId}
            onChange={e => setUploadCampaignId(e.target.value)}
          />

          <Select
            label="Assign to Agent (optional)"
            options={[{ value: '', label: 'No agent' }, ...agents.map(a => ({ value: a.id, label: a.name }))]}
            value={uploadAgentId}
            onChange={e => setUploadAgentId(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setUploadOpen(false); setUploadFile(null); setUploadCampaignId(''); setUploadAgentId('') }}>Cancel</Button>
            <Button loading={uploading} disabled={!uploadFile} onClick={handleUpload}>
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Recording">
        <p className="text-muted-foreground mb-6">Are you sure you want to delete this recording?</p>
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
