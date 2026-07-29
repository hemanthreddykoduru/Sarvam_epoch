import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinCampaign: (campaignId: string) => void
  leaveCampaign: (campaignId: string) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL
    if (!API_URL) return

    const token = localStorage.getItem('insforge_access_token')
    const newSocket = io(API_URL, {
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => setIsConnected(true))
    newSocket.on('disconnect', () => setIsConnected(false))

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  const joinCampaign = useCallback((campaignId: string) => {
    socket?.emit('join:campaign', campaignId)
  }, [socket])

  const leaveCampaign = useCallback((campaignId: string) => {
    socket?.emit('leave:campaign', campaignId)
  }, [socket])

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinCampaign, leaveCampaign }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) throw new Error('useSocket must be used within SocketProvider')
  return context
}
