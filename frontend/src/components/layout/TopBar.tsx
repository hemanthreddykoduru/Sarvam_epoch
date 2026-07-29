import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/Button'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { Moon, Sun, Menu, LogOut, PhoneCall } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const el = document.querySelector('main')
    if (!el) return
    const handler = () => setScrolled(el.scrollTop > 10)
    el.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => el.removeEventListener('scroll', handler)
  }, [])

  return (
    <header className={cn(
      'flex items-center justify-between px-4 md:px-6 h-16 border-b border-border/50 glass transition-all duration-300',
      scrolled && 'shadow-lg shadow-black/20'
    )}>
      <div className="flex items-center gap-3">
        <button aria-label="Open navigation menu" onClick={onMenuClick} className="p-2 rounded-md hover:bg-white/10 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden md:flex items-center gap-2">
          <span className="font-bold text-base tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Dashboard</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={toggleTheme} className="hover:bg-white/10 text-muted-foreground hover:text-foreground">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <NotificationBell />
        <Button variant="ghost" size="sm" onClick={signOut} title="Sign out" className="hover:bg-white/10 text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" />
        </Button>
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 ml-2 p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-border/50"
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white text-sm font-medium shadow-inner shadow-white/20">
            {user?.full_name ? getInitials(user.full_name) : 'U'}
          </div>
        </button>
      </div>
    </header>
  )
}
