import numpy as np


VISUAL_WEIGHT = 0.38
AUDIO_WEIGHT = 0.32
NLP_WEIGHT = 0.30

DROP_THRESHOLD = 0.34
RISK_THRESHOLD = 0.55
GOOD_THRESHOLD = 0.74
ROLLING_WINDOW = 2


def fuse_signals(audio_data: list, visual_data: list, nlp_data: list) -> list:
    audio_map = {r["t"]: r["audio_score"] for r in audio_data}
    visual_map = {r["t"]: r["visual_score"] for r in visual_data}
    nlp_map = {r["t"]: r["nlp_score"] for r in nlp_data}

    max_t = max(
        max(audio_map.keys(), default=0),
        max(visual_map.keys(), default=0),
        max(nlp_map.keys(), default=0),
    )

    raw_scores = []
    per_second = []

    for t in range(max_t + 1):
        a = audio_map.get(t, 0.0)
        v = visual_map.get(t, 0.0)
        n = nlp_map.get(t, 0.0)

        raw_score = VISUAL_WEIGHT * v + AUDIO_WEIGHT * a + NLP_WEIGHT * n
        score = _display_calibrate(raw_score)

        raw_scores.append(score)
        per_second.append({
            "t": t,
            "audio": a,
            "visual": v,
            "nlp": n,
        })

    smoothed = _rolling_average(raw_scores, ROLLING_WINDOW)

    result = []
    for i, row in enumerate(per_second):
        score = round(smoothed[i], 4)
        zone = _classify_zone(score)

        primary_cause, reason, strengths, weaknesses = _explain_point(
            audio=row["audio"],
            visual=row["visual"],
            nlp=row["nlp"],
            score=score,
            zone=zone,
        )

        result.append({
            "t": row["t"],
            "audio": round(row["audio"], 4),
            "visual": round(row["visual"], 4),
            "nlp": round(row["nlp"], 4),
            "score": score,
            "zone": zone,
            "primaryCause": primary_cause,
            "reason": reason,
            "strengths": strengths,
            "weaknesses": weaknesses,
        })

    return result


def _rolling_average(values: list, window: int) -> list:
    arr = np.array(values, dtype=float)
    smoothed = np.convolve(arr, np.ones(window) / window, mode="same")
    return smoothed.tolist()


def _display_calibrate(score: float) -> float:
    score = max(0.0, min(1.0, score))
    calibrated = 0.14 + (score ** 0.87) * 0.77
    return max(0.0, min(1.0, calibrated))


def _classify_zone(score: float) -> str:
    if score < DROP_THRESHOLD:
        return "drop"
    elif score < RISK_THRESHOLD:
        return "weak"
    elif score < GOOD_THRESHOLD:
        return "stable"
    return "good"


def _signal_name(key: str) -> str:
    return {
        "audio": "Voice energy",
        "visual": "Visual activity",
        "nlp": "Speech clarity",
    }.get(key, key)


def _explain_point(audio: float, visual: float, nlp: float, score: float, zone: str):
    signals = {
        "audio": audio,
        "visual": visual,
        "nlp": nlp,
    }

    primary_cause = min(signals, key=signals.get)
    strongest = max(signals, key=signals.get)

    weaknesses = [k for k, v in signals.items() if v < 0.58]
    strengths = [k for k, v in signals.items() if v >= 0.76]

    weak_labels = [_signal_name(k).lower() for k in weaknesses]
    strong_labels = [_signal_name(k).lower() for k in strengths]

    if zone == "drop":
        if len(weak_labels) >= 2:
            reason = f"Engagement is low because {', '.join(weak_labels)} all weaken at this moment."
        else:
            reason = f"Engagement is low because {_signal_name(primary_cause).lower()} drops below the stronger surrounding moments."
    elif zone == "weak":
        if len(weak_labels) >= 2:
            reason = f"Engagement softens here because {', '.join(weak_labels)} are not supporting the moment strongly enough."
        else:
            reason = f"Engagement softens here because {_signal_name(primary_cause).lower()} is weaker than the surrounding moments."
    elif zone == "stable":
        reason = f"Engagement remains stable because the signals stay reasonably balanced, led by {_signal_name(strongest).lower()}."
    else:
        if len(strong_labels) >= 2:
            reason = f"Engagement is high because {', '.join(strong_labels)} are performing well together."
        else:
            reason = f"Engagement is high because {_signal_name(strongest).lower()} is carrying this moment."

    return primary_cause, reason, strengths, weaknesses


def detect_drop_zones(fused: list, top_n: int = 3) -> list:
    zones = []
    current_zone = None

    for row in fused:
        if row["zone"] in ["drop", "weak"]:
            if current_zone is None:
                current_zone = {
                    "start": row["t"],
                    "end": row["t"],
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

    total_len = len(fused)
    filtered = []

    for z in zones:
        secs = z["seconds"]
        start_s = z["start"]
        end_s = z["end"]
        duration = end_s - start_s + 1
        avg_score = float(np.mean([s["score"] for s in secs]))

        at_start_edge = start_s <= 0
        at_end_edge = end_s >= max(0, total_len - 1)

        # Ignore trivial 1-second edge zones unless they are truly severe
        if duration == 1 and (at_start_edge or at_end_edge) and avg_score > 0.22:
            continue

        filtered.append(z)

    summaries = []

    for z in filtered:
        secs = z["seconds"]

        avg_score = float(np.mean([s["score"] for s in secs]))
        avg_audio = float(np.mean([s["audio"] for s in secs]))
        avg_visual = float(np.mean([s["visual"] for s in secs]))
        avg_nlp = float(np.mean([s["nlp"] for s in secs]))

        signal_avgs = {
            "audio": avg_audio,
            "visual": avg_visual,
            "nlp": avg_nlp,
        }

        primary_cause = min(signal_avgs, key=signal_avgs.get)
        causes = [k for k, v in signal_avgs.items() if v < 0.58] or [primary_cause]

        if avg_score < 0.28:
            severity = "critical"
        elif avg_score < 0.42:
            severity = "needs_work"
        else:
            severity = "mild"

        start_s = z["start"]
        end_s = z["end"]

        summaries.append({
            "start": start_s,
            "end": end_s,
            "startSeconds": start_s,
            "timestamp": f"{_fmt_time(start_s)} – {_fmt_time(end_s)}",
            "shortTitle": _generate_short_title(primary_cause),
            "severity": severity,
            "causes": causes,
            "primaryCause": primary_cause,
            "avgScore": round(avg_score, 4),
            "signals": [
                {"name": "Voice", "score": round(avg_audio, 4), "label": _signal_label(avg_audio)},
                {"name": "Visual", "score": round(avg_visual, 4), "label": _signal_label(avg_visual)},
                {"name": "Words", "score": round(avg_nlp, 4), "label": _signal_label(avg_nlp)},
            ],
        })

    severity_order = {"critical": 0, "needs_work": 1, "mild": 2}
    summaries.sort(key=lambda z: (severity_order[z["severity"]], z["avgScore"]))
    return summaries[:top_n]


def compute_summary(fused: list) -> dict:
    if not fused:
        return {"overall": 0, "voice": 0, "visual": 0, "narrative": 0}

    overall_raw = float(np.mean([r["score"] for r in fused]))
    voice_raw = float(np.mean([r["audio"] for r in fused]))
    visual_raw = float(np.mean([r["visual"] for r in fused]))
    narrative_raw = float(np.mean([r["nlp"] for r in fused]))

    overall = _metric_to_100(overall_raw, floor=22, span=74)
    voice = _metric_to_100(voice_raw, floor=25, span=70)
    visual = _metric_to_100(visual_raw, floor=25, span=70)
    narrative = _metric_to_100(narrative_raw, floor=25, span=70)

    return {
        "overall": overall,
        "voice": voice,
        "visual": visual,
        "narrative": narrative,
    }


def _metric_to_100(value: float, floor: int = 20, span: int = 75) -> int:
    value = max(0.0, min(1.0, value))
    calibrated = floor + (value ** 0.82) * span
    return min(int(round(calibrated)), 100)


def _fmt_time(seconds: int) -> str:
    m = seconds // 60
    s = seconds % 60
    return f"{m}:{s:02d}"


def _signal_label(score: float) -> str:
    if score < 0.35:
        return "Weak"
    if score < 0.58:
        return "Needs improvement"
    if score < 0.76:
        return "Stable"
    return "Strong"


def _generate_short_title(primary_cause: str) -> str:
    titles = {
        "audio": "Voice energy softens",
        "visual": "Visual momentum dips",
        "nlp": "Speech clarity needs work",
    }
    return titles.get(primary_cause, "Attention dip")