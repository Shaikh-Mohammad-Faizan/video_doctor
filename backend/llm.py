import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY", "")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

# ─────────────────────────────────────────────
# MUSIC LIBRARY — offline fallback
# ─────────────────────────────────────────────

MUSIC_LIBRARY = {
    "upbeat": {
        "genre": "Lo-fi / Upbeat pop",
        "bpm": "100–130 BPM",
        "suggestion": "Add an upbeat lo-fi track to fill this dead moment",
        "find_at": "YouTube Audio Library",
        "search_query": "upbeat lo-fi no copyright 2025",
    },
    "calm": {
        "genre": "Ambient / Soft instrumental",
        "bpm": "60–80 BPM",
        "suggestion": "Soft ambient music keeps viewers present without distraction",
        "find_at": "Pixabay Music",
        "search_query": "calm ambient no copyright",
    },
    "energetic": {
        "genre": "EDM / Trap instrumental",
        "bpm": "128–150 BPM",
        "suggestion": "Drop an energetic beat here — matches the cut point perfectly",
        "find_at": "YouTube Audio Library",
        "search_query": "energetic no copyright 2025",
    },
    "dramatic": {
        "genre": "Cinematic / Orchestral",
        "bpm": "70–100 BPM",
        "suggestion": "A cinematic build-up makes this moment feel important",
        "find_at": "Pixabay Music",
        "search_query": "cinematic build no copyright",
    },
    "emotional": {
        "genre": "Soft piano / Acoustic",
        "bpm": "60–75 BPM",
        "suggestion": "Soft piano supports the emotional delivery here",
        "find_at": "YouTube Audio Library",
        "search_query": "soft piano emotional no copyright",
    },
}


def get_music_suggestion(mood: str) -> dict:
    lib = MUSIC_LIBRARY.get(mood, MUSIC_LIBRARY["upbeat"])

    if YOUTUBE_API_KEY:
        try:
            resp = requests.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "q": lib["search_query"],
                    "type": "video",
                    "videoCategoryId": "10",
                    "order": "viewCount",
                    "maxResults": 3,
                    "key": YOUTUBE_API_KEY,
                },
                timeout=5,
            )
            if resp.status_code == 200:
                items = resp.json().get("items", [])
                songs = []
                for item in items:
                    songs.append({
                        "title":   item["snippet"]["title"][:60],
                        "channel": item["snippet"]["channelTitle"],
                        "url": f"https://youtube.com/watch?v={item['id']['videoId']}",
                    })
                if songs:
                    return {
                        "source":     "trending",
                        "mood":       mood,
                        "genre":      lib["genre"],
                        "bpm":        lib["bpm"],
                        "suggestion": lib["suggestion"],
                        "songs":      songs,
                    }
        except Exception:
            pass

    return {
        "source":     "library",
        "mood":       mood,
        "genre":      lib["genre"],
        "bpm":        lib["bpm"],
        "suggestion": lib["suggestion"],
        "find_at":    lib["find_at"],
        "search":     lib["search_query"],
        "songs":      [],
    }


# ─────────────────────────────────────────────
# GEMINI API — RECOMMENDATION ENGINE
# ─────────────────────────────────────────────

SYSTEM_PROMPT = """You are a professional video editor with 10 years of experience 
editing viral short-form content. A creator uploaded a video and our system detected 
engagement drop zones with specific signal data.

For each drop zone, explain the problem EXACTLY like you would tell a creator in a 
real editing session — specific, direct, human, maximum 2 sentences.

Then give three fixes:
- quickFix: something they can do in under 5 minutes right now
- mediumFix: something that requires a reshoot of that segment  
- strategicFix: a structural change for their next video

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.
Format exactly:
{
  "zones": [
    {
      "timestamp": "string",
      "diagnosis": "string",
      "primaryCause": "audio|visual|nlp",
      "quickFix": "string",
      "mediumFix": "string",
      "strategicFix": "string"
    }
  ],
  "overallVerdict": "string"
}"""


def generate_recommendations(drop_zones: list) -> dict:
    if not drop_zones:
        return {
            "zones": [],
            "overallVerdict": "No significant drop zones detected. Good engagement throughout."
        }

    zone_summaries = []
    for z in drop_zones:
        zone_summaries.append({
            "timestamp":    z["timestamp"],
            "severity":     z["severity"],
            "primaryCause": z["primaryCause"],
            "avgScore":     z["avgScore"],
            "audioScore":   z["signals"][0]["score"],
            "visualScore":  z["signals"][1]["score"],
            "nlpScore":     z["signals"][2]["score"],
        })

    full_prompt = f"""{SYSTEM_PROMPT}

Here are the engagement drop zones detected in the video:

{json.dumps(zone_summaries, indent=2)}

Generate editor-voice recommendations for each zone."""

    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

            payload = {
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 1500,
                }
            }

            resp = requests.post(url, json=payload, timeout=30)

            if resp.status_code == 200:
                data = resp.json()
                raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()

                # Strip markdown fences if present
                if "```" in raw:
                    parts = raw.split("```")
                    for part in parts:
                        part = part.strip()
                        if part.startswith("json"):
                            part = part[4:].strip()
                        if part.startswith("{"):
                            raw = part
                            break

                recs = json.loads(raw.strip())
                return recs

        except Exception as e:
            print(f"Gemini API error: {e} — using fallback")

    return _fallback_recommendations(drop_zones)


def _fallback_recommendations(drop_zones: list) -> dict:
    FALLBACKS = {
        "audio": {
            "diagnosis": "Your voice energy drops significantly here. The flat delivery signals to viewers that the content has paused.",
            "quickFix": "Speed up this clip by 1.2x in your editor to raise the perceived energy.",
            "mediumFix": "Re-record this segment with noticeably higher vocal energy and faster pace.",
            "strategicFix": "Practice your key points out loud 3 times before recording to eliminate flat delivery zones.",
        },
        "visual": {
            "diagnosis": "Nothing changes on screen for too long here. Viewers' brains register nothing new and start scrolling.",
            "quickFix": "Add a zoom-in or text overlay at this point so something moves on screen.",
            "mediumFix": "Reshoot with B-roll footage or add on-screen graphics during this section.",
            "strategicFix": "Plan a visual change every 3 to 4 seconds in your next video.",
        },
        "nlp": {
            "diagnosis": "Too many filler words and slow pace here make you sound uncertain.",
            "quickFix": "Edit out the filler words and silence in post.",
            "mediumFix": "Re-record this segment with a written script so every word is intentional.",
            "strategicFix": "Record a practice run first and watch it back to catch filler patterns.",
        },
    }

    zones_out = []
    for z in drop_zones:
        cause = z.get("primaryCause", "audio")
        fb = FALLBACKS.get(cause, FALLBACKS["audio"])
        zones_out.append({
            "timestamp":    z["timestamp"],
            "diagnosis":    fb["diagnosis"],
            "primaryCause": cause,
            "quickFix":     fb["quickFix"],
            "mediumFix":    fb["mediumFix"],
            "strategicFix": fb["strategicFix"],
        })

    return {
        "zones": zones_out,
        "overallVerdict": "Multiple engagement issues detected. Focus on the critical zones first.",
    }


# ─────────────────────────────────────────────
# VIRAL BASELINES
# ─────────────────────────────────────────────

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