# CLAUDE.md — Agent Guidelines & Project Instructions for TeluguAI Caller

> ⚠️ **CRITICAL API COST & CREDIT SAFETY RULE**
> **DO NOT MAKE UNNECESSARY CALLS TO THE SARVAM AI API.**
> API credits are limited and billing cost is high. Never run automated test loops, background polling, pre-fetching, or batch scripts calling Sarvam AI. Only invoke Sarvam AI TTS when explicitly requested by direct user interaction.

## 🚀 Commands & Development Workflow

### Frontend (`teluguai-caller/frontend`)
- **Dev Server:** `npm run dev` (Runs Vite on `http://localhost:5173`)
- **Build:** `npm run build` (Outputs to `dist/`)
- **Lint:** `npm run lint`

### Backend (`teluguai-caller/backend`)
- **Dev Server:** `npm run dev` (Runs tsx watcher on `http://localhost:3001`)
- **Build:** `npm run build` (Compiles TypeScript using `tsc` to `dist/`)
- **Start Production:** `npm start`

### TTS Microservice (`teluguai-caller/tts-server`)
- **Start FastAPI Server:** `python main.py` or `uvicorn main:app --reload --port 8000` (Runs on `http://localhost:8000`)
- **Install Dependencies:** `pip install -r requirements.txt`

---

## 🎨 Code Style & Architectural Patterns

### TypeScript & JavaScript Rules
1. **Explicit Type Annotations:** Avoid using `any` unless strictly necessary for dynamic database payloads. Use native TypeScript primitives (`string`, `number`, `boolean`).
2. **ES Modules:** Use ES module syntax (`import` / `export`). Always include `.js` extension when importing local files in backend TypeScript files (e.g., `import { adminClient } from '../lib/insforge.js';`).
3. **Async / Await Error Handling:** Always wrap asynchronous route handlers and service calls in `try / catch` blocks and return appropriate HTTP status codes (e.g., `400` for bad requests, `500` for server errors).

### Backend & InsForge BaaS Guidelines
1. **InsForge Client (`backend/src/lib/insforge.ts`)**:
   - Access database tables via `adminClient.database.from('table_name')`.
   - Inserts require array formatting: `.insert([{ ... }])` or `.insert({ ... })`.
   - Reference authenticated users using `req.userId` attached by `requireAuth` middleware.
2. **Environment Variables**:
   - Store API keys strictly in `.env`.
   - `SARVAM_API_KEY`: API key for Sarvam AI Bulbul TTS.
   - Never commit secret keys or tokens into Git repositories.

### Voice & TTS Architecture Guidelines
1. **Sarvam AI TTS Engine (`backend/src/services/sarvamService.ts`)**:
   - Primary provider for Telugu Text-to-Speech (`te-IN`).
   - Use `bulbul:v3` for speakers: `kavya`, `pavithra`, `maitreyi`, `arvind`, `amartya`, `kaveri`.
   - Use `bulbul:v2` for speaker: `anushka`.
   - **CRITICAL BILLING RULE:** Never trigger automated, polling, or background TTS synthesis calls. Only invoke Sarvam AI API upon explicit user-initiated actions in the UI.

2. **IndicF5 Fallback (`tts-server/main.py`)**:
   - Self-hosted Python service for local IndicF5 inference if Sarvam API is unreachable or explicitly requested as local fallback.

---

## 📁 Key File Index

- **Backend Entry:** [backend/src/index.ts](file:///Users/hemanthmacbook/Desktop/Voice/teluguai-caller/backend/src/index.ts)
- **Voice Routes:** [backend/src/routes/voices.ts](file:///Users/hemanthmacbook/Desktop/Voice/teluguai-caller/backend/src/routes/voices.ts)
- **Sarvam Service:** [backend/src/services/sarvamService.ts](file:///Users/hemanthmacbook/Desktop/Voice/teluguai-caller/backend/src/services/sarvamService.ts)
- **InsForge Config:** [AGENTS.md](file:///Users/hemanthmacbook/Desktop/Voice/teluguai-caller/AGENTS.md)
- **Project Overview:** [PROJECT.md](file:///Users/hemanthmacbook/Desktop/Voice/teluguai-caller/PROJECT.md)
- **TTS Server:** [tts-server/main.py](file:///Users/hemanthmacbook/Desktop/Voice/teluguai-caller/tts-server/main.py)
