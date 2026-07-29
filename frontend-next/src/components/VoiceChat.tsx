import React, { useRef, useState, useEffect } from 'react';
import {
  ConversationAgent,
  BrowserAudioInterface,
  InteractionType,
  AgentState,
} from 'sarvam-conv-ai-sdk/browser';
import { Button } from '@/components/ui/Button';
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-react';

interface VoiceChatProps {
  agentId: string;
  customerName: string;
}

const ORG_ID = '019eea56-3b7e-77e7-ab3c-c67bcc1bc778';
const WORKSPACE_ID = '019eea56-3b83-7794-a286-16c986b2e895';

export function VoiceChat({ agentId, customerName }: VoiceChatProps) {
  const [state, setState] = useState<AgentState>(AgentState.IDLE);
  const [isMuted, setIsMuted] = useState(false);
  const agentRef = useRef<ConversationAgent | null>(null);

  useEffect(() => {
    return () => {
      agentRef.current?.stop().catch(console.error);
    };
  }, []);

  const startConversation = async () => {
    try {
      const audioInterface = new BrowserAudioInterface(16000, {});

      // The API key never reaches the browser: the SDK's one authenticated request (the signed
      // URL) is proxied by our backend, which injects the key. Our own JWT rides on customHeaders
      // so the proxy stays authenticated. See backend routes/sarvam.ts -> /app-runtime/.../url
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
      const token = localStorage.getItem('insforge_access_token');

      const agent = new ConversationAgent({
        apiKey: '',
        baseUrl: `${apiBase}/api/sarvam/app-runtime/`,
        customHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        config: {
          org_id: ORG_ID,
          workspace_id: WORKSPACE_ID,
          app_id: agentId,
          user_identifier: customerName,
          user_identifier_type: 'custom',
          interaction_type: InteractionType.CALL,
          input_sample_rate: 16000,
          output_sample_rate: 16000,
        },
        audioInterface,
        stateCallback: (newState) => setState(newState),
        transcriptCallback: async (msg) => {
          console.log(`${msg.role === 'user' ? 'You' : 'Agent'}: ${msg.content}`);
        },
        endCallback: async () => {
          agentRef.current = null;
          setState(AgentState.IDLE);
        },
      });

      agentRef.current = agent;
      await agent.start();
    } catch (error) {
      console.error("Failed to start conversation:", error);
      alert("Microphone permission denied or error starting call.");
    }
  };

  const toggleMute = () => {
    if (!agentRef.current) return;
    if (agentRef.current.isMuted()) {
      agentRef.current.unmute();
      setIsMuted(false);
    } else {
      agentRef.current.mute();
      setIsMuted(true);
    }
  };

  const stopConversation = () => {
    agentRef.current?.stop();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 border rounded-xl bg-card">
      <div className="flex items-center justify-between w-full">
        <div>
          <h3 className="font-semibold text-lg">In-Browser Call</h3>
          <p className="text-sm text-muted-foreground">Status: {state}</p>
        </div>
        {state === AgentState.CONNECTING && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
      </div>
      
      <div className="flex items-center gap-3 w-full mt-2">
        {state === AgentState.IDLE ? (
          <Button onClick={startConversation} className="flex-1 gap-2">
            <Phone className="h-4 w-4" /> Start Call
          </Button>
        ) : (
          <Button variant="destructive" onClick={stopConversation} className="flex-1 gap-2">
            <PhoneOff className="h-4 w-4" /> End Call
          </Button>
        )}
        
        <Button 
          variant="outline" 
          onClick={toggleMute} 
          disabled={state === AgentState.IDLE}
          className="px-3"
        >
          {isMuted ? <MicOff className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
