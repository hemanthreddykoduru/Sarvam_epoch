import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, Users, Phone, Settings, Shield,
  X, CalendarClock, Bot, Package, Book,
  MessageSquare, FileBarChart, Activity, CreditCard,
  Briefcase, Sparkles, Plug, BarChart3, Mic,
  PhoneIncoming, PhoneOutgoing,
  FileText, BellRing, Wand2, AudioLines, PlayCircle, ScrollText
} from 'lucide-react'

interface NavGroup {
  label: string
  items: { to: string; icon: any; label: string }[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/calls', icon: Phone, label: 'All Calls' },
      { to: '/inbound', icon: PhoneIncoming, label: 'Inbound' },
      { to: '/outbound', icon: PhoneOutgoing, label: 'Outbound' },
      { to: '/recordings', icon: Mic, label: 'Recordings' },
      { to: '/transcripts', icon: FileText, label: 'Transcripts' },
      { to: '/whatsapp', icon: MessageSquare, label: 'WhatsApp' },
      { to: '/escalations', icon: CalendarClock, label: 'Escalations' },
    ],
  },
  {
    label: 'Business',
    items: [
      { to: '/campaigns', icon: Briefcase, label: 'Campaigns' },
      { to: '/customers', icon: Users, label: 'Customers' },
      { to: '/crm', icon: Package, label: 'CRM Leads' },
      { to: '/followups', icon: BellRing, label: 'Follow-ups' },
      { to: '/subscription', icon: CreditCard, label: 'Billing & Plan' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/analytics', icon: Activity, label: 'Analytics' },
      { to: '/workforce', icon: BarChart3, label: 'Workforce' },
      { to: '/insights', icon: Sparkles, label: 'Insights' },
      { to: '/reports', icon: FileBarChart, label: 'Reports' },
    ],
  },
  {
    label: 'AI Studio',
    items: [
      { to: '/agents', icon: Bot, label: 'AI Employee' },
      { to: '/knowledge', icon: Book, label: 'Knowledge' },
      { to: '/prompts', icon: Wand2, label: 'Prompt Studio' },
      { to: '/voices', icon: AudioLines, label: 'Voice Library' },
      { to: '/simulation', icon: PlayCircle, label: 'Voice Simulation' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/logs', icon: ScrollText, label: 'Logs' },
      { to: '/integrations', icon: Plug, label: 'Integrations' },
    ],
  },
]

const adminItems = [
  { to: '/admin', icon: Shield, label: 'System Admin' },
  { to: '/admin/users', icon: Users, label: 'Organization Accounts' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth()

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}
      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-64 glass border-r transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto overflow-y-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between p-4 border-b border-border/50 sticky top-0 z-10 glass">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-sm shadow-primary/20 text-white">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight leading-none text-foreground">NexStaff AI</span>
              <span className="text-[10px] text-accent font-medium tracking-wide">HIRE INTELLIGENCE</span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close navigation menu" className="p-1 rounded-md hover:bg-accent lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-6">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) => cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {(user?.role === 'admin' || user?.role === 'superadmin') && (
            <div>
              <p className="px-3 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Admin
              </p>
              <div className="space-y-0.5">
                {adminItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) => cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="sticky bottom-0 bg-card border-t p-4">
          <NavLink
            to="/settings"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors group"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
              {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || user?.email?.split('@')[0] || 'User'}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user?.plan || 'free'} plan</p>
            </div>
            <Settings className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </NavLink>
        </div>
      </aside>
    </>
  )
}
