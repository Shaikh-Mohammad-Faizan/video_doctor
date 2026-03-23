export function ScoreCards({ summary = {}, verdict = "" }) {
  const cards = [
    { label: "Overall Score",  value: summary.overall,   color: scoreColor(summary.overall) },
    { label: "Voice Health",   value: summary.voice,     color: scoreColor(summary.voice) },
    { label: "Visual Energy",  value: summary.visual,    color: scoreColor(summary.visual) },
    { label: "Narrative Flow", value: summary.narrative, color: scoreColor(summary.narrative) },
  ];

  return (
    <div style={{ marginBottom: 24, fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 12 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #eee", borderTop: `3px solid ${c.color}`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: c.color }}>{c.value ?? "—"}</div>
            <div style={{ fontSize: 11, color: "#ccc", marginTop: 2 }}>/100</div>
          </div>
        ))}
      </div>
      {verdict && (
        <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderLeft: "3px solid #1D6FA0", borderRadius: "0 8px 8px 0", padding: "10px 14px", fontSize: 13, color: "#444", lineHeight: 1.7 }}>
          <span style={{ fontWeight: 700, color: "#1D6FA0", marginRight: 6 }}>Overall verdict:</span>
          {verdict}
        </div>
      )}
    </div>
  );
}

function scoreColor(score) {
  if (!score && score !== 0) return "#ccc";
  if (score < 40) return "#E24B4A";
  if (score < 60) return "#EF9F27";
  return "#1D9E75";
}

export default ScoreCards;