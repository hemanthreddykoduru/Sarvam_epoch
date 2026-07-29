import axios from 'axios';
import { logger } from '../utils/logger.js';

export interface SarvamTTSOptions {
  text: string;
  targetLanguageCode?: string;
  speaker?: string;
  model?: 'bulbul:v3' | 'bulbul:v2' | 'bulbul:v3-beta';
  pace?: number;
  sampleRate?: number;
}

export interface SarvamTTSResult {
  audioBase64: string;
  format: 'wav';
  sampleRate: number;
  speaker: string;
}

const SARVAM_API_URL = 'https://api.sarvam.ai/text-to-speech';

/**
 * Generate speech from text using Sarvam AI Bulbul TTS API
 */
export async function generateSarvamTTS(options: SarvamTTSOptions): Promise<SarvamTTSResult> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new Error('SARVAM_API_KEY is not configured in backend environment variables.');
  }

  const speaker = options.speaker || 'kavya';
  const model = options.model || 'bulbul:v3';
  const targetLanguageCode = options.targetLanguageCode || 'te-IN';
  const pace = options.pace ?? 1.0;
  const sampleRate = options.sampleRate || 24000;

  const payload: any = {
    inputs: [options.text],
    target_language_code: targetLanguageCode,
    speaker: speaker,
    pace: pace,
    speech_sample_rate: sampleRate,
    enable_preprocessing: true,
    model: model,
  };

  // If using bulbul:v2, pitch and loudness can be optionally supported
  if (model === 'bulbul:v2') {
    payload.pitch = 0;
    payload.loudness = 1.5;
  }

  try {
    const response = await axios.post(SARVAM_API_URL, payload, {
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json',
      },
      // a hung request would otherwise hold the handler open indefinitely
      timeout: 30000,
    });

    if (response.data && response.data.audios && response.data.audios.length > 0) {
      return {
        audioBase64: response.data.audios[0],
        format: 'wav',
        sampleRate: sampleRate,
        speaker: speaker,
      };
    }

    throw new Error('Sarvam AI API returned empty audio response.');
  } catch (error: any) {
    const status = error.response?.status;
    const detail = error.response?.data?.error?.message || error.message || 'Unknown Sarvam AI error';

    // Distinct causes need distinct messages — otherwise an expired key, a rate limit and an
    // outage all read the same and nobody knows which one to act on.
    // Deliberately NOT auto-retried: every retry is a billed synthesis, so the caller decides.
    // Sarvam returns 403 (not 401) for auth failures. bulbul:v3 is 30 req/min on the Starter plan.
    const message =
      status === 403 ? 'Sarvam rejected the API key (check SARVAM_API_KEY)'
      : status === 429 ? 'Sarvam rate limit reached — wait a moment and try again'
      : status === 503 ? 'Sarvam is temporarily unavailable — try again shortly'
      : detail;

    logger.error('Sarvam TTS failed', { status, speaker, model, detail });
    throw new Error(`Sarvam AI TTS synthesis failed: ${message}`);
  }
}
