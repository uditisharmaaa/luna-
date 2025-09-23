"""
DeepSeek enrichment utilities (final).
- Loads .env FIRST, then reads env vars (robust regardless of CWD).
- Accepts JSON even if the model wraps it in ```json ...``` fences.
- Gives clear errors (401/429/etc) instead of silent failures.
"""
from __future__ import annotations

import json
import os
import re
import time
from typing import Any, Dict, List

from dotenv import load_dotenv
import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# ---- load .env first (robust regardless of where you run) ----
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

DEFAULT_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
API_KEY = os.getenv("DEEPSEEK_API_KEY")


class DeepSeekError(Exception):
    pass


def _headers() -> Dict[str, str]:
    if not API_KEY or not API_KEY.startswith("sk-"):
        raise DeepSeekError(
            "DEEPSEEK_API_KEY not loaded. Create a .env next to main.py with:\n"
            "DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx"
        )
    return {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}


def _chat_url() -> str:
    return f"{BASE_URL}/chat/completions"


# ---- helper: parse JSON even if wrapped in markdown fences ----
FENCE_RE = re.compile(r"^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$", re.IGNORECASE)

def _to_json_dict(text: str) -> Dict[str, Any]:
    """
    Parse JSON that may be wrapped in markdown code fences, or contain stray prose.
    Strategy: strict -> fenced extract -> brace slice.
    """
    text = (text or "").strip()

    # 1) strict
    try:
        return json.loads(text)
    except Exception:
        pass

    # 2) fenced
    m = FENCE_RE.match(text)
    if m:
        inner = m.group(1).strip()
        try:
            return json.loads(inner)
        except Exception:
            text = inner  # fallthrough

    # 3) slice first '{' to last '}' if present
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start : end + 1])

    # no luck
    raise ValueError("Could not parse JSON from model output")


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(min=1, max=8),
    retry=retry_if_exception_type((requests.RequestException, DeepSeekError)),
)
def _chat(messages: List[Dict[str, str]], temperature: float = 0.2, max_tokens: int = 300) -> str:
    payload = {
        "model": DEFAULT_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }
    resp = requests.post(_chat_url(), headers=_headers(), json=payload, timeout=60)
    if resp.status_code == 429:
        time.sleep(2.0)
        raise DeepSeekError(f"Rate limited: {resp.text[:300]}")
    if not resp.ok:
        raise DeepSeekError(f"HTTP {resp.status_code}: {resp.text[:600]}")
    data = resp.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    if not isinstance(content, str) or not content.strip():
        raise DeepSeekError(f"Empty/invalid content: {str(data)[:600]}")
    return content


def _fix_json_once(content: str) -> Dict[str, Any]:
    """One repair pass if the model produced non-JSON; asks for strict JSON, no fences."""
    repaired = _chat(
        messages=[
            {"role": "system", "content": "Return STRICT JSON only. No fences. No markdown. No prose."},
            {"role": "user", "content": content},
        ],
        temperature=0.0,
        max_tokens=220,
    )
    return _to_json_dict(repaired)


def enrich_artwork_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Return era_style, summary (<=22 words), themes (2–4), quality_flags."""
    system = (
        "You are a precise art data enrichment engine. "
        "Return STRICT JSON with keys: era_style, summary, themes, quality_flags. "
        "summary must be <= 22 words; themes 2–4 items; quality_flags empty if none. "
        "Return STRICT JSON only — no code fences, no markdown, no prose."
    )
    record = {
        "title": str(row.get("title", ""))[:140],
        "artist": str(row.get("artist", ""))[:100],
        "period": str(row.get("period", ""))[:80],
        "culture": str(row.get("culture", ""))[:80],
        "medium": str(row.get("medium", ""))[:120],
        "objectDate": str(row.get("objectDate", ""))[:40],
    }
    user = "INPUT_ARTWORK = " + json.dumps(record) + " Return JSON only."
    out = _chat(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.2,
        max_tokens=220,
    )
    try:
        data = _to_json_dict(out)
    except Exception:
        data = _fix_json_once(out)

    return {
        "era_style": data.get("era_style", ""),
        "summary": data.get("summary", ""),
        "themes": ";".join(data.get("themes", [])),
        "quality_flags": ";".join(data.get("quality_flags", [])),
    }


def enrich_exhibition_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Return audience_takeaway, buzz_summary (<=20 words), similarity_cluster, data_flags."""
    system = (
        "You enrich museum exhibition listings. "
        "Return STRICT JSON with keys: audience_takeaway, buzz_summary, similarity_cluster, data_flags. "
        "buzz_summary must be <= 20 words. "
        "Return STRICT JSON only — no code fences, no markdown, no prose."
    )
    record = {
        "title": str(row.get("title", ""))[:160],
        "dates": str(row.get("dates", ""))[:120],
        "location": str(row.get("location", ""))[:120],
        "description": str(row.get("description", ""))[:500],
    }
    user = "INPUT_EXHIBITION = " + json.dumps(record) + " Return JSON only."
    out = _chat(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.3,
        max_tokens=220,
    )
    try:
        data = _to_json_dict(out)
    except Exception:
        data = _fix_json_once(out)

    return {
        "audience_takeaway": data.get("audience_takeaway", ""),
        "buzz_summary": data.get("buzz_summary", ""),
        "similarity_cluster": data.get("similarity_cluster", ""),
        "data_flags": ";".join(data.get("data_flags", [])),
    }
