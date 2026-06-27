"""Backward-compatible shim.

The LLM layer now lives in ``utils.llm`` and supports multiple providers with
automatic failover (Gemini → local Ollama). These aliases keep older imports
working.
"""

from utils.llm import call_llm as call_gemini, call_llm_json as call_gemini_json  # noqa: F401
