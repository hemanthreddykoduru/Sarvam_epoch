import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { useAgents, usePrompts, useTestAgent, useTestPrompt, useAllContacts } from '@/hooks/useQueries'
import { Play, Send, Trash2, Loader2, AlertCircle, MessageSquare, Phone, User, Globe } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/lib/api'

interface Message {
  role: 'user' | 'ai'
  text: string
}

export function VoiceSimulation() {
  const { contactId } = useParams<{ contactId: string }>()
  const { data: agents = [] } = useAgents()
  const { data: prompts = [] } = usePrompts()
  const testAgent = useTestAgent()
  const testPrompt = useTestPrompt()

  const [agentId, setAgentId] = useState('')
  const [promptId, setPromptId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'running' | 'complete'>('idle')
  const [contact, setContact] = useState<any>(null)
  const [contactLoading, setContactLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contactId) {
      setContactLoading(true)
      api.get<any>(`/contacts/${contactId}`).then(res => {
        setContact(res.data || null)
        setContactLoading(false)
      }).catch(() => {
        setContact(null)
        setContactLoading(false)
      })
    } else {
      setContact(null)
    }
  }, [contactId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim()) return
    const userText = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    setStatus('running')

    try {
      let response: any
      if (agentId) {
        response = await testAgent.mutateAsync({ id: agentId, test_input: userText })
      } else if (promptId) {
        response = await testPrompt.mutateAsync({ prompt_id: promptId, test_input: userText })
      } else {
        toast.error('Select an agent or prompt first')
        setStatus('idle')
        return
      }

      const aiText = response.data?.response || response.data?.text || response.data?.message || JSON.stringify(response.data)
      setMessages(prev => [...prev, { role: 'ai', text: aiText }])
      setStatus('complete')
    } catch (err: any) {
      const errMsg = err.message || 'Simulation failed'
      setMessages(prev => [...prev, { role: 'ai', text: `Error: ${errMsg}` }])
      setStatus('complete')
    }
  }

  function handleClear() {
    setMessages([])
    setStatus('idle')
  }

  async function handleStartSimulation() {
    if (!agentId && !promptId) {
      toast.error('Select an agent or prompt')
      return
    }
    const greeting = `Hello! I'm simulating a call with ${contact?.name || 'this contact'}. How can I help you?`
    setMessages([{ role: 'ai', text: greeting }])
    setStatus('complete')
  }

  if (!contactId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <Phone className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold">Select a contact to simulate</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Navigate to a contact from the CRM or Campaigns page and click Simulate to test your agent.
        </p>
      </div>
    )
  }

  if (contactLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Voice Simulation</h1>
        <p className="text-muted-foreground mt-1 text-sm">Test your agent against a contact in real-time.</p>
      </div>

      {contact && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{contact.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{contact.phone}</span>
              </div>
              {contact.campaign?.name && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{contact.campaign.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <Select
          label="Agent"
          options={[{ value: '', label: 'Select agent...' }, ...agents.map(a => ({ value: a.id, label: a.name }))]}
          value={agentId}
          onChange={e => setAgentId(e.target.value)}
          className="flex-1"
        />
        <Select
          label="Prompt"
          options={[{ value: '', label: 'Select prompt...' }, ...prompts.map(p => ({ value: p.id, label: p.name }))]}
          value={promptId}
          onChange={e => setPromptId(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleStartSimulation}>
          <Play className="h-4 w-4 mr-2" />
          Start Simulation
        </Button>
      </div>

      <Card className="flex flex-col h-[500px]">
        <CardHeader className="border-b pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Conversation</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={status === 'running' ? 'warning' : status === 'complete' ? 'success' : 'default'}>
                {status === 'idle' ? 'Idle' : status === 'running' ? 'Running' : 'Complete'}
              </Badge>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Start a simulation to begin the conversation</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </CardContent>
        <div className="border-t p-4 shrink-0">
          <form onSubmit={e => { e.preventDefault(); handleSend() }} className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              disabled={testAgent.isPending || testPrompt.isPending}
            />
            <Button type="submit" disabled={!input.trim() || testAgent.isPending || testPrompt.isPending}>
              {testAgent.isPending || testPrompt.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
