import { useState } from "react";

const MUSIC_LIBRARY = {
  upbeat:   { genre: "Lo-fi / Upbeat pop",       bpm: "100–130 BPM", color: "#7F77DD", bg: "#EEEDFE" },
  calm:     { genre: "Ambient / Soft instrumental", bpm: "60–80 BPM",  color: "#1D9E75", bg: "#E1F5EE" },
  energetic:{ genre: "EDM / Trap instrumental",  bpm: "128–150 BPM", color: "#D85A30", bg: "#FAECE7" },
  dramatic: { genre: "Cinematic / Orchestral",   bpm: "70–100 BPM",  color: "#BA7517", bg: "#FAEEDA" },
  emotional:{ genre: "Soft piano / Acoustic",    bpm: "60–75 BPM",   color: "#D4537E", bg: "#FBEAF0" },
};

const SEVERITY = {
  critical: { bg: "#FCEBEB", color: "#791F1F", label: "Critical drop" },
  risk:     { bg: "#FAEEDA", color: "#633806", label: "Risk zone" },
  mild:     { bg: "#E1F5EE", color: "#085041", label: "Mild dip" },
};

const CAUSES = {
  audio:  { bg: "#EEEDFE", color: "#3C3489", label: "Voice energy" },
  visual: { bg: "#E1F5EE", color: "#085041", label: "Visual activity" },
  nlp:    { bg: "#FAECE7", color: "#712B13", label: "Speech & words" },
};

function MusicSection({ music }) {
  const [open, setOpen] = useState(false);
  if (!music) return null;
  const mood = music.mood || "upbeat";
  const lib = MUSIC_LIBRARY[mood] || MUSIC_LIBRARY.upbeat;

  return (
    <div style={{ marginTop: 12, border: `1px solid ${lib.color}30`, borderRadius: 10, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: lib.bg, cursor: "pointer" }}>
        <span style={{ fontSize: 14 }}>🎵</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: lib.color, flex: 1 }}>Music suggestion — {lib.genre}</span>
        <span style={{ fontSize: 11, color: lib.color, opacity: 0.7 }}>{lib.bpm}</span>
        <span style={{ fontSize: 11, color: lib.color }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "12px 14px", background: "#fff" }}>
          <p style={{ fontSize: 12, color: "#444", marginBottom: 10, lineHeight: 1.6 }}>{music.suggestion}</p>
          {music.source === "trending" && music.songs?.length > 0 ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6, textTransform: "uppercase" }}>Trending royalty-free tracks</div>
              {music.songs.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: i % 2 === 0 ? "#f8f8f8" : "#fff", borderRadius: 6, marginBottom: 4 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: lib.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: lib.color, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#222" }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{s.channel}</div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div style={{ background: lib.bg, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 12, color: lib.color, fontWeight: 600, marginBottom: 4 }}>Where to find free tracks</div>
              <div style={{ fontSize: 12, color: lib.color }}>{music.find_at} — search "{music.search}"</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FixCard({ zone, onSeek }) {
  const [open, setOpen] = useState(true);
  const sev = SEVERITY[zone.severity] || SEVERITY.risk;

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, marginBottom: 10, overflow: "hidden", fontFamily: "DM Sans, sans-serif" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", cursor: "pointer", flexWrap: "wrap", borderBottom: open ? "1px solid #f0f0f0" : "none" }}>
        <span style={{ background: sev.bg, color: sev.color, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>{sev.label}</span>
        <span style={{ background: "#f0f0f0", color: "#333", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>{zone.timestamp}</span>
        <span style={{ flex: 1, fontSize: 12, color: "#555" }}>{zone.shortTitle}</span>
        <span style={{ display: "flex", gap: 5 }}>
          {(zone.causes || []).map(c => {
            const cfg = CAUSES[c] || CAUSES.audio;
            return <span key={c} style={{ background: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>{cfg.label}</span>;
          })}
        </span>
        <button onClick={e => { e.stopPropagation(); onSeek && onSeek(zone.startSeconds); }} style={{ background: "#111", color: "#fff", border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700, padding: "5px 10px", cursor: "pointer" }}>▶ Jump to</button>
        <span style={{ color: "#bbb", fontSize: 11 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ padding: "14px 16px" }}>
          <div style={{ background: "#fafafa", borderLeft: `3px solid ${sev.color}`, borderRadius: "0 8px 8px 0", padding: "10px 12px", marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>AI diagnosis</div>
            <div style={{ fontSize: 13, color: "#222", lineHeight: 1.7 }}>{zone.diagnosis || "Engagement dropped significantly in this zone."}</div>
          </div>

          {zone.signals && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {zone.signals.map(s => (
                <div key={s.name} style={{ flex: 1, background: "#f8f8f8", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", marginBottom: 4 }}>{s.name}</div>
                  <div style={{ height: 5, background: "#e8e8e8", borderRadius: 3, marginBottom: 5, overflow: "hidden" }}>
                    <div style={{ width: `${s.score * 100}%`, height: "100%", borderRadius: 3, background: s.score < 0.35 ? "#E24B4A" : s.score < 0.55 ? "#EF9F27" : "#1D9E75" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#666" }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>How to fix it</div>
          {[
            { level: "Quick fix — 5 minutes", text: zone.quickFix, bg: "#E1F5EE", color: "#085041" },
            { level: "Medium fix — reshoot",  text: zone.mediumFix, bg: "#FAEEDA", color: "#633806" },
            { level: "Strategic fix — next video", text: zone.strategicFix, bg: "#E6F1FB", color: "#0C447C" },
          ].map((f, i) => f.text && (
            <div key={i} style={{ background: f.bg, borderRadius: 8, padding: "9px 11px", marginBottom: 5 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: f.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{f.level}</div>
              <div style={{ fontSize: 12, color: "#333", lineHeight: 1.5 }}>{f.text}</div>
            </div>
          ))}

          <MusicSection music={zone.music} />
        </div>
      )}
    </div>
  );
}

export default function FixCards({ zones = [], onSeek }) {
  if (!zones.length) return null;

  const counts = { critical: 0, risk: 0, mild: 0 };
  zones.forEach(z => { if (counts[z.severity] !== undefined) counts[z.severity]++; });

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "10px 14px", background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#222" }}>{zones.length} drop zone{zones.length !== 1 ? "s" : ""} detected</div>
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => {
            const cfg = SEVERITY[k];
            return <span key={k} style={{ background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{v} {cfg.label}</span>;
          })}
        </div>
      </div>
      {zones.map((zone, i) => <FixCard key={i} zone={zone} onSeek={onSeek} />)}
    </div>
  );
}