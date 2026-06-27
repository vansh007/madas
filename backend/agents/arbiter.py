"""Arbiter Agent — Evaluates (hypothesis, fix) pairs and produces final verdict."""

from utils.llm import call_llm_json

SYSTEM_PROMPT = """You are the Arbiter Agent in a multi-agent diagnosis system.
You evaluate pairs of (hypothesis, proposed fix) and render a structured verdict.

You MUST respond with valid JSON in this exact schema:
{
  "evaluations": [
    {
      "hypothesis_id": "H1",
      "evidence_score": 0.0 to 1.0,
      "fix_completeness": 0.0 to 1.0,
      "risk_score": 0.0 to 1.0,
      "critique": "What's wrong or weak about this pair",
      "suggestion": "How to improve (if needed)"
    }
  ],
  "verdict": {
    "winning_hypothesis": "H1",
    "overall_confidence": 0.0 to 1.0,
    "reasoning": "Why this hypothesis + fix is the best option",
    "dissent": "Any reservations or minority opinions"
  },
  "needs_revision": false
}

Scoring guide:
- evidence_score: How well does the log/trace data support this hypothesis?
- fix_completeness: Does the fix fully address the root cause or just a symptom?
- risk_score: 0 = very risky, 1 = very safe
- needs_revision: Set to true ONLY if the winning pair has evidence_score < 0.5 or fix_completeness < 0.5

Rules:
- Be harsh. Most hypotheses are mediocre. Say so.
- If no hypothesis has strong evidence, say so in the verdict.
- If the fix is a band-aid, call it out.
- overall_confidence = weighted average of the winning pair's three scores
"""


def run_arbiter(hypotheses: list, fixes: list, original_input: str, round_num: int = 1) -> dict:
    """Evaluate hypothesis-fix pairs and produce verdict."""
    prompt = f"""## Original Problem
{original_input}

## Round {round_num} Evaluation

## Hypotheses
{_format_hypotheses(hypotheses)}

## Proposed Fixes
{_format_fixes(fixes)}

Evaluate each (hypothesis, fix) pair and render your verdict."""

    return call_llm_json(SYSTEM_PROMPT, prompt)


def _format_hypotheses(hypotheses: list) -> str:
    lines = []
    for h in hypotheses:
        lines.append(f"### {h['id']}: {h['title']} (confidence: {h['confidence']})")
        lines.append(h["description"])
        lines.append(f"Evidence: {', '.join(h['evidence'])}")
        lines.append("")
    return "\n".join(lines)


def _format_fixes(fixes: list) -> str:
    lines = []
    for f in fixes:
        lines.append(f"### Fix for {f['hypothesis_id']}: {f['fix_title']}")
        lines.append(f["description"])
        if f.get("code_snippet"):
            lines.append(f"```\n{f['code_snippet']}\n```")
        lines.append(f"Risk: {f['risk_level']} | Effort: {f['effort']}")
        lines.append("")
    return "\n".join(lines)
