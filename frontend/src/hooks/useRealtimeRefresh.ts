import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSocket } from '@/contexts/SocketContext'

/**
 * One socket listener for the whole app: when the backend reports a call change, invalidate every
 * query derived from calls so any open page refreshes itself.
 *
 * Mounted once in AppLayout rather than per page — otherwise each new page needs its own listener
 * and the ones that don't have it silently go stale.
 */
const CALL_DERIVED_QUERIES = [
  'calls',        // All Calls / Inbound / Outbound / Escalations
  'campaigns',    // counts are derived from calls
  'dashboard',
  'analytics',
  'transcripts',
  'recordings',
  'insights',
]

export function useRealtimeRefresh() {
  const { socket } = useSocket()
  const qc = useQueryClient()

  useEffect(() => {
    if (!socket) return
    const refresh = () => {
      for (const key of CALL_DERIVED_QUERIES) qc.invalidateQueries({ queryKey: [key] })
    }
    socket.on('call:updated', refresh)
    socket.on('new_appointment', refresh)
    return () => {
      socket.off('call:updated', refresh)
      socket.off('new_appointment', refresh)
    }
  }, [socket, qc])
}
