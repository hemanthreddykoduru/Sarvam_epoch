export interface AudioChunk {
  data: ArrayBuffer;
  sampleRate: number;
}

let audioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export async function startMicCapture(
  onAudioChunk: (chunk: ArrayBuffer) => void,
  targetSampleRate = 16000
): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const ctx = getAudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (event) => {
    const inputData = event.inputBuffer.getChannelData(0);
    const resampled = resampleAudio(inputData, ctx.sampleRate, targetSampleRate);
    const pcm16 = float32ToInt16(resampled);
    onAudioChunk(pcm16.buffer as ArrayBuffer);
  };

  source.connect(processor);
  processor.connect(ctx.destination);

  (stream as any).__processor = processor;
  (stream as any).__source = source;

  return stream;
}

export function stopMicCapture(stream: MediaStream): void {
  const processor = (stream as any).__processor;
  const source = (stream as any).__source;
  if (processor) processor.disconnect();
  if (source) source.disconnect();
  stream.getTracks().forEach((track) => track.stop());
}

export function playPCM24k(data: ArrayBuffer): void {
  const ctx = getAudioContext();
  const int16Data = new Int16Array(data);
  const float32Data = int16ToFloat32(int16Data);

  const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
  audioBuffer.getChannelData(0).set(float32Data);

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);
  source.start();
}

function resampleAudio(
  inputData: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array {
  if (inputSampleRate === outputSampleRate) return inputData;
  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(inputData.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIdx = i * ratio;
    const idx = Math.floor(srcIdx);
    const frac = srcIdx - idx;
    result[i] = inputData[idx] * (1 - frac) + (inputData[idx + 1] || 0) * frac;
  }
  return result;
}

function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

function int16ToFloat32(int16: Int16Array): Float32Array {
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
  }
  return float32;
}
