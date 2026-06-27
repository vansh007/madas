"""MADAS — FastAPI backend with SSE streaming for real-time agent updates."""

import json
import asyncio
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from graph import build_diagnosis_graph, DiagnosisState
from rag.memory import get_memory_stats, get_recent_incidents
from utils.llm import provider_status


# ── Lifespan ──────────────────────────────────────────────────────────────────

diagnosis_graph = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global diagnosis_graph
    diagnosis_graph = build_diagnosis_graph()
    print("✓ MADAS diagnosis graph compiled")
    yield


app = FastAPI(
    title="MADAS",
    description="Multi-Agent Diagnosis for Application Systems",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────────────────────────

class DiagnoseRequest(BaseModel):
    input: str
    max_rounds: int = 1


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "madas", "providers": provider_status()}


@app.get("/providers")
def providers():
    """Live LLM provider status — which engine is configured, available, and was last used."""
    return provider_status()


@app.get("/memory/stats")
def memory_stats():
    return get_memory_stats()


@app.get("/memory/incidents")
def memory_incidents(limit: int = 10):
    """Recent past incidents from the FAISS-backed incident memory."""
    return {"incidents": get_recent_incidents(limit=limit)}


@app.post("/diagnose")
async def diagnose(request: DiagnoseRequest):
    """Run full diagnosis pipeline (non-streaming). Returns complete result."""
    if not request.input.strip():
        raise HTTPException(status_code=400, detail="Input cannot be empty")

    initial_state: DiagnosisState = {
        "user_input": request.input,
        "rag_context": "",
        "investigation": {},
        "engineering": {},
        "arbitration": {},
        "round": 1,
        "max_rounds": request.max_rounds,
        "final_result": {},
        "events": [],
    }

    try:
        result = await asyncio.to_thread(diagnosis_graph.invoke, initial_state)
        return {
            "success": True,
            "result": result["final_result"],
            "events": result["events"],
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/diagnose/stream")
async def diagnose_stream(request: DiagnoseRequest):
    """Run diagnosis with SSE streaming — sends events as agents complete."""
    if not request.input.strip():
        raise HTTPException(status_code=400, detail="Input cannot be empty")

    initial_state: DiagnosisState = {
        "user_input": request.input,
        "rag_context": "",
        "investigation": {},
        "engineering": {},
        "arbitration": {},
        "round": 1,
        "max_rounds": request.max_rounds,
        "final_result": {},
        "events": [],
    }

    async def event_generator():
        final_result = {}
        try:
            # Stream node-by-node using LangGraph's stream. Each chunk maps a
            # finished node name to its output; we relay the newest event to the UI.
            for chunk in diagnosis_graph.stream(initial_state):
                for node_name, node_output in chunk.items():
                    if node_output.get("final_result"):
                        final_result = node_output["final_result"]
                    events = node_output.get("events", [])
                    if events:
                        latest = events[-1]
                        yield {
                            "event": latest["agent"],
                            "data": json.dumps(latest),
                        }
                    # Small delay so the UI can animate each step.
                    await asyncio.sleep(0.1)

            # Send completion signal with the full result payload.
            yield {
                "event": "complete",
                "data": json.dumps({"status": "done", "result": final_result}),
            }
        except Exception as e:
            traceback.print_exc()
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }

    return EventSourceResponse(event_generator())


# ── Entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
