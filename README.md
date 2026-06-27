# MADAS — Multi-Agent Diagnosis for Application Systems

A multi-agent AI system where specialized agents collaboratively diagnose backend
incidents, debate solutions, score them, and deliver a high-confidence fix with a
ready-to-share postmortem — orchestrated with **LangGraph** and powered by **either
a cloud model (Google Gemini) or a fully local model (Ollama)** with automatic failover.

## Why it's interesting

- **Genuinely agentic** — four role-specialized agents pass a shared state through a
  LangGraph pipeline, and the Arbiter can send the case *back* for another round of
  investigation when confidence is low (a real debate loop, not a single prompt).
- **Provider-resilient** — set `LLM_PROVIDER=auto` and the system tries Gemini first,
  then transparently falls back to a local Ollama model. No cloud key? It runs entirely
  offline on your machine.
- **Has a memory** — every diagnosis is embedded and stored in a FAISS index, so similar
  past incidents are retrieved as context for new ones (RAG).
- **Real-time UI** — the frontend consumes a Server-Sent-Events stream, so you watch each
  agent work live rather than staring at a spinner.

## Architecture

```
User Input (error logs, traces, stack traces)
        ↓
  ┌──────────────┐
  │ Memory (RAG) │  → Retrieves similar past incidents from a FAISS index
  └──────┬───────┘
         ↓
  ┌──────────────┐
  │ Investigator │  → Parses logs, forms ranked, evidence-cited hypotheses
  └──────┬───────┘
         ↓
  ┌──────────────┐
  │  Engineer    │  → Proposes a concrete fix (code/config) per hypothesis
  └──────┬───────┘
         ↓
  ┌──────────────┐
  │   Arbiter    │  → Scores (hypothesis, fix) pairs on evidence, completeness, risk
  └──────┬───────┘
         ↓
   needs another round?  ──yes──▶ back to Investigator (with critique)
         │ no
         ↓
  ┌──────────────┐
  │  Reporter    │  → Severity, tags, TL;DR, and a Markdown postmortem
  └──────┬───────┘
         ↓
   Final Diagnosis + Fix + Confidence + Postmortem (stored to memory)
```

Every node is powered by `utils/llm.py`, a single LLM layer with multi-provider failover.

## Tech Stack

| Layer         | Tech                                         |
|---------------|----------------------------------------------|
| Orchestration | LangGraph (stateful multi-agent graph)       |
| LLM           | Google Gemini **or** local Ollama (failover) |
| RAG           | FAISS + sentence-transformers                |
| Backend       | FastAPI + SSE streaming                      |
| Frontend      | React + Vite + Tailwind + Framer Motion      |

## Prerequisites

- Python 3.10+
- Node.js 18+
- **One of:** a Google Gemini API key, **or** [Ollama](https://ollama.com) installed locally

## Quick Start

### 1. Choose your LLM engine

**Option A — Local (no API key, fully offline):**

```bash
ollama pull qwen2.5:7b      # one-time download (~4.7GB)
```

Then in `backend/.env`:

```bash
LLM_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5:7b
```

**Option B — Cloud (Gemini):**

```bash
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-2.0-flash-lite
```

**Option C — Auto (recommended):** try Gemini, fall back to Ollama automatically.

```bash
LLM_PROVIDER=auto
GEMINI_API_KEY=your-key-here   # optional; omit to go local-only
OLLAMA_MODEL=qwen2.5:7b
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # macOS/Linux
pip install -r requirements.txt
python main.py
```

Backend runs at `http://localhost:8000`. Check `GET /providers` to see which engine is live.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. The navbar shows the active engine (Gemini / Ollama)
in real time.

## API

| Endpoint                 | Method | Description                                            |
|--------------------------|--------|--------------------------------------------------------|
| `/diagnose`              | POST   | Run the full pipeline, return the complete result      |
| `/diagnose/stream`       | POST   | Same, but stream agent events live over SSE            |
| `/providers`             | GET    | Live LLM provider status (configured/available/last)   |
| `/health`                | GET    | Service + provider health                              |
| `/memory/stats`          | GET    | Incident-memory size                                   |
| `/memory/incidents`      | GET    | Recent stored incidents                                |

## Project Structure

```
madas/
├── backend/
│   ├── agents/           # Investigator, Engineer, Arbiter, Reporter
│   ├── rag/              # FAISS index + incident memory
│   ├── utils/
│   │   └── llm.py        # Unified multi-provider LLM layer (Gemini ↔ Ollama)
│   ├── graph.py          # LangGraph pipeline
│   ├── main.py           # FastAPI entrypoint
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # SSE streaming + provider state
│   │   └── App.jsx
│   └── package.json
└── README.md
```
