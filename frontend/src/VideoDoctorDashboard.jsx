import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Timeline from "./components/Timeline";
import FixCards from "./components/FixCard";
import ScoreCards from "./components/ScoreCards";
import Upload from "./components/Upload";
import "./App.css";
import { useAuth } from "./context/AuthContext";

const API = "http://localhost:8000";

const PROCESS_STEPS = [
  "Uploading video",
  "Extracting audio",
  "Scanning video frames",
  "Analyzing voice energy",
  "Analyzing visual activity",
  "Reading transcript",
  "Fusing signals",
  "Detecting drop zones",
  "Generating AI recommendations",
  "Finding music suggestions",
  "Done",
];

function formatDuration(totalSeconds = 0) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function App() {
  const { user, logout } = useAuth();

  const [page, setPage] = useState("upload");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [viralBaseline, setViralBaseline] = useState([]);
  const [showViral, setShowViral] = useState(false);
  const [videoURL, setVideoURL] = useState(null);
  const [processingIndex, setProcessingIndex] = useState(0);

  const videoRef = useRef(null);

  useEffect(() => {
    if (page !== "processing") return undefined;

    setProcessingIndex(0);

    const interval = window.setInterval(() => {
      setProcessingIndex((prev) => {
        if (prev >= PROCESS_STEPS.length - 2) return prev;
        return prev + 1;
      });
    }, 1200);

    return () => window.clearInterval(interval);
  }, [page]);

  useEffect(() => {
    return () => {
      if (videoURL) URL.revokeObjectURL(videoURL);
    };
  }, [videoURL]);

  const overviewStats = useMemo(() => {
    if (!result) {
      return {
        totalSeconds: 0,
        dropCount: 0,
        averageScore: 0,
      };
    }

    return {
      totalSeconds: result.totalSeconds || 0,
      dropCount: result.dropZones?.length || 0,
      averageScore: result.summary?.overall || 0,
    };
  }, [result]);

  async function fetchBaseline() {
    try {
      const response = await axios.get(`${API}/viral-baseline`);
      setViralBaseline(response.data.baseline || []);
    } catch {
      setViralBaseline([]);
    }
  }

  async function handleUpload(file) {
    setError(null);
    setResult(null);
    setPage("processing");
    setShowViral(false);

    if (videoURL) URL.revokeObjectURL(videoURL);
    setVideoURL(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API}/analyze`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProcessingIndex(PROCESS_STEPS.length - 1);
      setResult(response.data);
      await fetchBaseline();
      setPage("results");
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
      setPage("upload");
    }
  }

  async function loadDemo(name = "demo1") {
    setError(null);
    setShowViral(false);

    try {
      const response = await axios.get(`${API}/demo/${name}`);
      setResult(response.data);
      await fetchBaseline();
      setVideoURL(null);
      setPage("results");
    } catch {
      setError("Demo cache not found. Run the backend first to generate it.");
      setPage("upload");
    }
  }

  function handleSeek(seconds) {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    videoRef.current.play();
  }

  function resetApp() {
    setPage("upload");
    setResult(null);
    setError(null);
    setShowViral(false);
    setViralBaseline([]);
    setProcessingIndex(0);

    if (videoURL) URL.revokeObjectURL(videoURL);
    setVideoURL(null);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">VD</div>
          <div>
            <div className="brand-title">Video Doctor</div>
            <div className="brand-subtitle">AI Content Analyzer</div>
          </div>
        </div>

        <div className="topbar-meta">
          <span className="meta-pill">
            {user?.full_name || user?.email || "User"}
          </span>

          <button
            className="meta-pill meta-pill-muted"
            onClick={logout}
            style={{
              cursor: "pointer",
              border: "none",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {page === "upload" && (
        <main className="landing-screen">
          <div className="landing-glow landing-glow-left" />
          <div className="landing-glow landing-glow-right" />

          <section className="hero-panel">
            <div className="hero-copy">
              <div className="eyebrow">Retention intelligence for short-form video</div>
              <h1>
                Know exactly when viewers leave.
                <span className="gradient-text"> And why.</span>
              </h1>
              <p>
                Upload any video and get second-by-second engagement analysis, root-cause
                diagnosis, drop-zone detection, and actionable AI fixes.
              </p>

              <div className="hero-stats">
                <div className="hero-stat-card">
                  <span className="hero-stat-value">3</span>
                  <span className="hero-stat-label">Signal engines</span>
                </div>
                <div className="hero-stat-card">
                  <span className="hero-stat-value">1s</span>
                  <span className="hero-stat-label">Granularity</span>
                </div>
                <div className="hero-stat-card">
                  <span className="hero-stat-value">AI</span>
                  <span className="hero-stat-label">Editor-style fixes</span>
                </div>
              </div>
            </div>

            <div className="upload-panel">
              <Upload onUpload={handleUpload} error={error} />

              <div className="upload-actions">
                <button className="secondary-btn" onClick={() => loadDemo("demo1")}>
                  Load demo result
                </button>
              </div>
            </div>
          </section>
        </main>
      )}

      {page === "processing" && (
        <main className="processing-screen">
          <section className="processing-panel">
            <div className="processing-badge">Live analysis in progress</div>
            <h2>Analyzing your video</h2>
            <p>
              Audio, visuals, and language signals are being fused into one engagement map.
            </p>

            <div className="processing-progress">
              <div
                className="processing-progress-bar"
                style={{
                  width: `${((processingIndex + 1) / PROCESS_STEPS.length) * 100}%`,
                }}
              />
            </div>

            <div className="steps-grid">
              {PROCESS_STEPS.map((step, index) => {
                const state =
                  index < processingIndex
                    ? "done"
                    : index === processingIndex
                    ? "active"
                    : "pending";

                return (
                  <div key={step} className={`step-card step-card-${state}`}>
                    <div className="step-indicator" />
                    <div className="step-content">
                      <div className="step-title">{step}</div>
                      <div className="step-subtitle">
                        {state === "done"
                          ? "Completed"
                          : state === "active"
                          ? "In progress"
                          : "Waiting"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      )}

      {page === "results" && result && (
        <main className="dashboard-screen">
          <aside className="dashboard-sidebar">
            <div className="sidebar-card sidebar-card-gradient">
              <div className="sidebar-label">Current analysis</div>
              <div className="sidebar-title">Retention breakdown</div>
              <div className="sidebar-description">
                Second-by-second engagement, root causes, and fast editing fixes.
              </div>
            </div>

            <div className="sidebar-card">
              <div className="sidebar-section-title">Overview</div>
              <div className="sidebar-metric">
                <span>Total runtime</span>
                <strong>{formatDuration(overviewStats.totalSeconds)}</strong>
              </div>
              <div className="sidebar-metric">
                <span>Drop zones</span>
                <strong>{overviewStats.dropCount}</strong>
              </div>
              <div className="sidebar-metric">
                <span>Overall score</span>
                <strong>{overviewStats.averageScore}/100</strong>
              </div>
            </div>

            <div className="sidebar-card">
              <div className="sidebar-section-title">Legend</div>
              <div className="legend-item">
                <span className="legend-dot legend-dot-good" />
                <span>Engaged</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot legend-dot-risk" />
                <span>Risk zone</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot legend-dot-drop" />
                <span>Drop zone</span>
              </div>
            </div>

            <button className="primary-btn sidebar-btn" onClick={resetApp}>
              Analyze another video
            </button>
          </aside>

          <section className="dashboard-main">
            <div className="dashboard-grid">
              <ScoreCards summary={result.summary} verdict={result.overallVerdict} />

              <section className="dashboard-card dashboard-card-lg">
                <div className="card-header">
                  <div>
                    <div className="section-eyebrow">Engagement intelligence</div>
                    <h3>Engagement timeline</h3>
                  </div>

                  <button
                    className={`ghost-toggle ${showViral ? "ghost-toggle-active" : ""}`}
                    onClick={() => setShowViral((prev) => !prev)}
                  >
                    {showViral ? "Hide viral baseline" : "Compare with viral baseline"}
                  </button>
                </div>

                <Timeline
                  data={result.timeline}
                  dropZones={result.dropZones}
                  viralBaseline={showViral ? viralBaseline : []}
                  onSeek={handleSeek}
                />
              </section>

              <section className="media-grid">
                <div className="dashboard-card media-card">
                  <div className="card-header">
                    <div>
                      <div className="section-eyebrow">Source preview</div>
                      <h3>Video playback</h3>
                    </div>
                  </div>

                  {videoURL ? (
                    <video ref={videoRef} src={videoURL} controls className="video-player" />
                  ) : (
                    <div className="empty-video-state">
                      <div className="empty-video-icon">▶</div>
                      <p>Demo result loaded. Upload a real video to enable synchronized playback.</p>
                    </div>
                  )}
                </div>

                <div className="dashboard-card media-card">
                  <div className="card-header">
                    <div>
                      <div className="section-eyebrow">Detected issues</div>
                      <h3>AI fix cards</h3>
                    </div>
                  </div>

                  <FixCards zones={result.dropZones} onSeek={handleSeek} />
                </div>
              </section>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}