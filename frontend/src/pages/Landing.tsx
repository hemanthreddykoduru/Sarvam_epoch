import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { useTheme } from '@/contexts/ThemeContext'
import { usePayment } from '@/contexts/PaymentContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  Moon, Sun, ArrowRight, Check, Phone, PhoneIncoming, PhoneOutgoing,
  CalendarCheck, Headphones, IndianRupee, FileText, Sparkles, Plus, Minus,
  MessageSquare, BarChart, UserCheck, Play, Pause, Volume2
} from 'lucide-react'

/* ------------------------------------------------------------------ *
 * The page is built around one idea: show the actual conversation.
 * Every competitor claims "natural voice AI"; the thing that can't be
 * faked is a real code-mixed Telugu/English call, so that is the hero.
 * Everything else on the page stays deliberately quiet around it.
 * ------------------------------------------------------------------ */

// Verbatim from a real call handled by the platform (lead qualification).
const REAL_CALL: { role: 'ai' | 'customer'; text: string }[] = [
  { role: 'ai', text: 'Thank you for calling Acme Corp. How can I help you today?' },
  { role: 'customer', text: 'Hi, I saw your ad. I want to know how much this AI costs?' },
  { role: 'ai', text: 'Thanks for your interest! Our pricing depends on your business requirements, like call volume. Could you please share a few details about your business so our team can prepare a quote?' },
  { role: 'customer', text: 'సరే అడగండి.' },
  { role: 'ai', text: 'Thank you. What is your name and your business name?' },
  { role: 'customer', text: 'నా పేరు రాహుల్. నా బిజినెస్ పేరు ఏమో Medical Shop.' },
  { role: 'ai', text: 'Thank you, Rahul. Approximately how many customer calls do you receive each day?' },
  { role: 'customer', text: 'రోజూ ఒక 100 కాల్స్ వస్తాయి.' },
]

/** Plays the transcript back turn by turn. Static under reduced motion. */
function LiveTranscript() {
  const [shown, setShown] = useState(1)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(REAL_CALL.length)
      return
    }
    const id = setInterval(
      () => setShown(n => (n >= REAL_CALL.length ? 1 : n + 1)),
      2200,
    )
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [shown])

  return (
    <div className="rounded-2xl border bg-card/80 backdrop-blur shadow-xl shadow-primary/5 overflow-hidden">
      <div className="flex items-center gap-3 border-b px-5 py-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-sm font-medium">Live AI Call Demo</span>
        <span className="ml-auto font-mono text-xs text-muted-foreground">00:42</span>
      </div>

      <div ref={scroller} className="h-[340px] space-y-3 overflow-y-auto p-5">
        {REAL_CALL.slice(0, shown).map((turn, i) => (
          <div key={i} className={turn.role === 'ai' ? 'flex justify-start' : 'flex justify-end'}>
            <div
              className={[
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed',
                turn.role === 'ai'
                  ? 'rounded-tl-sm bg-primary text-primary-foreground'
                  : 'rounded-tr-sm border bg-muted/60 text-foreground',
              ].join(' ')}
            >
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider opacity-70">
                {turn.role === 'ai' ? 'AI Sales Rep' : 'Customer'}
              </span>
              {turn.text}
            </div>
          </div>
        ))}
      </div>

      <p className="border-t px-5 py-3 text-xs text-muted-foreground">
        Real transcript. The AI flawlessly extracts lead variables from code-mixed speech.
      </p>
    </div>
  )
}

const FEATURES = [
  { icon: PhoneIncoming, title: '24/7 AI Receptionist', body: 'Answers every call instantly, day or night. Say goodbye to missed customers and lost revenue.' },
  { icon: Headphones, title: 'Native Regional Languages', body: 'Speaks English, Hindi, Telugu, Tamil, Kannada, and Malayalam fluently with native accents.' },
  { icon: CalendarCheck, title: 'Automated Booking', body: 'Books, reschedules, and cancels appointments dynamically by checking your live calendar.' },
  { icon: PhoneOutgoing, title: 'Lead Qualification', body: 'Acts as an inbound sales rep to extract variables like Name, Budget, and Intent directly into your CRM.' },
  { icon: MessageSquare, title: 'WhatsApp Automation', body: 'Automatically sends booking confirmations, invoices, and payment reminders via WhatsApp after the call.' },
  { icon: FileText, title: 'Real-Time Transcripts', body: 'Every conversation is instantly recorded, transcribed, and summarized in your dashboard.' },
  { icon: UserCheck, title: 'Smart Human Handoff', body: 'If the AI cannot solve a complex issue, it seamlessly transfers the call to a human agent with full context.' },
  { icon: BarChart, title: 'Deep Business Insights', body: 'Get AI-generated analytics on peak call hours, most requested services, and revenue opportunities.' },
]

const STEPS = [
  { n: '01', title: 'Upload your Knowledge Base', body: 'Drop in your FAQs, pricing, and business details. The AI learns instantly.' },
  { n: '02', title: 'Define your Variables', body: 'Tell the AI what to extract (e.g., Name, City, Call Volume) during the call.' },
  { n: '03', title: 'Watch the Leads Roll In', body: 'Transcripts, recordings, and extracted structured data land in your CRM instantly.' },
]

const FAQS = [
  { q: 'Can it speak multiple Indian languages?', a: 'Yes! It fluently speaks English, Hindi, Telugu, Tamil, Kannada, and Malayalam, seamlessly switching based on the caller.' },
  { q: 'Is it just a simple FAQ bot?', a: 'No. Deal My Calls can qualify leads, extract structured data, book appointments, and integrate directly with your CRM.' },
  { q: 'What happens when it cannot answer something?', a: 'It gracefully hands the call to a human and flags it in your Escalations queue with the transcript attached.' },
  { q: 'Do you offer custom integrations?', a: 'Yes. Our enterprise plans include integrations with WhatsApp, Razorpay, and custom CRMs.' },
]

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-medium">{q}</span>
        {open ? <Minus className="h-4 w-4 shrink-0 text-muted-foreground" /> : <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && <p className="pb-5 pr-8 text-sm leading-relaxed text-muted-foreground">{a}</p>}
    </div>
  )
}

const WAVE = [
  { h: 45, d: 0.0 }, { h: 80, d: 0.18 }, { h: 100, d: 0.36 }, { h: 65, d: 0.09 },
  { h: 95, d: 0.27 }, { h: 55, d: 0.45 }, { h: 85, d: 0.12 },
]

function EqualizerBars() {
  return (
    <span className="flex h-4 items-center gap-[2px]" aria-hidden="true">
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

// --- Voice Demo Component ---
const VoiceDemo = () => {
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const voices = [
    { id: 'bhaskar', name: 'Bhaskar (Telugu - Male)', src: '/demo/bhaskar_tts_audio.mp3' },
    { id: 'deva', name: 'Deva (Telugu - Male)', src: '/demo/deva_tts_audio.mp3' },
    { id: 'shanti', name: 'Shanti (Telugu - Female)', src: '/demo/shanti_tts_audio.mp3' },
  ];

  const handlePlay = (voice: typeof voices[0]) => {
    if (playing === voice.id) {
      audioRef.current?.pause();
      setPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = voice.src;
        audioRef.current.play();
        setPlaying(voice.id);
      }
    }
  };

  return (
    <section id="voice-demo" className="border-b bg-card">
      <audio ref={audioRef} onEnded={() => setPlaying(null)} />
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 md:py-28 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Listen to our AI Voices</h2>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          Experience the ultra-realistic, zero-latency voices. Listen to how naturally the AI speaks in different regional languages.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {voices.map((voice) => (
            <div key={voice.id} className="rounded-xl border bg-background p-6 shadow-sm transition hover:shadow-md text-left">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <Volume2 className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{voice.name}</h3>
                </div>
              </div>
              <Button 
                variant={playing === voice.id ? "default" : "outline"} 
                className="w-full gap-2"
                onClick={() => handlePlay(voice)}
              >
                {playing === voice.id ? (
                  <><Pause className="h-4 w-4" /> <EqualizerBars /> Pause Recording</>
                ) : (
                  <><Play className="h-4 w-4" /> Play Recording</>
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Landing() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { createCheckout, isLoading } = usePayment()
  const { user } = useAuth()

  const subscribe = (plan: typeof PLANS[number]) => {
    if (!user) {
      toast.error('Create an account first')
      navigate('/register')
      return
    }
    createCheckout(plan.name.toLowerCase(), parseInt(plan.price.replace(/[₹,]/g, ''), 10))
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ---------- nav ---------- */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
            <div className="leading-none">
              <div className="text-base font-bold tracking-tight">Deal My Calls</div>
              <div className="text-[10px] font-medium tracking-wide text-muted-foreground">NEVER MISS A CALL</div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">What it does</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">How it works</a>
            <a href="#voice-demo" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Demo Call</a>
            <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Pricing</a>
            <a href="mailto:hemanthreddykoduru2005@gmail.com?subject=About%20The%20Deal%20My%20Calls" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Contact</a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="rounded-md p-2 transition-colors hover:bg-accent"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>


          </div>
        </div>
      </nav>

      {/* ---------- hero ---------- */}
      <section className="relative border-b overflow-hidden">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover z-0 opacity-100"
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/20 to-transparent z-10 pointer-events-none"></div>

        <div className="relative z-20 mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Automate customer communication 24x7
            </div>

            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Never Miss a Customer Call Again
              <span className="text-primary">.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-foreground/90 drop-shadow-sm">
              An AI employee that answers every call, qualifies leads, and books appointments 
              — in the language they actually speak. Perfect for businesses of all sizes, from startups to enterprises.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="https://cal.com/hemanth.reddyk/30min" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="gap-2">
                  <CalendarCheck className="h-4 w-4" /> Book 1:1 Integration Call
                </Button>
              </a>
              <a href="#voice-demo">
                <Button size="lg" variant="outline">Demo Call</Button>
              </a>
            </div>

            <p className="mt-5 text-sm font-medium text-foreground/80 drop-shadow-sm">
              Built for Small, Medium, and Large Businesses
            </p>
          </div>

          {/* the signature element */}
          <LiveTranscript />
        </div>
      </section>

      {/* ---------- proof strip ---------- */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold tracking-tight">6 languages</div>
            <div className="text-sm text-muted-foreground">Telugu, Hindi, English & More</div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold tracking-tight">24/7</div>
            <div className="text-sm text-muted-foreground">Never off, never on leave</div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold tracking-tight">&lt; 1 sec</div>
            <div className="text-sm text-muted-foreground">Average answer time</div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold tracking-tight">Lead Gen</div>
            <div className="text-sm text-muted-foreground">Variables extracted instantly</div>
          </div>
        </div>
      </section>

      <VoiceDemo />

      {/* ---------- what it does ---------- */}
      <section id="features" className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            One hire. The ultimate AI Sales Rep.
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Deal My Calls handles inbound leads, qualifies prospects, and answers FAQs perfectly, 
            so you can focus on closing the deals.
          </p>

          <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(f => (
              <div key={f.title}>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section id="how-it-works" className="border-b bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Live in an afternoon</h2>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {STEPS.map(s => (
              <div key={s.n} className="border-t pt-6">
                <div className="font-mono text-sm text-primary">{s.n}</div>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- the real call ---------- */}
      <section id="voice-demo" className="border-b">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              A real lead qualification call
            </h2>
            <p className="mt-4 text-muted-foreground">
              No actors, no script written for a demo. This is a customer inquiring about pricing — 
              the AI effortlessly extracts their business name, call volume, and location, seamlessly 
              switching between Telugu and English mid-sentence.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                'Understands code-mixed speech perfectly',
                'Dynamically extracts CRM variables mid-conversation',
                'Politely handles pricing and qualification questions',
              ].map(point => (
                <li key={point} className="flex gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{point}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <a href="tel:8071580625">
                <Button size="lg" className="gap-2 w-full sm:w-auto shadow-lg shadow-primary/20">
                  <Phone className="h-4 w-4" /> Try the Demo Call
                </Button>
              </a>
              <p className="mt-3 text-xs text-muted-foreground">
                Click to connect instantly and speak with our AI Sales Rep.
              </p>
            </div>
          </div>
          <LiveTranscript />
        </div>
      </section>

      {/* ---------- pricing ---------- */}
      <section id="pricing" className="border-b bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Custom Pricing for Every Business</h2>
          <p className="mt-4 mx-auto max-w-xl text-muted-foreground">
            Deal My Calls does not have fixed pricing. Our pricing depends on your exact business requirements, call volume, and needed integrations.
          </p>

          <div className="mt-10 mx-auto max-w-2xl">
            <div className="rounded-2xl border border-primary/20 bg-card p-8 sm:p-12 shadow-xl shadow-primary/5">
              <h3 className="text-2xl font-bold mb-4">Get a Personalized Quote</h3>
              <p className="text-muted-foreground mb-8">
                Call our AI Sales Representative right now to share your business details. Our human team will prepare a customized solution and contact you shortly.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="https://cal.com/hemanth.reddyk/30min" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="gap-2">
                    <CalendarCheck className="h-4 w-4" /> Book a 1:1 Call
                  </Button>
                </a>
                <a href="tel:8071580625">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Phone className="h-4 w-4" /> Call AI for Quote
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- faq ---------- */}
      <section className="border-b">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 md:py-28">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Questions people ask</h2>
          <div className="mt-10">
            {FAQS.map(f => <Faq key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* ---------- closing cta ---------- */}
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 md:py-28">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Hear your own first call today
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Describe your business, point a number at it, and ring yourself. Never miss a call again.
          </p>

        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer>
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Logo" className="h-7 w-7 object-contain" />
            <span className="text-sm font-semibold">Deal My Calls</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#features" className="transition-colors hover:text-foreground">What it does</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
            <a href="mailto:hemanthreddykoduru2005@gmail.com?subject=About%20The%20Deal%20My%20Calls" className="transition-colors hover:text-foreground">Contact</a>

          </div>
          <p className="text-xs text-muted-foreground">© 2026 Deal My Calls AI</p>
        </div>
      </footer>
    </div>
  )
}
