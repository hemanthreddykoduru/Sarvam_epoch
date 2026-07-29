import { createContext, useContext, useState, type ReactNode } from 'react'
import { toast } from 'react-hot-toast'
import { api } from '@/lib/api'
import { useAuth } from './AuthContext'

interface PaymentContextType {
  createCheckout: (plan: string, amount: number, currency?: string) => Promise<boolean>
  isLoading: boolean
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined)

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const { user, refreshUser } = useAuth()

  const createCheckout = async (plan: string, amount: number, currency: string = 'INR'): Promise<boolean> => {
    setIsLoading(true)
    
    try {
      const { data, error } = await api.post('/payments/create-order', { plan, amount, currency, userId: user?.id })
      
      if (error || !data) throw new Error(error || 'Failed to create order')
      
      const { orderId } = data as any
      
      return new Promise((resolve) => {
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: amount * 100,
          currency,
          name: 'TeluguAI Caller',
          description: `Subscription - ${plan} plan`,
          order_id: orderId,
          handler: async (response: any) => {
            try {
              const { error: verifyError } = await api.post('/payments/verify-payment', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan,
                userId: user?.id
              })
              
              if (!verifyError) {
                toast.success('Payment successful!')
                refreshUser()
                resolve(true)
              } else {
                toast.error('Payment verification failed')
                resolve(false)
              }
            } catch (error) {
              toast.error('Payment verification error')
              resolve(false)
            }
          },
          prefill: {
            name: user?.full_name || '',
            email: user?.email || ''
          },
          theme: {
            color: '#6366f1'
          }
        }
        
        const razorpay = new (window as any).Razorpay(options)
        razorpay.open()
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Payment initialization error:', msg)
      toast.error(msg)
      return Promise.resolve(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PaymentContext.Provider value={{ createCheckout, isLoading }}>
      {children}
    </PaymentContext.Provider>
  )
}

export function usePayment() {
  const context = useContext(PaymentContext)
  if (!context) throw new Error('usePayment must be used within PaymentProvider')
  return context
}
