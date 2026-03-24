import json
import os
import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


SYSTEM_PROMPT = """You are a professional short-form video editor.
A creator uploaded a video and our system detected engagement dips using audio, visual, and language signals.

For each zone:
1. Explain why attention likely dropped in a direct, editor-style tone.
2. Keep the diagnosis useful, specific, and encouraging.
3. Give:
- quickFixes: 5 to 6 short actionable fixes specific to the cause
- mediumFix: a stronger correction that may require a reshoot or rewrite
- strategicFix: a repeatable lesson for future videos

Important:
- Make the fixes DIFFERENT depending on the primary cause.
- If primaryCause is audio, focus on delivery, mic clarity, pacing, pauses, vocal emphasis.
- If primaryCause is visual, focus on framing, cuts, B-roll, zooms, movement, captions, visual rhythm.
- If primaryCause is nlp, focus on scripting, filler words, clarity, phrasing, hook strength, sentence tightening.
- Avoid repeating the exact same fixes for every zone.
- Keep each diagnosis to max 2 sentences.
- Respond ONLY with valid JSON.

Format exactly:
{
  "zones": [
    {
      "timestamp": "string",
      "diagnosis": "string",
      "primaryCause": "audio|visual|nlp",
      "quickFixes": ["string", "string", "string", "string", "string"],
      "mediumFix": "string",
      "strategicFix": "string"
    }
  ],
  "overallVerdict": "string"
}"""


def generate_quick_fixes(primary_cause: str, start_sec: int, end_sec: int, severity: str = "mild"):
    if primary_cause == "audio":
        fixes = [
            "Tighten long pauses to improve pacing",
            "Increase vocal clarity with EQ and noise cleanup",
            "Level volume so the voice stays consistent",
            "Cut hesitation sounds and filler pauses",
            "Add stronger emphasis on key words",
            "Use light compression so delivery feels more present",
        ]

    elif primary_cause == "visual":
        fixes = [
            "Add zoom cuts or punch-ins every 2–3 seconds",
            "Insert B-roll or supporting cutaways",
            "Use captions or motion text to reinforce key points",
            "Add faster jump cuts where the frame feels static",
            "Introduce a framing change or subject movement",
            "Overlay icons, highlights, or simple graphics",
        ]

    else:  # nlp
        fixes = [
            "Shorten the sentence so the point lands faster",
            "Remove filler words and low-impact phrasing",
            "Rewrite the line with clearer, sharper wording",
            "Break the message into punchier shorter beats",
            "Use a curiosity hook or stronger value statement",
            "Replace vague phrasing with more direct language",
        ]

    # Opening-specific improvements
    if start_sec <= 3:
        opening_fix = "Strengthen the hook in the first second with a clearer payoff"
        if opening_fix not in fixes:
            fixes.insert(0, opening_fix)

    # Ending-specific improvements
    if end_sec >= 12:  # generic short-form-safe heuristic
        ending_fix = "Trim dead space at the end or add a stronger closing line"
        if ending_fix not in fixes and len(fixes) < 7:
            fixes.append(ending_fix)

    # Severity-aware tweak
    if severity == "critical":
        severity_fix = "Remove this segment entirely if it does not add strong value"
        if severity_fix not in fixes:
            fixes.insert(0, severity_fix)

    return fixes[:6]


def generate_medium_fix(primary_cause: str, start_sec: int):
    if primary_cause == "audio":
        if start_sec <= 3:
            return "Re-record the opening with stronger vocal energy, cleaner mic pickup, and a more immediate hook."
        return "Re-record this section with better mic positioning, clearer emphasis, and tighter delivery."

    if primary_cause == "visual":
        if start_sec <= 3:
            return "Reshoot the opening with stronger visual motion, tighter framing, or a more eye-catching first shot."
        return "Reshoot this segment with stronger B-roll, clearer framing changes, or more deliberate movement."

    if start_sec <= 3:
        return "Rewrite and re-record the opening line so the value is immediately clear and more curiosity-driven."
    return "Rewrite and re-record this section with cleaner phrasing, fewer filler words, and a stronger message."

def generate_strategic_fix(primary_cause: str, start_sec: int, end_sec: int):
    if start_sec <= 3:
        return "Design the first two seconds as a pattern interrupt so viewers instantly understand why they should keep watching."

    if primary_cause == "audio":
        return "Build stronger vocal rhythm into important moments so your delivery stays dynamic across the full video."

    if primary_cause == "visual":
        return "Plan a visual change every 3–4 seconds so the screen never stays static for too long."

    return "Script tighter hooks, transitions, and payoff lines so every sentence clearly earns attention."

def generate_fallback_diagnosis(primary_cause: str, severity: str):
    if primary_cause == "audio":
        if severity == "critical":
            return "The spoken delivery drops too much here, so the moment feels low-energy and easier to skip."
        return "The spoken delivery loses impact here, so the moment feels less energetic than the stronger parts of the video."

    if primary_cause == "visual":
        if severity == "critical":
            return "This section becomes visually flat, so the screen stops giving viewers enough new stimulus."
        return "The screen becomes visually less dynamic here, which makes this segment feel flatter than the stronger moments."

    if severity == "critical":
        return "The wording loses clarity here, so the message becomes harder to follow and less compelling."
    return "The wording weakens here, so the message feels less sharp and less memorable than the strongest parts of the video."

def generate_recommendations(drop_zones: list) -> dict:
    if not drop_zones:
        return {
            "zones": [],
            "overallVerdict": "No significant attention dips were detected. The video holds attention consistently."
        }

    zone_summaries = []
    for z in drop_zones:
        zone_summaries.append({
            "timestamp": z["timestamp"],
            "severity": z["severity"],
            "primaryCause": z["primaryCause"],
            "avgScore": z["avgScore"],
            "startSeconds": z.get("startSeconds", 0),
            "end": z.get("end", z.get("startSeconds", 0)),
            "audioScore": z["signals"][0]["score"],
            "visualScore": z["signals"][1]["score"],
            "nlpScore": z["signals"][2]["score"],
        })

    if GEMINI_API_KEY:
        try:
            full_prompt = f"""{SYSTEM_PROMPT}

Here are the attention zones detected in the video:

{json.dumps(zone_summaries, indent=2)}

Generate editor-style recommendations for each zone.
Remember:
- quickFixes must contain 5 to 6 short bullet-style actions
- they must vary by primary cause
- keep the output clean JSON only
"""

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
            payload = {
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {
                    "temperature": 0.8,
                    "maxOutputTokens": 1800,
                }
            }

            resp = requests.post(url, json=payload, timeout=30)

            if resp.status_code == 200:
                data = resp.json()
                raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()

                if "```" in raw:
                    parts = raw.split("```")
                    for part in parts:
                        part = part.strip()
                        if part.startswith("json"):
                            part = part[4:].strip()
                        if part.startswith("{"):
                            raw = part
                            break

                parsed = json.loads(raw.strip())

                # Safety cleanup so frontend always gets usable fields
                cleaned_zones = []
                for i, zone in enumerate(parsed.get("zones", [])):
                    src = drop_zones[i] if i < len(drop_zones) else {}
                    cause = zone.get("primaryCause") or src.get("primaryCause", "audio")
                    start_sec = src.get("startSeconds", 0)
                    end_sec = src.get("end", start_sec)
                    severity = src.get("severity", "mild")

                    quick_fixes = zone.get("quickFixes")
                    if not isinstance(quick_fixes, list) or len(quick_fixes) == 0:
                        quick_fixes = generate_quick_fixes(cause, start_sec, end_sec, severity)

                    cleaned_zones.append({
                        "timestamp": zone.get("timestamp", src.get("timestamp", "")),
                        "diagnosis": zone.get("diagnosis", generate_fallback_diagnosis(cause, severity)),
                        "primaryCause": cause,
                        "quickFixes": quick_fixes[:6],
                        "mediumFix": zone.get("mediumFix", generate_medium_fix(cause, start_sec)),
                        "strategicFix": zone.get("strategicFix", generate_strategic_fix(cause, start_sec, end_sec)),
                    })

                return {
                    "zones": cleaned_zones,
                    "overallVerdict": parsed.get(
                        "overallVerdict",
                        "A few attention dips were detected. Tightening the weaker moments should noticeably improve retention."
                    ),
                }

        except Exception as e:
            print(f"Gemini API error: {e} — using fallback")

    return _fallback_recommendations(drop_zones)


def _fallback_recommendations(drop_zones: list) -> dict:
    zones_out = []

    for z in drop_zones:
        cause = z.get("primaryCause", "audio")
        severity = z.get("severity", "mild")
        start_sec = z.get("startSeconds", 0)
        end_sec = z.get("end", start_sec)

        zones_out.append({
            "timestamp": z["timestamp"],
            "diagnosis": generate_fallback_diagnosis(cause, severity),
            "primaryCause": cause,
            "quickFixes": generate_quick_fixes(cause, start_sec, end_sec, severity),
            "mediumFix": generate_medium_fix(cause, start_sec),
            "strategicFix": generate_strategic_fix(cause, start_sec, end_sec),
        })

    return {
        "zones": zones_out,
        "overallVerdict": "A few attention dips were detected. Tightening the weaker moments should noticeably improve retention.",
    }


def get_viral_baseline() -> list:
    import math

    baseline = []
    for t in range(120):
        score = (
            0.85 * math.exp(-0.008 * t)
            + 0.15 * math.sin(t / 10) * 0.3
            + 0.55
        )
        score = min(0.95, max(0.55, score))
        baseline.append({"t": t, "score": round(score, 4)})
    return baseline


def get_social_comparison(query: str) -> dict:
    return {
        "query": query,
        "youtubeSummary": "Social comparison not active in this simplified mode.",
        "youtubeItems": [],
        "instagramSummary": "Instagram comparison is limited in demo mode.",
    }