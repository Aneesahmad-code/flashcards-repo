# app/ai/gemini.py
from typing import List, Tuple, Optional
import re
import google.generativeai as genai
from ..config import settings

# Configure Gemini once
genai.configure(api_key=settings.GEMINI_API_KEY)
_model = genai.GenerativeModel(settings.GEMINI_MODEL)

def _build_prompt(*, subject_title: str, topic_title: str, topic_area: str | None, count: int) -> str:
    details = f"Specific focus or details: \"{topic_area}\"." if topic_area else "No extra details provided."
    return f"""
You are creating study flashcards.

Subject: "{subject_title}"
Topic: "{topic_title}"
{details}

Produce EXACTLY {count} high-quality flashcards.
Each line must be a single 'Term: Definition' pair. 
Rules:
- One pair per line.
- Use a SINGLE colon ':' to separate term and definition.
- Keep definitions concise (<= 25 words).
- Avoid numbering, bullets, markdown, or extra colons.
- No empty lines.

Example format:
Velocity: Rate of change of displacement with respect to time
Acceleration: Rate of change of velocity with respect to time
"""

def _parse_pairs(text: str) -> List[Tuple[str, str]]:
    pairs: List[Tuple[str, str]] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        # split ONLY on first colon
        m = re.match(r"^\s*([^:]+)\s*:\s*(.+?)\s*$", line)
        if not m:
            continue
        term, definition = m.group(1).strip(), m.group(2).strip()
        if term and definition:
            pairs.append((term, definition))
    return pairs

def generate_flashcards(*, subject_title: str, topic_title: str, topic_area: str | None, count: int) -> List[Tuple[str, str]]:
    prompt = _build_prompt(subject_title=subject_title, topic_title=topic_title, topic_area=topic_area, count=count)
    resp = _model.generate_content(prompt)
    text = resp.text or ""
    cards = _parse_pairs(text)
    # If model returned more, trim; if less, return whatever we got
    return cards[:count]


def generate_flashcards_with_image(
    *,
    subject_title: str,
    topic_title: str,
    topic_area: Optional[str],
    count: int,
    image_bytes: bytes,
    image_mime: Optional[str] = None,
) -> List[Tuple[str, str]]:
    """Generate flashcards using both text instructions and an image.

    The image is passed as raw bytes to Gemini along with a clear instruction
    to extract key concepts relevant to the provided subject/topic.
    """
    if not image_bytes:
        return []

    if not image_mime:
        image_mime = "image/png"

    instructions = (
        _build_prompt(
            subject_title=subject_title,
            topic_title=topic_title,
            topic_area=topic_area,
            count=count,
        )
        + "\nUse the provided image to infer or refine the terms."
    )

    parts = [
        instructions,
        {"mime_type": image_mime, "data": image_bytes},
    ]

    resp = _model.generate_content(parts)
    text = getattr(resp, "text", None) or ""
    cards = _parse_pairs(text)
    return cards[:count]
