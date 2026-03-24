function scoreColor(score) {
  if (score === null || score === undefined) return "#9CA3AF";
  if (score < 40) return "#EF4444";
  if (score < 70) return "#F59E0B";
  return "#22C55E";
}

function scoreTone(score) {
  if (score === null || score === undefined) return "No data";
  if (score < 40) return "Needs work";
  if (score < 70) return "Moderate";
  return "Strong";
}

export function ScoreCards({ summary = {}, verdict = "" }) {
  const cards = [
    { label: "Overall Score", value: summary.overall },
    { label: "Voice Health", value: summary.voice },
    { label: "Visual Energy", value: summary.visual },
    { label: "Narrative Flow", value: summary.narrative },
  ];

  return (
    <section className="dashboard-card">
      <div className="card-header">
        <div>
          <div className="section-eyebrow">Summary metrics</div>
          <h3>Performance overview</h3>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
        }}
        className="scorecards-grid"
      >
        {cards.map((card) => {
          const color = scoreColor(card.value);

          return (
            <div
              key={card.label}
              style={{
                borderRadius: 20,
                padding: "18px 18px 16px",
                background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                border: "1px solid rgba(229,231,235,0.08)",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#9CA3AF",
                  fontWeight: 700,
                }}
              >
                {card.label}
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 42,
                    lineHeight: 1,
                    fontWeight: 800,
                    letterSpacing: "-0.05em",
                    color,
                  }}
                >
                  {card.value ?? "—"}
                </span>
                <span style={{ color: "#6B7280", fontSize: 14 }}>/100</span>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "inline-flex",
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  color,
                  background:
                    card.value < 40
                      ? "rgba(239,68,68,0.12)"
                      : card.value < 70
                      ? "rgba(245,158,11,0.12)"
                      : "rgba(34,197,94,0.12)",
                }}
              >
                {scoreTone(card.value)}
              </div>
            </div>
          );
        })}
      </div>

      {verdict && (
        <div
          style={{
            marginTop: 18,
            borderRadius: 18,
            padding: "16px 18px",
            border: "1px solid rgba(59,130,246,0.18)",
            background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(124,58,237,0.08))",
            color: "#E5E7EB",
            lineHeight: 1.7,
          }}
        >
          <span style={{ fontWeight: 800, color: "#93C5FD" }}>Overall verdict:</span>{" "}
          <span style={{ color: "#CBD5E1" }}>{verdict}</span>
        </div>
      )}

      <style>{`
        @media (max-width: 980px) {
          .scorecards-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 560px) {
          .scorecards-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

export default ScoreCards;