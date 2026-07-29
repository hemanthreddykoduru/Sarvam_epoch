import { GoogleGenAI, Modality } from '@google/genai';
import { startMicCapture, stopMicCapture, playPCM24k } from './audioUtils';

export interface TranscriptEntry {
  speaker: 'ai' | 'customer';
  text: string;
  timestamp: number;
}

export interface CallState {
  status: 'idle' | 'connecting' | 'connected' | 'ending' | 'ended' | 'error';
  transcript: TranscriptEntry[];
  duration: number;
  error?: string;
}

type StateCallback = (state: CallState) => void;

export class GeminiLiveClient {
  private ai: GoogleGenAI | null = null;
  private session: any = null;
  private micStream: MediaStream | null = null;
  private micInterval: ReturnType<typeof setInterval> | null = null;
  private stateCallback: StateCallback;
  private _state: CallState = {
    status: 'idle',
    transcript: [],
    duration: 0,
  };
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private startedAt: number = 0;

  constructor(stateCallback: StateCallback) {
    this.stateCallback = stateCallback;
  }

  get state(): CallState {
    return { ...this._state };
  }

  async connect(token: string): Promise<void> {
    this.updateState({ status: 'connecting', transcript: [], duration: 0, error: undefined });

    try {
      this.ai = new GoogleGenAI({ apiKey: token, apiVersion: 'v1alpha' });

      this.session = await this.ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' },
            },
          },
        },
        callbacks: {
          onopen: () => {
            console.debug('[GeminiLive] Connected');
          },
          onmessage: (message: any) => {
            const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (text) {
              this.addTranscript('ai', text);
            }

            const inlineData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (inlineData) {
              try {
                const binaryString = atob(inlineData);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                playPCM24k(bytes.buffer);
              } catch (err) {
                console.warn('[GeminiLive] Audio decode error:', err);
              }
            }

            if (message.serverContent?.turnComplete) {
              console.debug('[GeminiLive] Turn complete');
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('[GeminiLive] Error:', e.message);
            this.updateState({ status: 'error', error: e.message });
          },
          onclose: (e: CloseEvent) => {
            console.debug('[GeminiLive] Closed:', e.reason);
            this.stop();
          },
        },
      });

      this.startedAt = Date.now();
      this.durationInterval = setInterval(() => {
        this.updateState({ duration: Math.floor((Date.now() - this.startedAt) / 1000) });
      }, 1000);

      this.micStream = await startMicCapture((chunk) => {
        if (this.session) {
          const base64 = btoa(String.fromCharCode(...new Uint8Array(chunk)));
          this.session.sendRealtimeInput({
            media: { data: base64, mimeType: 'audio/pcm;rate=16000' },
          });
        }
      });

      this.updateState({ status: 'connected' });
    } catch (error: any) {
      console.error('[GeminiLive] Connection failed:', error);
      this.updateState({ status: 'error', error: error.message || 'Failed to connect' });
      this.stop();
    }
  }

  async disconnect(): Promise<void> {
    this.updateState({ status: 'ending' });
    this.stop();
    this.updateState({ status: 'ended' });
  }

  private stop(): void {
    if (this.micStream) {
      stopMicCapture(this.micStream);
      this.micStream = null;
    }
    if (this.micInterval) {
      clearInterval(this.micInterval);
      this.micInterval = null;
    }
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
    if (this.session) {
      try { this.session.close(); } catch {}
      this.session = null;
    }
  }

  private addTranscript(speaker: 'ai' | 'customer', text: string): void {
    const entry: TranscriptEntry = { speaker, text, timestamp: Date.now() };
    this._state.transcript.push(entry);
    this.updateState({});
  }

  private updateState(partial: Partial<CallState>): void {
    this._state = { ...this._state, ...partial };
    this.stateCallback({ ...this._state });
  }
}
