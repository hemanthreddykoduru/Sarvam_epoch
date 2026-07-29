import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, MoreVertical, Phone, Video, Send, Bot, MessageSquare, AlertCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { useTranscripts } from '@/hooks/useQueries'
import { formatDate } from '@/lib/utils'

// ponytail: no WhatsApp Business API is wired up, so threads are the real AI conversation
// transcripts from this account. Swap useTranscripts for a /whatsapp/threads endpoint once the
// Business API is connected under Integrations.
export function WhatsApp() {
  const { data: threads = [], isPending } = useTranscripts()
  const [activeId, setActiveId] = useState<string | null>(null)

  const activeChat = threads.find((t: any) => t.id === activeId) || threads[0]

  return (
    <div className="space-y-6 pb-10 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            WhatsApp Automation
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor autonomous AI conversations and step in when needed.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="warning" className="px-3 py-1">
            <AlertCircle className="h-3.5 w-3.5 mr-1.5" /> WhatsApp API not connected
          </Badge>
        </div>
      </div>

      <div className="flex-1 glass rounded-2xl border border-border/50 overflow-hidden flex">
        {/* Left Sidebar - Chat List */}
        <div className="w-80 border-r border-border/50 flex flex-col bg-card/30">
          <div className="p-4 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search chats..."
                className="w-full h-9 pl-9 pr-4 rounded-full bg-muted/40 border border-border/50 text-sm focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isPending ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2].map(i => <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />)}
              </div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No conversations yet.
              </div>
            ) : threads.map((chat: any) => {
              const last = chat.messages?.[chat.messages.length - 1]
              const needsHuman = chat.sentiment === 'negative'
              return (
                <div
                  key={chat.id}
                  onClick={() => setActiveId(chat.id)}
                  className={`p-4 border-b border-border/30 cursor-pointer transition-colors ${activeChat?.id === chat.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-white/5'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-sm">{chat.contact_name || 'Unknown'}</h3>
                    <span className="text-[10px] text-muted-foreground">{formatDate(chat.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-2">{last?.message || 'No messages'}</p>
                  <Badge variant="info" className={`text-[9px] uppercase px-1.5 py-0 ${needsHuman ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                    {needsHuman ? <AlertCircle className="h-3 w-3 mr-1 inline" /> : <Bot className="h-3 w-3 mr-1 inline" />}
                    {needsHuman ? 'Human Needed' : 'AI Handled'}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Area - Active Chat */}
        <div className="flex-1 flex flex-col bg-muted/40 relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

          {!activeChat ? (
            <EmptyState
              icon={MessageSquare}
              title="No conversation selected"
              description="Conversations appear once your AI handles a call."
            />
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-16 border-b border-border/50 px-6 flex items-center justify-between bg-card/40 z-10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold">
                    {(activeChat.contact_name || '?').charAt(0)}
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">{activeChat.contact_name || 'Unknown'}</h2>
                    <p className="text-xs text-muted-foreground">{activeChat.campaign_name || 'No campaign'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:text-primary"><Phone className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:text-primary"><Video className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:text-primary"><MoreVertical className="h-4 w-4" /></Button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 z-10">
                <div className="text-center mb-6">
                  <span className="text-xs bg-muted/40 text-muted-foreground px-3 py-1 rounded-full border border-border/50">
                    {formatDate(activeChat.created_at)}
                  </span>
                </div>

                {(activeChat.messages || []).map((msg: any) => {
                  const fromAI = msg.role === 'ai'
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg.id}
                      className={`flex flex-col max-w-[70%] ${fromAI ? 'self-end items-end ml-auto' : 'self-start items-start'}`}
                    >
                      <div className={`p-3 rounded-2xl ${
                        fromAI
                          ? 'bg-primary text-primary-foreground rounded-tr-none shadow-md shadow-primary/20'
                          : 'bg-card border border-border/50 rounded-tl-none shadow-sm'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        {fromAI && <Bot className="h-3 w-3 text-primary" />}
                        <span>{msg.timestamp_seconds != null ? `${msg.timestamp_seconds}s` : ''}</span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-card/40 border-t border-border/50 z-10">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled
                    placeholder="Connect the WhatsApp Business API under Integrations to reply"
                    className="flex-1 h-10 pl-4 pr-10 rounded-full bg-muted/40 border border-border/50 text-sm focus:outline-none disabled:opacity-60"
                  />
                  <Button disabled className="rounded-full h-10 w-10 p-0 bg-primary text-white shrink-0">
                    <Send className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <p className="text-[10px] text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" /> Showing real AI conversation transcripts from this account.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
