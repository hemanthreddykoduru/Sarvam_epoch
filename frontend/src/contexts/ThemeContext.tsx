import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { flushSync } from 'react-dom'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: (e?: React.MouseEvent) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = useCallback(async (e?: React.MouseEvent) => {
    const button = e?.currentTarget as HTMLElement | undefined
    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    if (button) {
      const rect = button.getBoundingClientRect()
      x = rect.left + rect.width / 2
      y = rect.top + rect.height / 2
    }

    const nextTheme = theme === 'light' ? 'dark' : 'light'

    if (typeof document.startViewTransition === 'function') {
      const transition = document.startViewTransition(() => {
        flushSync(() => {
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(nextTheme)
          localStorage.setItem('theme', nextTheme)
          setTheme(nextTheme)
        })
      })

      await transition.ready

      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      )

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 350,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      )
    } else {
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(nextTheme)
      localStorage.setItem('theme', nextTheme)
      setTheme(nextTheme)
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
