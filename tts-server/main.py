import os
import io
import base64
import logging
import urllib.request
import json
import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="TeluguAI TTS Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
device = None
SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY", "")

class TTSRequest(BaseModel):
    text: str
    language: str = "te"
    speaker: Optional[str] = "anushka"
    provider: Optional[str] = "sarvam"  # 'sarvam' or 'indicf5'
    ref_audio: Optional[str] = None

class TTSResponse(BaseModel):
    audio: str
    sample_rate: int
    duration: float
    provider: str

@app.on_event("startup")
async def load_model():
    global model, device
    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Checking IndicF5 model on {device}...")

        from transformers import AutoModel
        model = AutoModel.from_pretrained("ai4bharat/IndicF5", trust_remote_code=True)
        model.to(device)
        model.eval()
        logger.info("IndicF5 model loaded successfully")
    except Exception as e:
        logger.warning(f"Could not load IndicF5 model: {e}")
        logger.info("Sarvam AI TTS is active and available as primary TTS provider.")
        model = None

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "sarvam_available": bool(SARVAM_API_KEY),
        "indicf5_model_loaded": model is not None,
        "device": device or "unknown"
    }

def synthesize_sarvam(text: str, speaker: str = "anushka", target_language_code: str = "te-IN") -> tuple[str, int]:
    if not SARVAM_API_KEY:
        raise ValueError("SARVAM_API_KEY is not configured")

    url = "https://api.sarvam.ai/text-to-speech"
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json"
    }

    # bulbul:v3 supported speakers include kavya, amartya, arvind, kaveri, maitreyi, pavithra
    # bulbul:v2 supported speakers include anushka, abhilash, manisha, vidya, arya, karun, hitesh
    model_name = "bulbul:v3" if speaker in ["kavya", "amartya", "arvind", "kaveri", "maitreyi", "pavithra"] else "bulbul:v2"

    payload = {
        "inputs": [text],
        "target_language_code": target_language_code,
        "speaker": speaker,
        "pace": 1.0,
        "speech_sample_rate": 24000,
        "enable_preprocessing": True,
        "model": model_name
    }

    if model_name == "bulbul:v2":
        payload["pitch"] = 0
        payload["loudness"] = 1.5

    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    with urllib.request.urlopen(req) as response:
        res_body = json.loads(response.read().decode('utf-8'))
        audio_b64 = res_body["audios"][0]
        return audio_b64, 24000

@app.post("/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest):
    provider = request.provider.lower() if request.provider else "sarvam"

    if provider == "sarvam" or model is None:
        try:
            logger.info(f"Synthesizing TTS via Sarvam AI (speaker: {request.speaker})...")
            audio_b64, sample_rate = synthesize_sarvam(
                text=request.text,
                speaker=request.speaker or "anushka",
                target_language_code="te-IN" if request.language == "te" else f"{request.language}-IN"
            )
            
            # Approximate duration from base64 size
            raw_bytes = len(base64.b64decode(audio_b64))
            duration = round(raw_bytes / (sample_rate * 2), 2)

            return TTSResponse(
                audio=audio_b64,
                sample_rate=sample_rate,
                duration=duration,
                provider="sarvam"
            )
        except Exception as e:
            logger.error(f"Sarvam AI TTS failed: {e}")
            if model is None:
                raise HTTPException(status_code=500, detail=f"Sarvam AI TTS failed: {str(e)}")

    # Fallback or explicit IndicF5
    try:
        import torch
        ref_audio = request.ref_audio or "prompts/PAN_F_HAPPY_00001.wav"
        ref_text = "తెలుగు భాష మాట్లాడే వ్యక్తుల కోసం ఈ సేవ రూపొందించబడింది."

        ref_audio_path = ref_audio if os.path.isabs(ref_audio) else os.path.join(
            os.path.dirname(__file__), "..", "..", "IndicF5", ref_audio
        )

        if not os.path.exists(ref_audio_path):
            alt_path = os.path.join(os.path.dirname(__file__), "..", "..", "IndicF5", "prompts", "PAN_F_HAPPY_00001.wav")
            if os.path.exists(alt_path):
                ref_audio_path = alt_path

        with torch.no_grad():
            audio = model(
                request.text,
                ref_audio_path=ref_audio_path,
                ref_text=ref_text,
            )

        if isinstance(audio, torch.Tensor):
            audio = audio.cpu().numpy()

        if audio.dtype == np.int16:
            audio = audio.astype(np.float32) / 32768.0

        audio = np.clip(audio, -1.0, 1.0)

        buffer = io.BytesIO()
        sf.write(buffer, audio, 24000, format='wav')
        audio_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

        duration = len(audio) / 24000

        return TTSResponse(
            audio=audio_base64,
            sample_rate=24000,
            duration=round(duration, 2),
            provider="indicf5"
        )
    except Exception as e:
        logger.error(f"IndicF5 TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
