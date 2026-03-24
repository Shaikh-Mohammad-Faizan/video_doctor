import librosa
import numpy as np
import cv2
import whisper
import os
from textblob import TextBlob

print("Loading Whisper model...")
WHISPER_MODEL = whisper.load_model("base")
print("Whisper ready.")

FILLER_WORDS = {"um", "uh", "like", "basically", "literally", "you know", "so", "actually", "right"}


# ─────────────────────────────────────────────
# ANALYZER 1: AUDIO
# ─────────────────────────────────────────────

def analyze_audio(audio_path: str) -> list:
    """
    Analyzes audio file second by second.
    Returns list of dicts: [{t, rms, zcr, tempo_score, audio_score}]
    """
    y, sr = librosa.load(audio_path, sr=None)
    duration = int(librosa.get_duration(y=y, sr=sr))
    results = []

    frame_length = sr
    hop_length = sr

    rms_frames = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
    zcr_frames = librosa.feature.zero_crossing_rate(y, frame_length=frame_length, hop_length=hop_length)[0]

    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)
    num_seconds = min(len(rms_frames), len(zcr_frames), duration)

    if num_seconds == 0:
        return []

    rms_vals = rms_frames[:num_seconds]
    zcr_vals = zcr_frames[:num_seconds]

    def norm(arr):
        mn, mx = arr.min(), arr.max()
        if mx - mn < 1e-8:
            return np.full_like(arr, 0.5, dtype=float)
        return (arr - mn) / (mx - mn)

    rms_norm = norm(rms_vals)
    zcr_norm = norm(zcr_vals)

    onset_per_sec = []
    onset_hop = max(1, len(onset_env) // num_seconds)
    for i in range(num_seconds):
        chunk = onset_env[i * onset_hop: (i + 1) * onset_hop]
        onset_per_sec.append(float(np.std(chunk)) if len(chunk) > 0 else 0.0)

    tempo_norm = norm(np.array(onset_per_sec, dtype=float))

    for i in range(num_seconds):
        rms = float(rms_norm[i])
        zcr = float(zcr_norm[i])
        tempo_sc = float(tempo_norm[i])

        # Softer, more demo-friendly weighting
        raw_score = 0.45 * rms + 0.20 * zcr + 0.35 * tempo_sc

        # Lift score floor so decent videos don't look dead
        score = _soft_calibrate(raw_score, floor=0.35, gain=0.90)

        results.append({
            "t": i,
            "rms": round(rms, 4),
            "zcr": round(zcr, 4),
            "tempo_score": round(tempo_sc, 4),
            "audio_score": round(score, 4)
        })

    return results


# ─────────────────────────────────────────────
# ANALYZER 2: VISUAL
# ─────────────────────────────────────────────

def analyze_visual(frames_dir: str) -> list:
    """
    Analyzes video frames second by second.
    Returns list of dicts: [{t, frame_delta, scene_cut, face_present, visual_score}]
    """
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    frame_files = sorted([
        f for f in os.listdir(frames_dir)
        if f.endswith((".jpg", ".png", ".jpeg"))
    ])

    if len(frame_files) == 0:
        return []

    results = []
    prev_gray = None
    deltas = []
    raw_results = []

    for i, fname in enumerate(frame_files):
        path = os.path.join(frames_dir, fname)
        frame = cv2.imread(path)
        if frame is None:
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        small = cv2.resize(gray, (320, 180))

        if prev_gray is not None:
            diff = cv2.absdiff(prev_gray, small)
            delta = float(np.mean(diff)) / 255.0
        else:
            delta = 0.0

        deltas.append(delta)

        scene_cut = 1.0 if delta > 0.35 else 0.0

        faces = face_cascade.detectMultiScale(
            small, scaleFactor=1.1, minNeighbors=3, minSize=(20, 20)
        )
        face_present = 1.0 if len(faces) > 0 else 0.0

        raw_results.append({
            "t": i,
            "frame_delta_raw": delta,
            "scene_cut": scene_cut,
            "face_present": face_present,
        })

        prev_gray = small

    delta_arr = np.array(deltas, dtype=float)
    mn, mx = delta_arr.min(), delta_arr.max()
    if mx - mn < 1e-8:
        delta_norm = np.full_like(delta_arr, 0.5, dtype=float)
    else:
        delta_norm = (delta_arr - mn) / (mx - mn)

    for i, row in enumerate(raw_results):
        fd = float(delta_norm[i])
        sc = row["scene_cut"]
        fp = row["face_present"]

        raw_score = 0.45 * fd + 0.20 * sc + 0.35 * fp
        score = _soft_calibrate(raw_score, floor=0.32, gain=0.95)

        results.append({
            "t": row["t"],
            "frame_delta": round(fd, 4),
            "scene_cut": round(sc, 4),
            "face_present": round(fp, 4),
            "visual_score": round(score, 4)
        })

    return results


# ─────────────────────────────────────────────
# ANALYZER 3: NLP
# ─────────────────────────────────────────────

def analyze_nlp(audio_path: str) -> list:
    """
    Transcribes audio and analyzes language per second.
    Returns list of dicts: [{t, sentiment, wps, filler_rate, nlp_score}]
    """
    result = WHISPER_MODEL.transcribe(audio_path, word_timestamps=True)
    segments = result.get("segments", [])

    if not segments:
        return []

    total_duration = int(segments[-1]["end"]) + 1
    per_second = []

    for t in range(total_duration):
        window_start = t
        window_end = t + 1

        words_in_window = []
        for seg in segments:
            for word_info in seg.get("words", []):
                ws = word_info.get("start", 0)
                if window_start <= ws < window_end:
                    words_in_window.append(word_info.get("word", "").strip().lower())

        wps = len(words_in_window)

        filler_count = sum(1 for w in words_in_window if w in FILLER_WORDS)
        filler_rate = filler_count / max(len(words_in_window), 1)

        chunk_words = []
        for seg in segments:
            for word_info in seg.get("words", []):
                ws = word_info.get("start", 0)
                if max(0, t - 2) <= ws < t + 3:
                    chunk_words.append(word_info.get("word", "").strip())

        chunk_text = " ".join(chunk_words)
        sentiment = TextBlob(chunk_text).sentiment.polarity if chunk_text else 0.0
        sentiment_norm = (sentiment + 1) / 2

        # Softer pacing score
        if wps == 0:
            wps_score = 0.20
        elif wps <= 1.5:
            wps_score = 0.45 + (wps / 1.5) * 0.20
        elif wps <= 3.5:
            wps_score = 0.70 + ((wps - 1.5) / 2.0) * 0.25
        else:
            wps_score = max(0.55, 0.95 - (wps - 3.5) * 0.06)

        # Much softer filler penalty
        raw_score = (
            0.35 * sentiment_norm +
            0.45 * min(wps_score, 1.0) -
            0.12 * filler_rate
        )
        raw_score = max(0.0, min(1.0, raw_score))

        score = _soft_calibrate(raw_score, floor=0.38, gain=0.85)

        per_second.append({
            "t": t,
            "sentiment": round(sentiment_norm, 4),
            "wps": round(wps_score, 4),
            "filler_rate": round(filler_rate, 4),
            "nlp_score": round(score, 4)
        })

    return per_second


def _soft_calibrate(score: float, floor: float = 0.35, gain: float = 0.9) -> float:
    """
    Lifts low-mid scores without making everything fake-perfect.
    Useful for demo-friendly but still meaningful calibration.
    """
    score = max(0.0, min(1.0, score))
    calibrated = floor + (score * gain)
    return max(0.0, min(1.0, calibrated))