"""LangGraph orchestration for the MADAS diagnosis pipeline."""

from __future__ import annotations
import os
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, END

from agents.investigator import run_investigator
from agents.engineer import run_engineer
from agents.arbiter import run_arbiter
from agents.reporter import run_reporter
from rag.memory import search_similar, store_incident


# ── State Schema ──────────────────────────────────────────────────────────────

class DiagnosisState(TypedDict):
    user_input: str
    rag_context: str
    investigation: dict
    engineering: dict
    arbitration: dict
    round: int
    max_rounds: int
    final_result: dict
    events: list  # Timeline of agent actions for the UI


# ── Node Functions ────────────────────────────────────────────────────────────

def rag_retrieval(state: DiagnosisState) -> dict:
    """Retrieve similar past incidents from memory.

    RAG is optional: set DISABLE_RAG=true to skip it entirely (useful on
    lightweight cloud hosts without the sentence-transformers/torch stack).
    Any failure here degrades gracefully — the pipeline continues without
    historical context rather than crashing the whole diagnosis.
    """
    if os.getenv("DISABLE_RAG", "").lower() in ("1", "true", "yes"):
        return {
            "rag_context": "",
            "events": state.get("events", []) + [{
                "agent": "memory",
                "action": "rag_retrieval",
                "detail": "Incident memory disabled",
                "data": {"incident_count": 0},
            }],
        }

    try:
        results = search_similar(state["user_input"], top_k=3)
    except Exception:
        results = []  # Embedder/index unavailable — proceed without memory.
    context = ""
    if results:
        for i, r in enumerate(results, 1):
            context += f"\n--- Past Incident {i} (similarity: {r['similarity']:.2f}) ---\n"
            context += f"Problem: {r['input_summary']}\n"
            v = r.get("diagnosis", {}).get("verdict", {})
            context += f"Root Cause: {v.get('winning_hypothesis', 'N/A')}\n"
            context += f"Reasoning: {v.get('reasoning', 'N/A')}\n"

    return {
        "rag_context": context,
        "events": state.get("events", []) + [{
            "agent": "memory",
            "action": "rag_retrieval",
            "detail": f"Found {len(results)} similar past incidents" if results else "No prior incidents found",
            "data": {"incident_count": len(results)},
        }],
    }


def investigate(state: DiagnosisState) -> dict:
    """Run the Investigator agent."""
    feedback = ""
    arb = state.get("arbitration", {})
    if arb and "evaluations" in arb:
        feedback = "Critique on previous round:\n"
        for eval_ in arb["evaluations"]:
            feedback += f"- {eval_.get('hypothesis_id')}: {eval_.get('critique')} (Suggestion: {eval_.get('suggestion')})\n"

    result = run_investigator(state["user_input"], state.get("rag_context", ""), feedback)
    
    # Defensive check: if the LLM returned anything other than a dict, wrap it.
    if not isinstance(result, dict):
        result = {"summary": f"Unexpected type returned by LLM: {type(result).__name__}", "hypotheses": result if isinstance(result, list) else []}
    
    return {
        "investigation": result,
        "events": state.get("events", []) + [{
            "agent": "investigator",
            "action": "analyze",
            "detail": f"Generated {len(result.get('hypotheses', []))} hypotheses",
            "data": result,
        }],
    }


def engineer_fixes(state: DiagnosisState) -> dict:
    """Run the Engineer agent."""
    hypotheses = state["investigation"].get("hypotheses", [])
    summary_context = state["investigation"].get("summary", state["user_input"])
    result = run_engineer(hypotheses, summary_context)
    
    # Defensive check
    if not isinstance(result, dict):
        result = {"fixes": result if isinstance(result, list) else []}

    return {
        "engineering": result,
        "events": state.get("events", []) + [{
            "agent": "engineer",
            "action": "propose_fixes",
            "detail": f"Proposed {len(result.get('fixes', []))} fixes",
            "data": result,
        }],
    }


def arbitrate(state: DiagnosisState) -> dict:
    """Run the Arbiter agent."""
    hypotheses = state["investigation"].get("hypotheses", [])
    fixes = state["engineering"].get("fixes", [])
    current_round = state.get("round", 1)
    summary_context = state["investigation"].get("summary", state["user_input"])
    result = run_arbiter(hypotheses, fixes, summary_context, current_round)
    
    # Defensive check
    if not isinstance(result, dict):
        result = {"evaluations": result if isinstance(result, list) else [], "verdict": {"winning_hypothesis": "", "overall_confidence": 0, "reasoning": "LLM returned invalid format."}}

    return {
        "arbitration": result,
        "round": current_round + 1,
        "events": state.get("events", []) + [{
            "agent": "arbiter",
            "action": f"evaluate_round_{current_round}",
            "detail": f"Verdict: {result.get('verdict', {}).get('winning_hypothesis', '?')} "
                      f"(confidence: {result.get('verdict', {}).get('overall_confidence', 0):.0%})",
            "data": result,
        }],
    }


def finalize(state: DiagnosisState) -> dict:
    """Compile the final result and store in incident memory."""
    arb = state["arbitration"]
    inv = state["investigation"]
    eng = state["engineering"]
    verdict = arb.get("verdict", {})

    # Find the winning hypothesis and fix
    winning_id = verdict.get("winning_hypothesis", "")
    winning_hyp = next(
        (h for h in inv.get("hypotheses", []) if h["id"] == winning_id),
        inv.get("hypotheses", [{}])[0] if inv.get("hypotheses") else {}
    )
    winning_fix = next(
        (f for f in eng.get("fixes", []) if f["hypothesis_id"] == winning_id),
        eng.get("fixes", [{}])[0] if eng.get("fixes") else {}
    )

    final = {
        "verdict": verdict,
        "winning_hypothesis": winning_hyp,
        "winning_fix": winning_fix,
        "all_hypotheses": inv.get("hypotheses", []),
        "all_fixes": eng.get("fixes", []),
        "evaluations": arb.get("evaluations", []),
        "investigation_summary": inv.get("summary", ""),
        "rounds_taken": state.get("round", 1),
    }

    return {
        "final_result": final,
        "events": state.get("events", []) + [{
            "agent": "system",
            "action": "finalize",
            "detail": f"Diagnosis converged — {verdict.get('overall_confidence', 0):.0%} confidence",
            "data": {},
        }],
    }


def report(state: DiagnosisState) -> dict:
    """Run the Reporter agent: severity + Markdown postmortem, then persist."""
    final = state["final_result"]

    try:
        rep = run_reporter(final, state["user_input"])
    except Exception:
        rep = {}  # The report is a nice-to-have; never fail the pipeline over it.

    if not isinstance(rep, dict):
        rep = {}

    final = {
        **final,
        "severity": rep.get("severity", ""),
        "severity_reason": rep.get("severity_reason", ""),
        "title": rep.get("title", ""),
        "tags": rep.get("tags", []),
        "tldr": rep.get("tldr", ""),
        "postmortem_markdown": rep.get("postmortem_markdown", ""),
    }

    # Store the enriched incident in memory for future retrieval.
    try:
        store_incident(state["user_input"], final)
    except Exception:
        pass  # Don't fail the pipeline if storage fails.

    sev = final.get("severity") or "?"
    return {
        "final_result": final,
        "events": state.get("events", []) + [{
            "agent": "reporter",
            "action": "generate_report",
            "detail": f"Report ready — severity {sev}" + (f": {final['title']}" if final.get("title") else ""),
            "data": {
                "severity": final.get("severity"),
                "title": final.get("title"),
                "tags": final.get("tags", []),
                "tldr": final.get("tldr"),
            },
        }],
    }


# ── Routing ───────────────────────────────────────────────────────────────────

def should_revise(state: DiagnosisState) -> Literal["investigate", "finalize"]:
    """Decide if we need another round of investigation."""
    arb = state.get("arbitration", {})
    current_round = state.get("round", 1)
    max_rounds = state.get("max_rounds", 2)

    if arb.get("needs_revision", False) and current_round <= max_rounds:
        return "investigate"
    return "finalize"


# ── Build Graph ───────────────────────────────────────────────────────────────

def build_diagnosis_graph() -> StateGraph:
    """Construct the LangGraph diagnosis pipeline."""
    graph = StateGraph(DiagnosisState)

    graph.add_node("rag_retrieval", rag_retrieval)
    graph.add_node("investigate", investigate)
    graph.add_node("engineer_fixes", engineer_fixes)
    graph.add_node("arbitrate", arbitrate)
    graph.add_node("finalize", finalize)
    graph.add_node("report", report)

    graph.set_entry_point("rag_retrieval")
    graph.add_edge("rag_retrieval", "investigate")
    graph.add_edge("investigate", "engineer_fixes")
    graph.add_edge("engineer_fixes", "arbitrate")
    graph.add_conditional_edges("arbitrate", should_revise)
    graph.add_edge("finalize", "report")
    graph.add_edge("report", END)

    return graph.compile()
