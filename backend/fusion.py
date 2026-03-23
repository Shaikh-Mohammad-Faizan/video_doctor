import numpy as np


# ─────────────────────────────────────────────
# FUSION ENGINE
# ─────────────────────────────────────────────

VISUAL_WEIGHT = 0.40
AUDIO_WEIGHT  = 0.35
NLP_WEIGHT    = 0.25

DROP_THRESHOLD  = 0.35
RISK_THRESHOLD  = 0.55
ROLLING_WINDOW  = 3   # seconds


def fuse_signals(audio_data: list, visual_data: list, nlp_data: list) -> list:
    """
    Combines all three per-second signal scores into one engagement score.
    Returns list of dicts: [{t, audio, visual, nlp, score, zone}]
    """
    # Build lookup dicts by timestamp
    audio_map  = {r["t"]: r["audio_score"]  for r in audio_data}
    visual_map = {r["t"]: r["visual_score"] for r in visual_data}
    nlp_map    = {r["t"]: r["nlp_score"]    for r in nlp_data}

    # Use the longest signal as the time range
    max_t = max(
        max(audio_map.keys(),  default=0),
        max(visual_map.keys(), default=0),
        max(nlp_map.keys(),    default=0),
    )

    raw_scores = []
    per_second = []

    for t in range(max_t + 1):
        a = audio_map.get(t, 0.0)
        v = visual_map.get(t, 0.0)
        n = nlp_map.get(t, 0.0)
        score = VISUAL_WEIGHT * v + AUDIO_WEIGHT * a + NLP_WEIGHT * n
        raw_scores.append(score)
        per_second.append({"t": t, "audio": a, "visual": v, "nlp": n})

    # Apply rolling average to smooth spikes
    smoothed = _rolling_average(raw_scores, ROLLING_WINDOW)

    result = []
    for i, row in enumerate(per_second):
        score = round(smoothed[i], 4)
        zone = _classify_zone(score)
        result.append({
            "t":      row["t"],
            "audio":  round(row["audio"],  4),
            "visual": round(row["visual"], 4),
            "nlp":    round(row["nlp"],    4),
            "score":  score,
            "zone":   zone,
        })

    return result


def _rolling_average(values: list, window: int) -> list:
    arr = np.array(values, dtype=float)
    smoothed = np.convolve(arr, np.ones(window) / window, mode='same')
    return smoothed.tolist()


def _classify_zone(score: float) -> str:
    if score < DROP_THRESHOLD:
        return "drop"
    elif score < RISK_THRESHOLD:
        return "risk"
    return "good"


# ─────────────────────────────────────────────
# DROP ZONE DETECTOR
# ─────────────────────────────────────────────

def detect_drop_zones(fused: list, top_n: int = 3) -> list:
    """
    Finds contiguous drop zones (score < 0.35).
    Returns top N zones sorted by severity.
    Each zone includes: start, end, avg_score, severity, primary_cause, signals
    """
    zones = []
    current_zone = None

    for row in fused:
        if row["zone"] == "drop":
            if current_zone is None:
                current_zone = {
                    "start": row["t"],
                    "end":   row["t"],
                    "seconds": [row],
                }
            else:
                current_zone["end"] = row["t"]
                current_zone["seconds"].append(row)
        else:
            if current_zone is not None:
                zones.append(current_zone)
                current_zone = None

    if current_zone is not None:
        zones.append(current_zone)

    # Build zone summaries
    summaries = []
    for z in zones:
        secs = z["seconds"]
        avg_score  = float(np.mean([s["score"]  for s in secs]))
        avg_audio  = float(np.mean([s["audio"]  for s in secs]))
        avg_visual = float(np.mean([s["visual"] for s in secs]))
        avg_nlp    = float(np.mean([s["nlp"]    for s in secs]))

        # Primary cause = whichever signal is lowest
        signal_avgs = {"audio": avg_audio, "visual": avg_visual, "nlp": avg_nlp}
        primary_cause = min(signal_avgs, key=signal_avgs.get)

        # Causes = all signals below 0.4
        causes = [k for k, v in signal_avgs.items() if v < 0.4]
        if not causes:
            causes = [primary_cause]

        # Severity
        if avg_score < 0.20:
            severity = "critical"
        elif avg_score < 0.30:
            severity = "risk"
        else:
            severity = "mild"

        start_s = z["start"]
        end_s   = z["end"]
        start_fmt = _fmt_time(start_s)
        end_fmt   = _fmt_time(end_s)

        summaries.append({
            "start":         start_s,
            "end":           end_s,
            "startSeconds":  start_s,
            "timestamp":     f"{start_fmt} \u2013 {end_fmt}",
            "shortTitle":    _generate_short_title(primary_cause, avg_audio, avg_visual, avg_nlp),
            "severity":      severity,
            "causes":        causes,
            "primaryCause":  primary_cause,
            "avgScore":      round(avg_score, 4),
            "signals": [
                {"name": "Voice",   "score": round(avg_audio,  4), "label": _signal_label(avg_audio)},
                {"name": "Visual",  "score": round(avg_visual, 4), "label": _signal_label(avg_visual)},
                {"name": "Words",   "score": round(avg_nlp,    4), "label": _signal_label(avg_nlp)},
            ],
            "musicMood": _detect_mood(avg_audio, avg_visual, avg_nlp, severity),
        })

    # Sort by severity (worst first) and return top N
    severity_order = {"critical": 0, "risk": 1, "mild": 2}
    summaries.sort(key=lambda z: (severity_order[z["severity"]], z["avgScore"]))
    return summaries[:top_n]


def _fmt_time(seconds: int) -> str:
    m = seconds // 60
    s = seconds % 60
    return f"{m}:{s:02d}"


def _signal_label(score: float) -> str:
    if score < 0.2:  return "Very low"
    if score < 0.35: return "Low"
    if score < 0.55: return "Acceptable"
    if score < 0.75: return "Good"
    return "Strong"


def _generate_short_title(primary_cause: str, audio: float, visual: float, nlp: float) -> str:
    titles = {
        "audio":  "Flat voice energy",
        "visual": "Static screen — nothing moving",
        "nlp":    "Weak words / filler heavy",
    }
    return titles.get(primary_cause, "Engagement drop")


def _detect_mood(audio: float, visual: float, nlp: float, severity: str) -> str:
    if severity == "critical":
        return "upbeat"       # need energy injection
    if audio < 0.3:
        return "energetic"    # voice is weak — pump it up
    if visual < 0.3:
        return "dramatic"     # screen is static — add cinematic feel
    if nlp < 0.3:
        return "calm"         # speech is chaotic — calm it down
    return "upbeat"


# ─────────────────────────────────────────────
# SUMMARY SCORES
# ─────────────────────────────────────────────

def compute_summary(fused: list) -> dict:
    """
    Returns overall summary scores 0–100 for the 4 metric cards.
    """
    if not fused:
        return {"overall": 0, "voice": 0, "visual": 0, "narrative": 0}

    overall  = int(np.mean([r["score"]  for r in fused]) * 100)
    voice    = int(np.mean([r["audio"]  for r in fused]) * 100)
    visual   = int(np.mean([r["visual"] for r in fused]) * 100)
    narrative = int(np.mean([r["nlp"]   for r in fused]) * 100)

    return {
        "overall":   min(overall,   100),
        "voice":     min(voice,     100),
        "visual":    min(visual,    100),
        "narrative": min(narrative, 100),
    }