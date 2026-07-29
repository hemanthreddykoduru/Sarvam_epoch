# TeluguAI Caller (CallForge) — Comprehensive Architecture & System Documentation

> ⚠️ **CRITICAL API BILLING & CREDIT SAFETY DIRECTIVE**  
> **DO NOT MAKE UNNECESSARY CALLS TO THE SARVAM AI API.**  
> API credits are limited and billing costs are high. Agents, backend services, and automated tools must NEVER make test loops, background polling, pre-fetching, or unnecessary calls to Sarvam AI. Invoke Sarvam AI TTS ONLY upon explicit, manual user actions.

## 📌 Executive Overview

**TeluguAI Caller** (also known as **CallForge**) is an enterprise-grade, AI-driven Voice Agent and Outbound/Inbound Calling Platform tailored specifically for the **Telugu language** (`te-IN`). It enables businesses, organizations, and developers to automate voice calls, execute campaigns, manage customer contacts, process AI-driven conversations, and generate natural-sounding speech using state-of-the-art Text-to-Speech (TTS) engines.

---

## 🏗️ Architecture & Technology Stack

The application uses a modern multi-tier microservice architecture split into frontend, backend, database BaaS, and specialized TTS services:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          React Frontend (Vite)                          │
│         Tailwind CSS | Lucide Icons | Audio Player | Dashboard          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / REST API
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Node.js / Express Backend                        │
│          TypeScript | InsForge BaaS Client | Auth Middleware            │
└──────────┬─────────────────────────┬─────────────────────────┬──────────┘
           │                         │                         │
           ▼                         ▼                         ▼
┌──────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  InsForge BaaS (DB)  │  │   Sarvam AI Cloud   │  │   IndicF5 Local     │
│ Postgres DB | Auth   │  │   Bulbul V3 & V2    │  │   FastAPI Python    │
│ Realtime | Storage   │  │   Ultra-fast TTS    │  │   Fallback Engine   │
└──────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### Stack Components:
1. **Frontend (`/frontend`)**:
   - **Framework:** React 18 + Vite + TypeScript
   - **Styling:** Tailwind CSS + PostCSS
   - **Icons:** Lucide React
   - **Deployment:** Vercel / Static Hosting

2. **Backend (`/backend`)**:
   - **Runtime:** Node.js + Express + TypeScript
   - **BaaS / Database:** [InsForge](https://insforge.dev) (PostgreSQL, Managed Auth, Storage, Edge Functions)
   - **Services:** Contact Management, Campaign Engine, Call Analytics, Voice Library, Sarvam AI Integration

3. **Voice & TTS Engines**:
   - **Primary Cloud Provider:** **Sarvam AI (Bulbul V3 & V2)**
     - High-speed, natural Indian language TTS (`te-IN`).
     - Supported voices: *Kavya*, *Anushka*, *Pavithra*, *Maitreyi*, *Arvind*, *Amartya*, *Kaveri*.
   - **Local / Self-Hosted Fallback:** **IndicF5 (FastAPI Python Service)**
     - Located in `/tts-server` running on port `8000`.
     - Built on `ai4bharat/IndicF5` model with PyTorch.

---

## 📁 Repository Structure

```
teluguai-caller/
├── AGENTS.md                  # InsForge BaaS patterns & guidelines
├── PROJECT.md                 # Full project architecture & documentation
├── backend/                   # Node.js TypeScript API server
│   ├── src/
│   │   ├── index.ts           # Express App Entry Point
│   │   ├── lib/               # InsForge Client Initialization
│   │   ├── middleware/        # JWT Authentication Middleware
│   │   ├── providers/         # External AI Providers (Gemini, etc.)
│   │   ├── routes/            # Express API Routes (agents, calls, voices, etc.)
│   │   ├── services/          # Business logic & Sarvam AI TTS Service
│   │   └── utils/             # Helper utilities
│   ├── .env                   # Backend environment configuration
│   └── package.json
├── frontend/                  # React + Vite Web Dashboard
│   ├── src/                   # Dashboard components, pages, services
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── tts-server/                # Python FastAPI server for IndicF5 / Sarvam TTS
    ├── main.py                # FastAPI endpoints (/tts, /health)
    ├── requirements.txt
    └── Dockerfile
```

---

## ⚡ Core Features & Workflows

### 1. Voice Agent Configuration & Assignment
- Define AI callers with specific persona instructions, target language, and voice styles.
- Assign Sarvam AI Telugu voices (*Kavya*, *Anushka*, *Arvind*, etc.) or custom voices to agents.

### 2. Campaign Management & Contact Lists
- Upload and manage contact directories for outbound calls.
- Launch bulk calling campaigns with scheduled dispatching and automated tracking.

### 3. Voice Generation & TTS Pipeline
- **Primary Engine:** Requests are routed to **Sarvam AI TTS API** (`https://api.sarvam.ai/text-to-speech`) for ultra-low latency audio generation in Telugu (`te-IN`).
- **Cost Protection:** Audio synthesis is triggered **only on explicit user request** to preserve API credits.

### 4. Call Analytics & Transcripts
- Detailed logging of call duration, cost, sentiment, and complete conversation transcripts.

---

## 🛠️ Environment Setup & Configuration

### Backend Environment Variables (`backend/.env`):
```env
PORT=3001
NODE_ENV=development

# InsForge BaaS Credentials
INSFORGE_URL=https://3qxefbbq.us-east.insforge.app
INSFORGE_ANON_KEY=anon_119c7538b2e4e4dcc7d2658d31f93ffc97645f09b30fb614110a69850c34b9eb
INSFORGE_API_KEY=ik_b027b4c03e9d46af72e328c3ea472860
DATABASE_URL=postgresql://postgres:...@3qxefbbq.us-east.database.insforge.app:5432/insforge?sslmode=require

# Voice Engine Config
SARVAM_API_KEY=your_sarvam_api_key_here
TTS_SERVER_URL=http://localhost:8000

# Security
JWT_SECRET=teluguai-caller-jwt-secret
```

---

## 🚀 Running the Services Locally

1. **Start the Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   *(Runs on `http://localhost:5173`)*

2. **Start the Backend**:
   ```bash
   cd backend
   npm run dev
   ```
   *(Runs on `http://localhost:3001`)*

3. **Start the Local TTS Microservice (Optional / Fallback)**:
   ```bash
   cd tts-server
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python main.py
   ```
   *(Runs on `http://localhost:8000`)*

---

## 🛡️ Best Practices & Guidelines
- **API Billing Safety:** Do not automate or loop Sarvam AI TTS API requests. Only trigger synthesis upon direct user interaction.
- **Database Rules:** Database queries via InsForge follow array insert patterns (`insert([{ ... }])`) and strict Row-Level Security (RLS) bound to `auth.uid()`.
- **Environment Security:** Never commit `.env` files with secret production keys to source control.
