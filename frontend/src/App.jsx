import { useState, useRef } from "react";
import axios from "axios";
import Timeline from "./components/Timeline";
import FixCards from "./components/FixCard";
import ScoreCards from "./components/ScoreCards";
import Upload from "./components/Upload";
import "./App.css";

const API = "http://localhost:8000";

export default function App() {
  const [page, setPage]           = useState("upload");
  const [result, setResult]       = useState(null);
  const [status, setStatus]       = useState([]);
  const [error, setError]         = useState(null);
  const [viralBaseline, setViral] = useState([]);
  const [showViral, setShowViral] = useState(false);
  const videoRef = useRef(null);
  const [videoURL, setVideoURL]   = useState(null);

  const STEPS = [
    "Uploading video...",
    "Extracting audio...",
    "Scanning video frames...",
    "Analyzing voice energy...",
    "Analyzing visual activity...",
    "Reading transcript...",
    "Fusing signals...",
    "Detecting drop zones...",
    "Generating AI recommendations...",
    "Finding music suggestions...",
    "Done",
  ];

  async function handleUpload(file) {
    setError(null);
    setPage("processing");
    setStatus([]);
    setVideoURL(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await axios.post(`${API}/analyze`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: () => {
          setStatus(["Uploading video..."]);
        },
      });

      setResult(resp.data);

      try {
        const vr = await axios.get(`${API}/viral-baseline`);
        setViral(vr.data.baseline);
      } catch (_) {}

      setPage("results");
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
      setPage("upload");
    }
  }

  function handleSeek(seconds) {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  }

  async function loadDemo(name = "demo1") {
    try {
      const resp = await axios.get(`${API}/demo/${name}`);
      setResult(resp.data);
      setPage("results");
      try {
        const vr = await axios.get(`${API}/viral-baseline`);
        setViral(vr.data.baseline);
      } catch (_) {}
    } catch (err) {
      setError("Demo cache not found. Run the backend first to generate it.");
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="logo">Video Doctor</span>
          <span className="logo-sub">AI Content Analyzer</span>
        </div>
        <div className="header-right">
          <span className="header-tag">Recursion 7.0 · PS2 Hook Architect</span>
        </div>
      </header>

      {page === "upload" && (
        <div className="page-center">
          <div className="hero-text">
            <h1>Know exactly when viewers leave.<br />And why.</h1>
            <p>Upload any video. Get the exact second engagement drops, the cause, and how to fix it.</p>
          </div>
          <Upload onUpload={handleUpload} error={error} />
          <button className="demo-btn" onClick={() => loadDemo("demo1")}>
            Load demo video →
          </button>
        </div>
      )}

      {page === "processing" && (
        <div className="page-center">
          <div className="processing-box">
            <div className="processing-title">Analyzing your video...</div>
            <div className="steps-list">
              {STEPS.map((step, i) => (
                <div key={i} className={`step-row ${i < status.length ? "step-done" : i === status.length ? "step-active" : "step-pending"}`}>
                  <span className="step-dot" />
                  <span className="step-text">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {page === "results" && result && (
        <div className="results-page">
          <ScoreCards summary={result.summary} verdict={result.overallVerdict} />
          <div className="timeline-section">
            <div className="section-title">
              Engagement timeline
              <button
                className={`viral-toggle ${showViral ? "active" : ""}`}
                onClick={() => setShowViral(!showViral)}
              >
                {showViral ? "Hide" : "Compare with"} viral baseline
              </button>
            </div>
            <Timeline
              data={result.timeline}
              dropZones={result.dropZones}
              viralBaseline={showViral ? viralBaseline : []}
              onSeek={handleSeek}
            />
            {videoURL && (
              <video
                ref={videoRef}
                src={videoURL}
                controls
                className="video-player"
              />
            )}
          </div>
          <div className="fixcards-section">
            <div className="section-title">
              {result.dropZones.length} drop zone{result.dropZones.length !== 1 ? "s" : ""} detected
            </div>
            <FixCards zones={result.dropZones} onSeek={handleSeek} />
          </div>
          <button className="analyze-another" onClick={() => { setPage("upload"); setResult(null); setVideoURL(null); }}>
            Analyze another video
          </button>
        </div>
      )}
    </div>
  );
}