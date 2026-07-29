import { useState } from 'react'
import toast from 'react-hot-toast'
import { PhoneOutgoing, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog } from '@/components/ui/Dialog'
import { api } from '@/lib/api'

/**
 * Dial one number with an AI employee. This places a real, billable call, so it only ever fires
 * from an explicit click — never on mount, never retried automatically.
 */
export function PlaceCallDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [reason, setReason] = useState('')
  const [calling, setCalling] = useState(false)

  const placeCall = async () => {
    if (!phone.trim()) {
      toast.error('Enter a phone number')
      return
    }
    setCalling(true)
    const { error } = await api.post('/outbound/trigger', {
      customerPhone: phone.trim(),
      customerName: name.trim() || 'Customer',
      service: reason.trim() || 'General enquiry',
    })
    setCalling(false)

    if (error) {
      toast.error(error)
      return
    }
    toast.success(`Calling ${name.trim() || phone.trim()}…`)
    setPhone(''); setName(''); setReason('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Place a call">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your AI employee dials this number and handles the conversation. The call appears here
          once it finishes.
        </p>

        <div className="space-y-1">
          <label htmlFor="call-phone" className="text-sm font-medium">Phone number</label>
          <Input
            id="call-phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 99666 59900"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="call-name" className="text-sm font-medium">
            Customer name <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input id="call-name" value={name} onChange={e => setName(e.target.value)} placeholder="Divya Nair" />
        </div>

        <div className="space-y-1">
          <label htmlFor="call-reason" className="text-sm font-medium">
            Reason for the call <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            id="call-reason"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Appointment reminder"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={calling}>Cancel</Button>
          <Button onClick={placeCall} disabled={calling || !phone.trim()} className="gap-2">
            {calling
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Dialling…</>
              : <><PhoneOutgoing className="h-4 w-4" /> Call now</>}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
