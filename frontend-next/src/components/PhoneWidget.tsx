import { useState, useEffect, useRef } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

const transcriptLines = [
  { role: 'ai', text: 'Namaskaram! This is Lahari from NexStaff AI.' },
  { role: 'user', text: 'Ayyo, em kaavali?' },
  { role: 'ai', text: 'Maa new voice calling service gurinchi cheppalani contact chesanu.' },
  { role: 'user', text: 'Oh alnaa. em chestundi mee service?' },
  { role: 'ai', text: 'Meeru contact list upload cheste, AI automatic ga calls chesi lead qualification chestundi.' },
  { role: 'user', text: 'Interesting. ela set avtundi?' },
  { role: 'ai', text: '5 minutes lo campaign set cheskovachu. Okasari try chesi chudandi.' },
]

const AI_LINE_INDICES = transcriptLines.map((l, i) => l.role === 'ai' ? i : -1).filter(i => i >= 0)

export function PhoneWidget() {
  const [calling, setCulling] = useState(false)
  const [connected, setConnected] = useState(false)
  const [muted, setMuted] = useState(false)
  const [visibleLines, setVisibleLines] = useState(0)
  const [duration, setDuration] = useState(0)
  const [done, setDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio('/demo/shanti_tts_audio.mp3')
    audioRef.current.loop = true
    audioRef.current.volume = 0.7
    return () => { audioRef.current?.pause(); audioRef.current = null }
  }, [])

  useEffect(() => {
    if (!calling) {
      audioRef.current?.pause()
      if (audioRef.current) audioRef.current.currentTime = 0
      setVisibleLines(0)
      setDuration(0)
      setDone(false)
      setConnected(false)
      return
    }
    const connTimer = setTimeout(() => setConnected(true), 1800)
    return () => clearTimeout(connTimer)
  }, [calling])

  useEffect(() => {
    if (!connected) {
      timerRef.current && clearInterval(timerRef.current)
      return
    }
    if (!muted) {
      audioRef.current?.play().catch(() => {})
    }
    timerRef.current = setInterval(() => {
      setDuration(d => { if (d >= callDuration) { clearInterval(timerRef.current); return d }; return d + 0.1 })
    }, 100)
    return () => { timerRef.current && clearInterval(timerRef.current) }
  }, [connected])

  useEffect(() => {
    if (muted) {
      audioRef.current?.pause()
    } else if (connected) {
      audioRef.current?.play().catch(() => {})
    }
  }, [muted, connected])

  const callDuration = transcriptLines.length * 2.5

  useEffect(() => {
    if (!connected) { setVisibleLines(0); return }
    if (visibleLines >= transcriptLines.length) { setDone(true); return }
    const t = setTimeout(() => setVisibleLines(v => v + 1), 2200)
    return () => clearTimeout(t)
  }, [connected, visibleLines])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const endCall = () => {
    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.currentTime = 0
    setCulling(false)
  }

  const toggleMute = () => {
    if (!muted) {
      audioRef.current?.pause()
    } else if (connected) {
      audioRef.current?.play().catch(() => {})
    }
    setMuted(!muted)
  }

  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div className="relative rounded-[2.5rem] border-4 border-zinc-800 dark:border-zinc-700 bg-black shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-xl z-10 flex items-center justify-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
          <div className="w-6 h-1.5 rounded-full bg-zinc-800" />
        </div>

        <div className="pt-8 pb-4 px-3 min-h-[480px] flex flex-col">
          <div className="flex items-center justify-between px-1 mb-3">
            <span className="text-[10px] text-zinc-400 font-mono">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 rounded-sm border border-zinc-500 relative">
                <div className="absolute bottom-0.5 left-0.5 right-0.5 h-1 bg-green-500 rounded-sm" />
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">95%</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-start pt-4">
            {!calling ? (
              <div className="flex flex-col items-center gap-4 pt-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <Volume2 className="h-7 w-7 text-white" />
                </div>
                <p className="text-white text-sm font-medium">Demo Call</p>
                <p className="text-zinc-400 text-xs">Tap to start a sample AI call</p>
                <button
                  onClick={() => setCulling(true)}
                  className="mt-2 w-14 h-14 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center transition-colors shadow-lg shadow-green-600/30"
                >
                  <Phone className="h-6 w-6 text-white" />
                </button>
              </div>
            ) : (
              <>
                <div className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-700 mb-3',
                  connected ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25' : 'bg-zinc-800 animate-pulse'
                )}>
                  {connected ? (
                    <Volume2 className="h-7 w-7 text-white" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  )}
                </div>
                <p className="text-white text-sm font-medium">Lahari</p>
                <p className={cn('text-xs mt-0.5', connected ? 'text-green-400' : 'text-yellow-400')}>
                  {connected ? formatTime(duration) : 'Connecting...'}
                </p>
                {connected && !muted && (
                  <div className="flex items-center gap-0.5 mt-2">
                    <span className="w-1 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="w-1 h-4 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '200ms' }} />
                    <span className="w-1 h-2 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '400ms' }} />
                    <span className="text-[10px] text-emerald-400 ml-1">Speaking</span>
                  </div>
                )}

                <div className="flex-1 w-full mt-3 space-y-1.5 overflow-hidden">
                  {transcriptLines.slice(0, visibleLines).map((line, i) => (
                    <div
                      key={i}
                      className={cn(
                        'px-3 py-2 rounded-2xl text-xs leading-relaxed max-w-[85%] animate-in slide-in-from-bottom-1 duration-300',
                        line.role === 'ai'
                          ? 'bg-emerald-600/20 text-emerald-200 self-start mr-auto rounded-bl-sm'
                          : 'bg-zinc-800 text-zinc-200 self-end ml-auto rounded-br-sm'
                      )}
                    >
                      {line.text}
                    </div>
                  ))}
                  {connected && !done && (
                    <div className="flex gap-1 px-2 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-6 pt-3 pb-1">
                  <button
                    onClick={toggleMute}
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                      muted ? 'bg-red-600/20 text-red-400' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={endCall}
                    className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors shadow-lg shadow-red-600/30"
                  >
                    <PhoneOff className="h-5 w-5 text-white" />
                  </button>
                  <button
                    onClick={toggleMute}
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                      muted ? 'bg-zinc-800 text-zinc-400' : 'bg-emerald-600/20 text-emerald-400 hover:text-emerald-300'
                    )}
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
