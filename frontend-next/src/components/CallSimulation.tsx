import { useState, useEffect, useRef, useCallback } from 'react';
import { GeminiLiveClient, type CallState, type TranscriptEntry } from '@/lib/geminiLive';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Phone, PhoneOff, Loader2, Mic, MicOff, Bot, User } from 'lucide-react';

interface CallSimulationProps {
  contactId: string;
  contactName: string;
  contactPhone: string;
  campaignId: string;
  campaignName: string;
  apiBaseUrl: string;
  authToken: string;
  onCallEnd: (data: {
    transcript: TranscriptEntry[];
    duration: number;
    callId: string;
  }) => void;
  onClose: () => void;
}

export function CallSimulation({
  contactId,
  contactName,
  contactPhone,
  campaignId,
  campaignName,
  apiBaseUrl,
  authToken,
  onCallEnd,
  onClose,
}: CallSimulationProps) {
  const [callState, setCallState] = useState<CallState>({
    status: 'idle',
    transcript: [],
    duration: 0,
  });
  const [callId, setCallId] = useState<string | null>(null);
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [callState.transcript]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startCall = useCallback(async () => {
    try {
      setCallState({ status: 'connecting', transcript: [], duration: 0 });

      const callRes = await fetch(`${apiBaseUrl}/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          contact_id: contactId,
          direction: 'browser',
        }),
      });
      const callData = await callRes.json();
      if (callData.error) throw new Error(callData.error);
      setCallId(callData.data?.id);

      const tokenRes = await fetch(`${apiBaseUrl}/gemini/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({}),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error);

      const client = new GeminiLiveClient((state) => {
        setCallState((prev) => ({ ...prev, ...state }));
      });
      clientRef.current = client;

      await client.connect(tokenData.data.name);
    } catch (error: any) {
      setCallState((prev) => ({
        ...prev,
        status: 'error',
        error: error.message || 'Failed to start call',
      }));
    }
  }, [contactId, campaignId, apiBaseUrl, authToken]);

  const endCall = useCallback(async () => {
    const client = clientRef.current;
    if (client) {
      await client.disconnect();
    }

    const finalState = client?.state || callState;

    if (callId) {
      try {
        await fetch(`${apiBaseUrl}/calls/${callId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            transcript: finalState.transcript.map((t) => ({
              role: t.speaker,
              text: t.text,
              timestamp: new Date(t.timestamp).toISOString(),
            })),
            duration_seconds: finalState.duration,
            status: 'completed',
            ended_at: new Date().toISOString(),
          }),
        });

        fetch(`${apiBaseUrl}/calls/${callId}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ transcript: finalState.transcript }),
        }).catch(() => {});
      } catch {}
    }

    onCallEnd({
      transcript: finalState.transcript,
      duration: finalState.duration,
      callId: callId || '',
    });
  }, [callId, callState, apiBaseUrl, authToken, onCallEnd]);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  const isConnected = callState.status === 'connected';
  const isConnecting = callState.status === 'connecting';
  const isEnded = callState.status === 'ended' || callState.status === 'ending';
  const isError = callState.status === 'error';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Call Simulation</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {contactName} • {String(contactPhone)}
          </p>
        </div>
        <Badge variant={
          isConnected ? 'success' :
          isConnecting ? 'warning' :
          isError ? 'danger' :
          isEnded ? 'info' : 'default'
        }>
          {isConnected ? 'Connected' :
           isConnecting ? 'Connecting...' :
           isError ? 'Error' :
           isEnded ? 'Ended' : 'Ready'}
        </Badge>
      </div>

      {/* Audio Visualization Area */}
      <div className="flex flex-col items-center justify-center py-8 px-4">
        {isConnected && (
          <div className="flex items-center gap-1 mb-4">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-green-500 rounded-full animate-pulse"
                style={{
                  height: `${16 + Math.random() * 24}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${0.4 + Math.random() * 0.4}s`,
                }}
              />
            ))}
          </div>
        )}

        {isConnecting && (
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        )}

        <div className="text-center">
          {isConnected && (
            <p className="text-2xl font-mono text-green-600 dark:text-green-400">
              {formatDuration(callState.duration)}
            </p>
          )}
          {isConnecting && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Establishing connection...</p>
          )}
          {isError && (
            <p className="text-sm text-red-500">{callState.error}</p>
          )}
          {isEnded && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Call ended • {formatDuration(callState.duration)}
            </p>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Transcript</h4>
        <div className="space-y-2">
          {callState.transcript.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              {isConnected ? 'Waiting for conversation...' : 'Transcript will appear here'}
            </p>
          )}
          {callState.transcript.map((entry, i) => (
            <div
              key={i}
              className={`flex ${entry.speaker === 'ai' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                  entry.speaker === 'ai'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                <span className="text-xs font-medium opacity-60">
                  {entry.speaker === 'ai'
                    ? <span className="inline-flex items-center gap-1"><Bot className="h-3 w-3" /> AI</span>
                    : <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {contactName.split(' ')[0]}</span>}
                </span>
                <p className="mt-0.5">{entry.text}</p>
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-4 py-4 border-t border-gray-200 dark:border-gray-700">
        {!isConnected && !isConnecting && !isEnded && (
          <Button onClick={startCall} className="bg-green-600 hover:bg-green-700 text-white px-8">
            <Phone className="w-4 h-4 mr-2" />
            Start Call
          </Button>
        )}

        {isConnecting && (
          <Button disabled variant="outline">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connecting...
          </Button>
        )}

        {isConnected && (
          <Button onClick={endCall} variant="destructive" className="px-8">
            <PhoneOff className="w-4 h-4 mr-2" />
            End Call
          </Button>
        )}

        {(isEnded || isError) && (
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
