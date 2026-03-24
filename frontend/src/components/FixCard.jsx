import { useState } from "react";

const SEVERITY = {
  critical: {
    bg: "rgba(239,68,68,0.12)",
    color: "#FCA5A5",
    border: "rgba(239,68,68,0.18)",
    label: "Critical drop",
  },
  needs_work: {
    bg: "rgba(245,158,11,0.12)",
    color: "#FCD34D",
    border: "rgba(245,158,11,0.18)",
    label: "Needs improvement",
  },
  mild: {
    bg: "rgba(250,204,21,0.12)",
    color: "#FDE68A",
    border: "rgba(250,204,21,0.18)",
    label: "Mild dip",
  },
};

const CAUSES = {
  audio: {
    bg: "rgba(124,58,237,0.12)",
    color: "#C4B5FD",
    label: "Voice energy",
  },
  visual: {
    bg: "rgba(34,197,94,0.12)",
    color: "#86EFAC",
    label: "Visual activity",
  },
  nlp: {
    bg: "rgba(245,158,11,0.12)",
    color: "#FCD34D",
    label: "Speech & words",
  },
};

function FixCard({ zone, onSeek }) {
  const [open, setOpen] = useState(true);
  const sev = SEVERITY[zone.severity] || SEVERITY.needs_work;
  const primaryCauseLabel = CAUSES[zone.primaryCause]?.label || zone.primaryCause;

  return (
    <div
      style={{
        borderRadius: 22,
        border: "1px solid rgba(229,231,235,0.08)",
        overflow: "hidden",
        background: "rgba(255,255,255,0.02)",
        marginBottom: 16,
      }}
    >
      <div
        onClick={() => setOpen((prev) => !prev)}
        style={{
          padding: "16px 18px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          borderBottom: open ? "1px solid rgba(229,231,235,0.06)" : "none",
        }}
      >
        <span
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            background: sev.bg,
            color: sev.color,
            border: `1px solid ${sev.border}`,
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          {sev.label}
        </span>

        <span
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.05)",
            color: "#E5E7EB",
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          {zone.timestamp}
        </span>

        <span
          style={{
            color: "#E5E7EB",
            fontSize: 14,
            fontWeight: 700,
            flex: 1,
            minWidth: 180,
          }}
        >
          {zone.shortTitle}
        </span>

        <button
          onClick={(event) => {
            event.stopPropagation();
            if (onSeek) onSeek(zone.startSeconds);
          }}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(59,130,246,0.22)",
            background: "linear-gradient(135deg, #3B82F6, #7C3AED)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          ▶ Jump to
        </button>

        <span style={{ color: "#64748B", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ padding: 18 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(59,130,246,0.12)",
                color: "#93C5FD",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              Primary cause: {primaryCauseLabel}
            </span>

            {(zone.causes || []).map((cause) => {
              const cfg = CAUSES[cause] || CAUSES.audio;
              return (
                <span
                  key={cause}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    background: cfg.bg,
                    color: cfg.color,
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {cfg.label}
                </span>
              );
            })}
          </div>

          <div
            style={{
              borderRadius: 18,
              padding: "16px 18px",
              marginBottom: 16,
              background: "linear-gradient(135deg, rgba(59,130,246,0.10), rgba(124,58,237,0.10))",
              border: "1px solid rgba(124,58,237,0.16)",
            }}
          >
            <div
              style={{
                marginBottom: 8,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#C4B5FD",
              }}
            >
              AI diagnosis
            </div>

            <div
              style={{
                color: "#E5E7EB",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              {zone.diagnosis || "Engagement dipped in this segment."}
            </div>
          </div>

          {zone.signals && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
                marginBottom: 18,
              }}
              className="fixcard-signals"
            >
              {zone.signals.map((signal) => {
                const barColor =
                  signal.score < 0.34
                    ? "#EF4444"
                    : signal.score < 0.55
                    ? "#F59E0B"
                    : signal.score < 0.74
                    ? "#FACC15"
                    : "#22C55E";

                return (
                  <div
                    key={signal.name}
                    style={{
                      borderRadius: 18,
                      padding: "14px",
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(229,231,235,0.06)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "#94A3B8",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: 800,
                        marginBottom: 10,
                      }}
                    >
                      {signal.name}
                    </div>

                    <div
                      style={{
                        height: 8,
                        borderRadius: 999,
                        overflow: "hidden",
                        background: "rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        style={{
                          width: `${signal.score * 100}%`,
                          height: "100%",
                          background: barColor,
                          boxShadow: `0 0 14px ${barColor}`,
                        }}
                      />
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 12,
                        color: "#CBD5E1",
                        fontWeight: 600,
                      }}
                    >
                      {signal.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div
            style={{
              marginBottom: 10,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#94A3B8",
            }}
          >
            Recommended improvements
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                borderRadius: 16,
                padding: "14px 16px",
                background: "rgba(34,197,94,0.10)",
                border: "1px solid rgba(34,197,94,0.14)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#86EFAC",
                  }}
                >
                  Quick fix
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "#94A3B8",
                  }}
                >
                  Fast post-production improvement
                </div>
              </div>

              <ul style={{ margin: 0, paddingLeft: 18, color: "#E5E7EB", lineHeight: 1.75 }}>
                {(zone.quickFixes || []).map((fix, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {fix}
                  </li>
                ))}
              </ul>
            </div>

            {zone.mediumFix && (
              <div
                style={{
                  borderRadius: 16,
                  padding: "14px 16px",
                  background: "rgba(245,158,11,0.10)",
                  border: "1px solid rgba(245,158,11,0.14)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#FCD34D",
                    }}
                  >
                    Medium fix
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "#94A3B8",
                    }}
                  >
                    Better segment-level correction
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "#E5E7EB",
                    lineHeight: 1.75,
                  }}
                >
                  {zone.mediumFix}
                </div>
              </div>
            )}

            {zone.strategicFix && (
              <div
                style={{
                  borderRadius: 16,
                  padding: "14px 16px",
                  background: "rgba(59,130,246,0.10)",
                  border: "1px solid rgba(59,130,246,0.14)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#93C5FD",
                    }}
                  >
                    Strategic fix
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "#94A3B8",
                    }}
                  >
                    Future-video improvement
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "#E5E7EB",
                    lineHeight: 1.75,
                  }}
                >
                  {zone.strategicFix}
                </div>
              </div>
            )}
          </div>

          <style>{`
            @media (max-width: 720px) {
              .fixcard-signals {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

export default function FixCards({ zones = [], onSeek }) {
  if (!zones.length) {
    return (
      <div
        style={{
          borderRadius: 20,
          padding: "18px",
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.16)",
          color: "#86EFAC",
          fontWeight: 700,
        }}
      >
        No major attention drops detected. This run looks consistently strong.
      </div>
    );
  }

  const counts = { critical: 0, needs_work: 0, mild: 0 };
  zones.forEach((zone) => {
    if (counts[zone.severity] !== undefined) counts[zone.severity] += 1;
  });

  return (
    <div>
      <div
        style={{
          marginBottom: 14,
          borderRadius: 18,
          padding: "14px 16px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(229,231,235,0.08)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: "#E5E7EB",
          }}
        >
          {zones.length} attention zone{zones.length !== 1 ? "s" : ""} detected
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(counts)
            .filter(([, value]) => value > 0)
            .map(([key, value]) => {
              const cfg = SEVERITY[key];
              return (
                <span
                  key={key}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 999,
                    background: cfg.bg,
                    color: cfg.color,
                    fontSize: 11,
                    fontWeight: 800,
                    border: `1px solid ${cfg.border}`,
                  }}
                >
                  {value} {cfg.label}
                </span>
              );
            })}
        </div>
      </div>

      {zones.map((zone, index) => (
        <FixCard key={`${zone.timestamp}-${index}`} zone={zone} onSeek={onSeek} />
      ))}
    </div>
  );
}