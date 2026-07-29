import { useState, useRef, useCallback } from 'react'
import { Play, Pause, Volume2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const INDICF5_URL = 'https://task-left-sega-mysimon.trycloudflare.com'
const DEFAULT_TELUGU_TEXT = 'నమస్కారం, మీరు ఎలా ఉన్నారు? నేను తెలుగు AI వాయిస్ అసిస్టెంట్‌ను.'

interface Voice {
  id: string
  name: string
  teluguName: string
  description: string
  audioUrl: string
  tagline: string
  refAudio: string
  refText: string
}

const voices: Voice[] = [
  {
    id: 'shanti',
    name: 'Shanthi',
    teluguName: 'శాంతి',
    description: 'Warm & friendly — female voice',
    tagline: 'నేను తెలుగులో మాట్లాడే AI వాయిస్ అసిస్టెంట్‌ను.',
    audioUrl: '/demo/shanti_tts_audio.mp3',
    refAudio: 'TEL_F_SHANTHI.wav',
    refText: 'నేను తెలుగులో మాట్లాడే AI వాయిస్ అసిస్టెంట్‌ను.',
  },
  {
    id: 'bhaskar',
    name: 'Bhaskar',
    teluguName: 'భాస్కర్',
    description: 'Casual & energetic — male voice',
    tagline: 'నేను తెలుగు, ఇంగ్లీష్ రెండూ అర్థం చేసుకోగలను.',
    audioUrl: '/demo/bhaskar_tts_audio.mp3',
    refAudio: 'TEL_M_BHASKAR.wav',
    refText: 'నేను తెలుగు, ఇంగ్లీష్ రెండూ అర్థం చేసుకోగలను.',
  },
  {
    id: 'deva',
    name: 'Deva',
    teluguName: 'దేవ',
    description: 'Professional & clear — male voice',
    tagline: 'మేము తెలుగు మాట్లాడే వ్యాపారాల కోసం రూపొందించబడ్డాము.',
    audioUrl: '/demo/deva_tts_audio.mp3',
    refAudio: 'TEL_M_DEVA.wav',
    refText: 'మేము తెలుగు మాట్లాడే వ్యాపారాల కోసం రూపొందించబడ్డాము.',
  },
]

type TtsSource = 'sarvam' | 'indicf5'

function WaveformBar({ active, index }: { active: boolean; index: number }) {
  return (
    <div
      className={cn(
        'w-[3px] rounded-full transition-all duration-300',
        active ? 'bg-primary' : 'bg-muted-foreground/20'
      )}
      style={{
        height: active ? undefined : '4px',
        animation: active ? `wave 1.2s ease-in-out infinite ${index * 0.1}s` : 'none',
      }}
    />
  )
}

function formatTime(s: number) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function SarvamCard({ voice, isPlaying, onToggle, onStop }: {
  voice: Voice
  isPlaying: boolean
  onToggle: () => void
  onStop: () => void
}) {
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopProgress = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const handleTimeUpdate = () => {
    const a = audioRef.current
    if (!a) return
    setCurrentTime(a.currentTime)
    if (a.duration) setProgress((a.currentTime / a.duration) * 100)
  }

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current?.duration || 0)
  }

  const handleEnded = () => {
    setProgress(0)
    setCurrentTime(0)
    stopProgress()
    onStop()
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      audio.currentTime = 0
      stopProgress()
      onStop()
    } else {
      onToggle()
      audio.currentTime = 0
      audio.play().catch(console.error)
    }
  }

  return (
    <div className={cn(
      'relative p-6 rounded-2xl border transition-all duration-300 group',
      isPlaying
        ? 'bg-card border-primary/50 shadow-lg shadow-primary/10'
        : 'bg-card/50 border-border hover:border-primary/30 hover:shadow-md'
    )}>
      <audio
        ref={audioRef}
        src={voice.audioUrl}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-xs text-primary font-medium mb-1">AI Voice</div>
          <h3 className="text-lg font-semibold">{voice.name}</h3>
          <p className="text-sm text-muted-foreground">{voice.description}</p>
        </div>
        <div className={cn(
          'h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300',
          isPlaying ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'bg-primary/10 text-primary'
        )}>
          <Volume2 className="h-6 w-6" />
        </div>
      </div>

      <div className="text-sm text-muted-foreground leading-relaxed mb-4 bg-muted/30 rounded-lg p-3 border">
        {voice.tagline}
      </div>

      <div className="flex items-center justify-center gap-[3px] h-10 mb-4">
        {Array.from({ length: 40 }).map((_, i) => (
          <WaveformBar key={i} active={isPlaying} index={i} />
        ))}
      </div>

      <div className="relative h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={togglePlay}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200',
            isPlaying
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl'
              : 'bg-primary/10 text-primary hover:bg-primary/20 group-hover:bg-primary/15'
          )}
        >
          {isPlaying ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Listen</>}
        </button>
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}

function IndicF5Card({ voice, isPlaying, onGenerate, onStop, genText, isLoading, audioBlobUrl }: {
  voice: Voice
  isPlaying: boolean
  onGenerate: () => void
  onStop: () => void
  genText: string
  isLoading: boolean
  audioBlobUrl: string | null
}) {
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopProgress = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const handleTimeUpdate = () => {
    const a = audioRef.current
    if (!a) return
    setCurrentTime(a.currentTime)
    if (a.duration) setProgress((a.currentTime / a.duration) * 100)
  }

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current?.duration || 0)
  }

  const handleEnded = () => {
    setProgress(0)
    setCurrentTime(0)
    stopProgress()
    onStop()
  }

  const handlePlayPause = () => {
    const a = audioRef.current
    if (!a) return
    if (isPlaying) {
      a.pause()
      a.currentTime = 0
      stopProgress()
      onStop()
    } else if (audioBlobUrl) {
      a.src = audioBlobUrl
      a.play().catch(console.error)
    } else {
      onGenerate()
    }
  }

  return (
    <div className={cn(
      'relative p-6 rounded-2xl border transition-all duration-300 group',
      (isPlaying || isLoading)
        ? 'bg-card border-primary/50 shadow-lg shadow-primary/10'
        : 'bg-card/50 border-border hover:border-primary/30 hover:shadow-md'
    )}>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-xs text-primary font-medium mb-1">IndicF5 TTS (Colab)</div>
          <h3 className="text-lg font-semibold">{voice.name}</h3>
          <p className="text-sm text-muted-foreground">{voice.description}</p>
        </div>
        <div className={cn(
          'h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300',
          (isPlaying || isLoading) ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'bg-primary/10 text-primary'
        )}>
          <Volume2 className="h-6 w-6" />
        </div>
      </div>

      <div className="flex items-center justify-center gap-[3px] h-10 mb-4">
        {Array.from({ length: 40 }).map((_, i) => (
          <WaveformBar key={i} active={isPlaying || isLoading} index={i} />
        ))}
      </div>

      <div className="relative h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={handlePlayPause}
          disabled={isLoading || !genText.trim()}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200',
            isPlaying
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl'
              : isLoading || !genText.trim()
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary/10 text-primary hover:bg-primary/20 group-hover:bg-primary/15'
          )}
        >
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating</>
            : isPlaying ? <><Pause className="h-4 w-4" /> Pause</>
            : <><Play className="h-4 w-4" /> Listen</>}
        </button>
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          {isLoading ? '...' : `${formatTime(currentTime)} / ${formatTime(duration)}`}
        </span>
      </div>
    </div>
  )
}

export function VoiceDemo() {
  const [source, setSource] = useState<TtsSource>('sarvam')
  const [activeVoice, setActiveVoice] = useState<string | null>(null)
  const [customText, setCustomText] = useState(DEFAULT_TELUGU_TEXT)
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null)
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null)

  const stopAll = useCallback(() => {
    setActiveVoice(null)
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl)
      setAudioBlobUrl(null)
    }
  }, [audioBlobUrl])

  const handleIndicF5Generate = async (voice: Voice) => {
    if (loadingVoice) return
    if (!customText.trim()) {
      toast.error('Please enter some text to synthesize')
      return
    }

    setLoadingVoice(voice.id)

    try {
      const res = await fetch(`${INDICF5_URL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gen_text: customText,
          ref_audio: `/content/prompts/${voice.refAudio}`,
          ref_text: voice.refText,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || `HTTP ${res.status}`)
      }

      // Clean up previous blob URL
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl)

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setAudioBlobUrl(url)
      setActiveVoice(voice.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate speech')
    } finally {
      setLoadingVoice(null)
    }
  }

  const handleSarvamToggle = (voiceId: string) => {
    if (activeVoice === voiceId) {
      stopAll()
    } else {
      stopAll()
      setActiveVoice(voiceId)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary border border-primary/20">
          Powered by our Multilingual Voice Engine
        </div>
      </div>

      {source === 'indicf5' && (
        <div className="max-w-2xl mx-auto">
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Type Telugu text to synthesize
          </label>
          <textarea
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-card/50 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Enter Telugu text..."
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {voices.map(voice => (
          source === 'sarvam' ? (
            <SarvamCard
              key={voice.id}
              voice={voice}
              isPlaying={activeVoice === voice.id}
              onToggle={() => handleSarvamToggle(voice.id)}
              onStop={() => setActiveVoice(null)}
            />
          ) : (
            <IndicF5Card
              key={voice.id}
              voice={voice}
              isPlaying={activeVoice === voice.id}
              onGenerate={() => handleIndicF5Generate(voice)}
              onStop={() => setActiveVoice(null)}
              genText={customText}
              isLoading={loadingVoice === voice.id}
              audioBlobUrl={audioBlobUrl}
            />
          )
        ))}
      </div>
    </div>
  )
}
