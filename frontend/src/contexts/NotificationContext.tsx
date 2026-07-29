import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { useSocket } from './SocketContext'

export interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  created_at: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllRead: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const STORAGE_KEY = 'teluguai_notifications'

function loadNotifications(): Notification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveNotifications(notifications: Notification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket()
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications)

  useEffect(() => {
    saveNotifications(notifications)
  }, [notifications])

  useEffect(() => {
    if (!socket) return

    const handlers: Record<string, (data: any) => void> = {
      'call:started': (data) => {
        const notif: Notification = {
          id: crypto.randomUUID(),
          title: 'Call Started',
          message: `Call to ${data.contact_name || 'contact'} has begun.`,
          read: false,
          created_at: new Date().toISOString(),
        }
        setNotifications(prev => [notif, ...prev])
      },
      'call:completed': (data) => {
        const notif: Notification = {
          id: crypto.randomUUID(),
          title: 'Call Completed',
          message: `Call to ${data.contact_name || 'contact'} finished (${data.duration || '0s'}).`,
          read: false,
          created_at: new Date().toISOString(),
        }
        setNotifications(prev => [notif, ...prev])
      },
      'call:failed': (data) => {
        const notif: Notification = {
          id: crypto.randomUUID(),
          title: 'Call Failed',
          message: `Call to ${data.contact_name || 'contact'} failed: ${data.reason || 'unknown error'}.`,
          read: false,
          created_at: new Date().toISOString(),
        }
        setNotifications(prev => [notif, ...prev])
      },
    }

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler)
    })

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler)
      })
    }
  }, [socket])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications must be used within NotificationProvider')
  return context
}
