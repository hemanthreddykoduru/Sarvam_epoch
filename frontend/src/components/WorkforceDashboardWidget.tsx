import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Sparkles, Phone, ShieldCheck, CheckCircle2, MessageSquare, Bot, ArrowRight, Play, Volume2 } from 'lucide-react'

export function WorkforceDashboardWidget() {
  const [activeTab, setActiveTab] = useState<'receptionist' | 'sales' | 'collections'>('receptionist')

  const roles = {
    receptionist: {
      title: 'Receptionist AI',
      status: 'Active (Inbound & Outbound)',
      activity: 'Answering inquiries & booking appointments 24/7',
      liveCall: {
        caller: 'Sunita Sharma (Apollo Patient)',
        topic: 'Dentist Appointment Confirmation',
        transcript: '"Hello Sunita! I have reserved your dental checkup for tomorrow at 10:30 AM with Dr. Rao. Should I send directions on WhatsApp?"',
        time: 'Just now',
        channel: 'Voice + WhatsApp'
      },
      stats: [
        { label: 'Calls Handled', value: '48' },
        { label: 'Appointments', value: '17' },
        { label: 'CSAT', value: '98%' },
      ]
    },
    sales: {
      title: 'Sales Executive AI',
      status: 'Active (Lead Qualification)',
      activity: 'Engaging real estate leads & pitching commercial plots',
      liveCall: {
        caller: 'Rajesh Kumar (Hyderabad Lead)',
        topic: 'Jubilee Hills Villa Inquiries',
        transcript: '"Hi Rajesh! I am following up on your request for 3BHK villas in Jubilee Hills. We have 2 plots left starting at ₹1.4Cr. Would you like a site visit brochure?"',
        time: '2 mins ago',
        channel: 'Voice + Email'
      },
      stats: [
        { label: 'Leads Reached', value: '34' },
        { label: 'Pipeline Value', value: '₹54,000' },
        { label: 'Interest Rate', value: '42%' },
      ]
    },
    collections: {
      title: 'Collections Officer AI',
      status: 'Active (Payment Reminders)',
      activity: 'Sending automated voice reminders & payment links',
      liveCall: {
        caller: 'Venkatesh Rao (EMI Overdue)',
        topic: 'Vehicle Loan EMI Payment',
        transcript: '"Namaste Venkatesh garu, your vehicle loan EMI of ₹8,500 was due yesterday. I can send a UPI payment link right now to clear it instantly."',
        time: '5 mins ago',
        channel: 'Voice + UPI Sync'
      },
      stats: [
        { label: 'Amount Recovered', value: '₹1,42,000' },
        { label: 'Reminders Sent', value: '17' },
        { label: 'Success Rate', value: '94%' },
      ]
    }
  }

  const current = roles[activeTab]

  return (
    <div className="w-full max-w-xl mx-auto rounded-2xl border bg-card/95 backdrop-blur-xl p-6 shadow-2xl shadow-primary/10 border-primary/20 space-y-5">
      {/* OS Bar Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm tracking-tight text-foreground">Deal My Calls Console</h4>
            <p className="text-[11px] text-muted-foreground">Enterprise OS • Active Live Simulator</p>
          </div>
        </div>
        <Badge variant="success" className="text-[10px] px-2 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
          LIVE WORKFORCE
        </Badge>
      </div>

      {/* Role Switcher Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-muted/60 text-xs font-semibold">
        {(['receptionist', 'sales', 'collections'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 rounded-lg capitalize transition-all ${
              activeTab === tab
                ? 'bg-card text-primary shadow-sm border border-primary/20 font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Selected Role Executive Status Card */}
      <div className="p-4 rounded-xl border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-foreground">{current.title}</span>
          <span className="text-[11px] text-emerald-500 font-semibold">{current.status}</span>
        </div>
        <p className="text-xs text-muted-foreground">{current.activity}</p>

        {/* Live Conversation Stream Mock */}
        <div className="p-3 rounded-lg bg-accent/40 border text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
            <span className="text-primary flex items-center gap-1">
              <Phone className="h-3 w-3" /> Live Audio Stream ({current.liveCall.caller})
            </span>
            <span>{current.liveCall.time}</span>
          </div>
          <p className="text-foreground/90 italic leading-relaxed">{current.liveCall.transcript}</p>
          <div className="flex items-center justify-between pt-1 border-t text-[10px] text-muted-foreground">
            <span>Topic: {current.liveCall.topic}</span>
            <span className="text-primary font-medium">{current.liveCall.channel}</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          {current.stats.map((s, i) => (
            <div key={i} className="p-2 rounded-lg bg-muted/40 border">
              <p className="text-sm font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
