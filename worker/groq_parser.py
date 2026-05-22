"""
groq_parser.py — Extracts structured data from email body text using Groq LLM.

Handles two types of announcements:
  1. Class cancellations / room/time changes → live_updates row
  2. Campus events / notices → live_updates row

Returns a list of dicts ready to be inserted into live_updates.
"""

import json
import logging
import os

from groq import Groq

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an assistant that extracts university announcements from email text.

Given an email body, return a JSON array of announcement objects. Each object must have:
  - "title": short title (max 80 chars)
  - "message": full announcement text (1-3 sentences)
  - "category": one of ["academic", "schedule", "exam", "general"]

Rules:
- If the email describes a class cancellation, time change, or room change → category: "schedule"
- If the email describes an exam or result → category: "exam"
- If the email is a general academic notice → category: "academic"
- Otherwise → category: "general"
- If there is nothing worth announcing (purely administrative, spam, etc.) → return []
- Return ONLY a valid JSON array. No explanation, no markdown.
"""


def parse_email_body(body: str) -> list[dict]:
    """
    Send email body to Groq and return a list of live_update dicts.
    Each dict has keys: title, message, category.
    Returns [] on failure or if nothing to announce.
    """
    if not body or len(body.strip()) < 10:
        return []

    client = Groq(api_key=os.environ["GROQ_API_KEY"])

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": body[:4000]},  # cap to avoid token limits
            ],
            temperature=0.1,
            max_tokens=1024,
        )

        raw = response.choices[0].message.content.strip()

        # Strip markdown code fences if model wrapped the JSON
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        parsed = json.loads(raw)

        if not isinstance(parsed, list):
            logger.warning("Groq returned non-list: %s", type(parsed))
            return []

        valid = []
        for item in parsed:
            if isinstance(item, dict) and "title" in item and "message" in item:
                valid.append({
                    "title": str(item["title"])[:255],
                    "message": str(item["message"]),
                    "category": item.get("category", "general"),
                })

        logger.info("Groq extracted %d announcements", len(valid))
        return valid

    except json.JSONDecodeError as e:
        logger.error("Groq response not valid JSON: %s | raw: %s", e, raw[:200])
        return []
    except Exception as e:
        logger.error("Groq API error: %s", e)
        return []
