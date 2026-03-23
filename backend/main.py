import os
import uuid
import subprocess
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from analyzer import analyze_audio, analyze_visual, analyze_nlp
from fusion import fuse_signals, detect_drop_zones, compute_summary
from llm import generate_recommendations, get_music_suggestion, get_viral_baseline

app = FastAPI(title="Video Doctor API")

# Allow React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR      = "uploads"
FRAMES_DIR      = "frames_temp"
DEMO_CACHE_DIR  = "demo_cache"

os.makedirs(UPLOAD_DIR,     exist_ok=True)
os.makedirs(FRAMES_DIR,     exist_ok=True)
os.makedirs(DEMO_CACHE_DIR, exist_ok=True)


# ─────────────────────────────────────────────
# FFMPEG PATH RESOLUTION
# Finds ffmpeg regardless of Windows PATH issues
# ─────────────────────────────────────────────

def _get_ffmpeg():
    """
    Resolve ffmpeg executable path reliably on Windows.
    Priority:
      1. FFMPEG_PATH env variable (set in .env)
      2. imageio-ffmpeg bundled binary (most reliable)
      3. Common Windows install locations
      4. Fall back to bare 'ffmpeg' (relies on system PATH)
    """
    # 1. Explicit env override
    env_path = os.getenv("FFMPEG_PATH")
    if env_path and os.path.isfile(env_path):
        return env_path

    # 2. imageio-ffmpeg (install with: pip install imageio-ffmpeg)
    try:
        import imageio_ffmpeg
        path = imageio_ffmpeg.get_ffmpeg_exe()
        if path:
            return path
    except ImportError:
        pass

    # 3. Common Windows locations
    common_paths = [
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        r"C:\ProgramData\chocolatey\bin\ffmpeg.exe",
        r"C:\tools\ffmpeg\bin\ffmpeg.exe",
    ]
    for p in common_paths:
        if os.path.isfile(p):
            return p

    # 4. Try to find via 'where ffmpeg' on Windows
    try:
        result = subprocess.run(
            ["where", "ffmpeg"],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            found = result.stdout.strip().splitlines()[0]
            if found:
                return found
    except Exception:
        pass

    # 5. Last resort — bare name, relies on PATH
    return "ffmpeg"


FFMPEG = _get_ffmpeg()
print(f"[Video Doctor] Using ffmpeg at: {FFMPEG}")


# ─────────────────────────────────────────────
# STATUS tracking (simple in-memory)
# ─────────────────────────────────────────────

STATUS_STORE = {}


def set_status(job_id: str, step: str, done: bool = False):
    if job_id not in STATUS_STORE:
        STATUS_STORE[job_id] = []
    STATUS_STORE[job_id].append({"step": step, "done": done})


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Video Doctor API is running", "ffmpeg": FFMPEG}


@app.get("/status/{job_id}")
def get_status(job_id: str):
    return {"steps": STATUS_STORE.get(job_id, [])}


@app.get("/viral-baseline")
def viral_baseline():
    return {"baseline": get_viral_baseline()}


@app.get("/demo/{video_name}")
def load_demo(video_name: str):
    """Load pre-cached demo results — presentation insurance."""
    cache_path = os.path.join(DEMO_CACHE_DIR, f"{video_name}.json")
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Demo cache not found")


@app.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    """
    Main endpoint. Accepts video file, runs all analyzers, returns full result.
    """
    # Validate file type
    if not file.filename.lower().endswith((".mp4", ".mov", ".avi", ".mkv")):
        raise HTTPException(status_code=400, detail="Please upload a video file (MP4, MOV, AVI, MKV)")

    job_id = str(uuid.uuid4())[:8]
    set_status(job_id, "Uploading video...")

    # Save uploaded file
    video_path = os.path.join(UPLOAD_DIR, f"{job_id}.mp4")
    with open(video_path, "wb") as f:
        content = await file.read()
        f.write(content)

    audio_path  = os.path.join(UPLOAD_DIR, f"{job_id}_audio.wav")
    frames_path = os.path.join(FRAMES_DIR, job_id)
    os.makedirs(frames_path, exist_ok=True)

    try:
        # Step 1 — Extract audio
        set_status(job_id, "Extracting audio...")
        _extract_audio(video_path, audio_path)

        # Step 2 — Extract frames
        set_status(job_id, "Scanning video frames...")
        _extract_frames(video_path, frames_path)

        # Step 3 — Audio analysis
        set_status(job_id, "Analyzing voice energy...")
        audio_data = analyze_audio(audio_path)

        # Step 4 — Visual analysis
        set_status(job_id, "Analyzing visual activity...")
        visual_data = analyze_visual(frames_path)

        # Step 5 — NLP analysis
        set_status(job_id, "Reading transcript...")
        nlp_data = analyze_nlp(audio_path)

        # Step 6 — Fusion
        set_status(job_id, "Fusing signals...")
        fused = fuse_signals(audio_data, visual_data, nlp_data)

        # Step 7 — Drop zones
        set_status(job_id, "Detecting drop zones...")
        drop_zones = detect_drop_zones(fused, top_n=3)

        # Step 8 — Summary
        summary = compute_summary(fused)

        # Step 9 — Claude recommendations
        set_status(job_id, "Generating AI recommendations...")
        recs = generate_recommendations(drop_zones)

        # Step 10 — Music suggestions
        set_status(job_id, "Finding music suggestions...")
        for i, zone in enumerate(drop_zones):
            mood = zone.get("musicMood", "upbeat")
            music = get_music_suggestion(mood)
            drop_zones[i]["music"] = music
            # Merge Claude's text into zone
            if i < len(recs.get("zones", [])):
                claude_zone = recs["zones"][i]
                drop_zones[i]["diagnosis"]     = claude_zone.get("diagnosis", "")
                drop_zones[i]["quickFix"]      = claude_zone.get("quickFix", "")
                drop_zones[i]["mediumFix"]     = claude_zone.get("mediumFix", "")
                drop_zones[i]["strategicFix"]  = claude_zone.get("strategicFix", "")

        set_status(job_id, "Done", done=True)

        result = {
            "jobId":          job_id,
            "timeline":       fused,
            "dropZones":      drop_zones,
            "summary":        summary,
            "overallVerdict": recs.get("overallVerdict", ""),
            "totalSeconds":   len(fused),
        }

        # Auto-save to demo cache
        cache_path = os.path.join(DEMO_CACHE_DIR, f"{job_id}.json")
        with open(cache_path, "w") as f:
            json.dump(result, f)

        return JSONResponse(content=result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    finally:
        # Cleanup temp files
        _cleanup(video_path, audio_path, frames_path)


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _extract_audio(video_path: str, audio_path: str):
    cmd = [
        FFMPEG, "-y", "-i", video_path,   # ← FFMPEG variable, not bare "ffmpeg"
        "-vn", "-acodec", "pcm_s16le",
        "-ar", "16000", "-ac", "1",
        audio_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg audio extraction failed: {result.stderr}")


def _extract_frames(video_path: str, frames_path: str):
    cmd = [
        FFMPEG, "-y", "-i", video_path,   # ← FFMPEG variable, not bare "ffmpeg"
        "-vf", "fps=1",
        "-q:v", "3",
        os.path.join(frames_path, "frame_%04d.jpg")
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg frame extraction failed: {result.stderr}")


def _cleanup(*paths):
    import shutil
    for p in paths:
        try:
            if os.path.isfile(p):
                os.remove(p)
            elif os.path.isdir(p):
                shutil.rmtree(p)
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)