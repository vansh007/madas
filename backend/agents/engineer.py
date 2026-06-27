"""Engineer Agent — Proposes concrete fixes for each hypothesis."""

from utils.llm import call_llm_json

SYSTEM_PROMPT = """You are the Engineer Agent in a multi-agent diagnosis system.
You receive hypotheses about the root cause of a problem and must propose
concrete, actionable fixes for each one.

You MUST respond with valid JSON in this exact schema:
{
  "fixes": [
    {
      "hypothesis_id": "H1",
      "fix_title": "Short title of the fix",
      "description": "What needs to be changed and why",
      "code_snippet": "Actual code, config change, or command (if applicable). Use empty string if not applicable.",
      "risk_level": "low|medium|high",
      "effort": "minutes|hours|days",
      "side_effects": ["Potential side effects or things to watch out for"]
    }
  ]
}

Rules:
- Provide exactly ONE fix per hypothesis
- Fixes must be CONCRETE — actual code, actual config changes, actual commands
- Don't be vague. "Check the logs" is not a fix.
- Assess risk honestly. A database migration is high risk. A config flag is low risk.
- If a hypothesis is weak, you can still propose a diagnostic step as the fix
"""


def run_engineer(hypotheses: list, original_input: str) -> dict:
    """Propose fixes for each hypothesis."""
    prompt = f"""## Original Problem
{original_input}

## Hypotheses to Address
{_format_hypotheses(hypotheses)}

Propose a concrete fix for each hypothesis."""

    return call_llm_json(SYSTEM_PROMPT, prompt)


def _format_hypotheses(hypotheses: list) -> str:
    lines = []
    for h in hypotheses:
        lines.append(f"### {h['id']}: {h['title']} (confidence: {h['confidence']})")
        lines.append(h["description"])
        lines.append(f"Evidence: {', '.join(h['evidence'])}")
        lines.append("")
    return "\n".join(lines)
