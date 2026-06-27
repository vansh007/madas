"""Reporter Agent — turns the final diagnosis into a shareable incident report.

Produces a severity assessment plus a clean Markdown postmortem that can be
pasted into Slack, a ticket, or a wiki. This is the "last mile" of the pipeline:
the other agents decide *what* is wrong and *how* to fix it; the Reporter makes
it presentable.
"""

from utils.llm import call_llm_json

SYSTEM_PROMPT = """You are the Reporter Agent in a multi-agent incident-diagnosis system.
You receive the final, arbitrated diagnosis (winning root cause, the chosen fix,
and the supporting analysis) and turn it into a concise incident report.

You MUST respond with valid JSON in this exact schema:
{
  "severity": "SEV1|SEV2|SEV3|SEV4",
  "severity_reason": "One sentence justifying the severity level",
  "title": "A short, specific incident title (e.g. 'Inventory service timeout cascades to order failures')",
  "tags": ["3-5 short lowercase tags, e.g. timeout, database, memory-leak"],
  "tldr": "2-3 sentence executive summary a manager could read",
  "postmortem_markdown": "A complete Markdown incident report (see structure below)"
}

Severity guide:
- SEV1: critical, customer-facing outage or data loss
- SEV2: major degradation, significant user impact
- SEV3: minor/partial degradation, limited impact
- SEV4: low impact, internal or cosmetic

The postmortem_markdown MUST use this structure (real Markdown, with newlines):
## Summary
## Impact
## Root Cause
## Resolution
## Action Items
- [ ] ...

Rules:
- Be concrete and grounded in the provided diagnosis. Do not invent facts.
- Keep it tight and professional. No filler.
- Action items must be specific and actionable.
"""


def run_reporter(final_result: dict, original_input: str) -> dict:
    """Generate severity + a Markdown postmortem from the final diagnosis."""
    verdict = final_result.get("verdict", {})
    hyp = final_result.get("winning_hypothesis", {})
    fix = final_result.get("winning_fix", {})

    prompt = f"""## Original Incident Input
{original_input}

## Confirmed Root Cause
{hyp.get('title', 'Unknown')}: {hyp.get('description', '')}
Category: {hyp.get('category', 'n/a')}
Evidence: {', '.join(hyp.get('evidence', []))}

## Chosen Fix
{fix.get('fix_title', 'n/a')}: {fix.get('description', '')}
Risk: {fix.get('risk_level', 'n/a')} | Effort: {fix.get('effort', 'n/a')}

## Arbiter Verdict
Confidence: {verdict.get('overall_confidence', 0)}
Reasoning: {verdict.get('reasoning', '')}
Dissent: {verdict.get('dissent', 'none')}

Produce the incident report."""

    return call_llm_json(SYSTEM_PROMPT, prompt)
