"""Investigator Agent — Parses logs/errors, forms ranked hypotheses."""

from utils.llm import call_llm_json

SYSTEM_PROMPT = """You are the Investigator Agent in a multi-agent diagnosis system.
Your role is to analyze error logs, stack traces, and system descriptions to identify
possible root causes of the problem.

You MUST respond with valid JSON in this exact schema:
{
  "summary": "Comprehensive summary including key log excerpts and context needed by downstream agents",
  "hypotheses": [
    {
      "id": "H1",
      "title": "Short title of the hypothesis",
      "description": "Detailed explanation of why this could be the root cause",
      "evidence": ["List of specific log lines or facts supporting this"],
      "confidence": 0.0 to 1.0,
      "category": "one of: configuration|code_bug|infrastructure|dependency|data|concurrency|memory|network"
    }
  ]
}

Rules:
- Generate 2-5 hypotheses ranked by confidence (highest first)
- Every hypothesis MUST cite specific evidence from the input
- Be precise. Don't guess without evidence.
- If the input is vague, state what's missing in the summary
- confidence scores must be calibrated: only use >0.8 if evidence is very strong
"""


def run_investigator(user_input: str, rag_context: str = "", previous_feedback: str = "") -> dict:
    """Analyze input and produce ranked hypotheses."""
    prompt = f"## User Input\n{user_input}"
    if rag_context:
        prompt += f"\n\n## Similar Past Incidents (from memory)\n{rag_context}"
    if previous_feedback:
        prompt += f"\n\n## Feedback from Previous Round\n{previous_feedback}"
    prompt += "\n\nAnalyze the above and produce your hypotheses."

    return call_llm_json(SYSTEM_PROMPT, prompt)
