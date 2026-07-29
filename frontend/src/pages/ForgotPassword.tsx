import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { PhoneCall, ArrowLeft } from 'lucide-react'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await api.post('/auth/forgot-password', { email })
    if (err) {
      setError(err)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <PhoneCall className="h-10 w-10 text-primary mx-auto mb-2" />
            <CardTitle className="text-2xl">Email Sent</CardTitle>
            <CardDescription>Check your email for password reset instructions</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/login"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Login</Button></Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <PhoneCall className="h-10 w-10 text-primary mx-auto mb-2" />
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>Enter your email to receive reset instructions</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Button type="submit" className="w-full" loading={loading}>Send Reset Link</Button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-primary hover:underline"><ArrowLeft className="inline h-4 w-4 mr-1" />Back to Login</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
