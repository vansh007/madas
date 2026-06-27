"""Unified LLM layer for MADAS.

Provides a single entrypoint (`call_llm`, `call_llm_json`) that the agents use,
with multi-provider support and automatic failover:

    LLM_PROVIDER=auto    → try Gemini, fall back to Ollama (local) on any error
    LLM_PROVIDER=gemini  → Gemini only
    LLM_PROVIDER=ollama  → local Ollama only (no API key needed)

This is the piece that makes the system robust: if the Gemini free tier is rate
limited or the key is missing, diagnoses keep working on a locally-hosted model.
"""

from __future__ import annotations

import os
import json
import time
import hashlib
import requests
from dotenv import load_dotenv

load_dotenv()

# ── Configuration ───────────────────────────────────────────────────────────

PROVIDER = os.getenv("LLM_PROVIDER", "auto").lower()       # auto | gemini | ollama
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-lite")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

MAX_INPUT_CHARS = 6000
MAX_OUTPUT_TOKENS = 2048

# Records which provider actually served the most recent call (for the UI).
LAST_PROVIDER_USED: str | None = None

# In-memory response cache — identical prompts won't hit a model twice.
_cache: dict[str, str] = {}


def _cache_key(system: str, user: str, mode: str) -> str:
    raw = f"{mode}|{PROVIDER}|{system[:300]}|{user[:800]}"
    return hashlib.sha256(raw.encode()).hexdigest()


def truncate_input(text: str) -> str:
    """Keep the head and tail of very long input, eliding the middle."""
    if len(text) <= MAX_INPUT_CHARS:
        return text
    half = MAX_INPUT_CHARS // 2
    return (
        text[:half]
        + f"\n\n... [{len(text) - MAX_INPUT_CHARS} chars truncated] ...\n\n"
        + text[-half:]
    )


# ── Provider availability ────────────────────────────────────────────────────

def gemini_available() -> bool:
    return bool(os.getenv("GEMINI_API_KEY"))


def ollama_available() -> bool:
    """True if a local Ollama server is reachable."""
    try:
        r = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=2)
        return r.status_code == 200
    except requests.RequestException:
        return False


def ollama_models() -> list[str]:
    try:
        r = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=2)
        r.raise_for_status()
        return [m["name"] for m in r.json().get("models", [])]
    except requests.RequestException:
        return []


def provider_status() -> dict:
    """Snapshot of provider health for the /providers endpoint and the UI."""
    models = ollama_models()
    ollama_ready = bool(models)
    return {
        "configured": PROVIDER,
        "last_used": LAST_PROVIDER_USED,
        "gemini": {
            "available": gemini_available(),
            "model": GEMINI_MODEL,
        },
        "ollama": {
            "available": ollama_available(),
            "ready": ollama_ready,            # reachable AND has a usable model
            "host": OLLAMA_HOST,
            "model": OLLAMA_MODEL,
            "model_present": OLLAMA_MODEL in models or any(
                m.split(":")[0] == OLLAMA_MODEL.split(":")[0] for m in models
            ),
            "models": models,
        },
    }


# ── Gemini provider ───────────────────────────────────────────────────────────

def _call_gemini(system_prompt: str, user_prompt: str, want_json: bool) -> str:
    import google.generativeai as genai

    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    config = {
        "temperature": 0.2 if want_json else 0.3,
        "max_output_tokens": MAX_OUTPUT_TOKENS,
    }
    if want_json:
        config["response_mime_type"] = "application/json"

    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        generation_config=genai.GenerationConfig(**config),
    )
    response = model.start_chat(history=[]).send_message(
        f"<s>\n{system_prompt}\n</s>\n\n{user_prompt}"
    )
    return response.text


# ── Ollama provider ─────────────────────────────────────────────────────────

def _call_ollama(system_prompt: str, user_prompt: str, want_json: bool) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
        "options": {
            "temperature": 0.2 if want_json else 0.3,
            "num_predict": MAX_OUTPUT_TOKENS,
        },
    }
    if want_json:
        payload["format"] = "json"

    r = requests.post(f"{OLLAMA_HOST}/api/chat", json=payload, timeout=180)
    r.raise_for_status()
    return r.json()["message"]["content"]


# ── Orchestration ─────────────────────────────────────────────────────────────

def _provider_order() -> list[str]:
    """Which providers to try, in order, based on config + availability."""
    if PROVIDER == "gemini":
        return ["gemini"]
    if PROVIDER == "ollama":
        return ["ollama"]
    # auto: prefer Gemini if a key exists, always keep Ollama as the safety net.
    order = []
    if gemini_available():
        order.append("gemini")
    order.append("ollama")
    return order


def _dispatch(system_prompt: str, user_prompt: str, want_json: bool) -> str:
    global LAST_PROVIDER_USED
    errors = []
    for name in _provider_order():
        try:
            fn = _call_gemini if name == "gemini" else _call_ollama
            text = fn(system_prompt, user_prompt, want_json)
            LAST_PROVIDER_USED = name
            return text
        except Exception as e:  # noqa: BLE001 — we intentionally fall through
            errors.append(f"{name}: {e}")
            continue
    raise RuntimeError(
        "All LLM providers failed. "
        + " | ".join(errors)
        + " — Set up a local model with `ollama pull "
        + OLLAMA_MODEL
        + "` or provide a valid GEMINI_API_KEY."
    )


def call_llm(system_prompt: str, user_prompt: str) -> str:
    user_prompt = truncate_input(user_prompt)
    key = _cache_key(system_prompt, user_prompt, "text")
    if key in _cache:
        return _cache[key]
    text = _dispatch(system_prompt, user_prompt, want_json=False)
    _cache[key] = text
    return text


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
    return text.strip()


def call_llm_json(system_prompt: str, user_prompt: str) -> dict:
    user_prompt = truncate_input(user_prompt)
    key = _cache_key(system_prompt, user_prompt, "json")
    if key in _cache:
        try:
            return json.loads(_cache[key])
        except json.JSONDecodeError:
            pass

    text = _strip_code_fence(_dispatch(system_prompt, user_prompt, want_json=True))
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        # Last resort: salvage the largest {...} block (some local models add prose).
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1 and end > start:
            parsed = json.loads(text[start : end + 1])
        else:
            raise
    _cache[key] = json.dumps(parsed)
    return parsed
