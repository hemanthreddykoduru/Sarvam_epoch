import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PopoverContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const PopoverContext = createContext<PopoverContextType | null>(null)

function usePopover() {
  const ctx = useContext(PopoverContext)
  if (!ctx) throw new Error('Popover components must be used within PopoverRoot')
  return ctx
}

export function PopoverRoot({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      {children}
    </PopoverContext.Provider>
  )
}

export function PopoverTrigger({ children, className }: { children: ReactNode; className?: string }) {
  const { open, setOpen } = usePopover()
  return (
    <button
      onClick={() => setOpen(!open)}
      className={cn('inline-flex items-center justify-center', className)}
    >
      {children}
    </button>
  )
}

export function PopoverContent({ children, className, align = 'start' }: { children: ReactNode; className?: string; align?: 'start' | 'end' }) {
  const { open, setOpen } = usePopover()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, setOpen])

  useEffect(() => {
    if (!open) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, setOpen])

  if (!open) return null

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 w-72 rounded-lg border bg-background p-4 shadow-lg',
        align === 'end' ? 'right-0' : 'left-0',
        className
      )}
    >
      {children}
    </div>
  )
}
