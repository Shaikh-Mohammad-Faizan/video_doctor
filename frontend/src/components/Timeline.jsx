import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function zoneColor(score) {
  if (score < 0.34) return "#EF4444";
  if (score < 0.55) return "#F59E0B";
  if (score < 0.74) return "#FACC15";
  return "#22C55E";
}

function zoneLabel(score) {
  if (score < 0.34) return "Critical drop";
  if (score < 0.55) return "Needs improvement";
  if (score < 0.74) return "Stable";
  return "Strong engagement";
}

function causeLabel(cause) {
  if (cause === "audio") return "Voice energy";
  if (cause === "visual") return "Visual activity";
  if (cause === "nlp") return "Speech clarity";
  return "Signal mix";
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function signalPercent(value) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  const score = point?.score ?? 0;
  const color = zoneColor(score);

  return (
    <div
      style={{
        minWidth: 280,
        maxWidth: 340,
        borderRadius: 18,
        padding: "14px 16px",
        background: "rgba(17,24,39,0.97)",
        border: "1px solid rgba(229,231,235,0.08)",
        boxShadow: "0 16px 28px rgba(0,0,0,0.30)",
      }}
    >
      <div style={{ color: "#9CA3AF", fontSize: 12, marginBottom: 6 }}>
        {formatTime(label)}
      </div>

      <div style={{ fontSize: 15, fontWeight: 800, color: "#E5E7EB", marginBottom: 4 }}>
        Engagement: {Math.round(score * 100)}%
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, color, marginBottom: 8 }}>
        {zoneLabel(score)}
      </div>

      <div
        style={{
          display: "inline-flex",
          padding: "6px 10px",
          borderRadius: 999,
          background: "rgba(59,130,246,0.12)",
          color: "#93C5FD",
          fontSize: 11,
          fontWeight: 800,
          marginBottom: 10,
        }}
      >
        Primary cause: {causeLabel(point?.primaryCause)}
      </div>

      <div
        style={{
          color: "#CBD5E1",
          fontSize: 12,
          lineHeight: 1.65,
          marginBottom: 10,
        }}
      >
        {point?.reason || "Signal balance determines engagement at this point."}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {[
          { label: "Voice", value: point?.audio },
          { label: "Visual", value: point?.visual },
          { label: "Words", value: point?.nlp },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              borderRadius: 12,
              padding: "8px 9px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(229,231,235,0.05)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#94A3B8",
                marginBottom: 4,
                fontWeight: 800,
              }}
            >
              {item.label}
            </div>
            <div style={{ fontSize: 12, color: "#E5E7EB", fontWeight: 700 }}>
              {signalPercent(item.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Timeline({
  data = [],
  dropZones = [],
  viralBaseline = [],
  onSeek,
}) {
  if (!data.length) return null;

  const baselineMap = new Map(viralBaseline.map((item) => [item.t, item.score]));

  const chartData = data.map((point) => ({
    ...point,
    viral: baselineMap.get(point.t) ?? null,
  }));

  function handleChartClick(event) {
    if (event?.activeLabel !== undefined && onSeek) {
      onSeek(Number(event.activeLabel));
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 18,
          color: "#9CA3AF",
          fontSize: 13,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#22C55E",
              boxShadow: "0 0 14px rgba(34,197,94,0.5)",
            }}
          />
          Strong
        </span>

        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#FACC15",
              boxShadow: "0 0 14px rgba(250,204,21,0.4)",
            }}
          />
          Stable
        </span>

        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#F59E0B",
              boxShadow: "0 0 14px rgba(245,158,11,0.45)",
            }}
          />
          Needs improvement
        </span>

        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#EF4444",
              boxShadow: "0 0 14px rgba(239,68,68,0.45)",
            }}
          />
          Critical drop
        </span>

        <span style={{ marginLeft: "auto", color: "#6B7280" }}>
          Click any point to jump to that second
        </span>
      </div>

      <div
        style={{
          width: "100%",
          height: 360,
          borderRadius: 22,
          padding: "12px 8px 0",
          background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
          border: "1px solid rgba(229,231,235,0.06)",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            onClick={handleChartClick}
            style={{ cursor: onSeek ? "pointer" : "default" }}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="engagementStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#7C3AED" />
              </linearGradient>

              <linearGradient id="engagementFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="4 4" stroke="rgba(156,163,175,0.12)" vertical={false} />

            <XAxis
              dataKey="t"
              tickFormatter={formatTime}
              tick={{ fill: "#94A3B8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              domain={[0, 1]}
              tickFormatter={(value) => `${Math.round(value * 100)}%`}
              tick={{ fill: "#94A3B8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />

            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine
              y={0.34}
              stroke="#EF4444"
              strokeDasharray="6 6"
              strokeOpacity={0.45}
            />
            <ReferenceLine
              y={0.55}
              stroke="#F59E0B"
              strokeDasharray="6 6"
              strokeOpacity={0.45}
            />
            <ReferenceLine
              y={0.74}
              stroke="#FACC15"
              strokeDasharray="6 6"
              strokeOpacity={0.35}
            />

            {dropZones.map((zone, index) => (
              <ReferenceLine
                key={`${zone.start}-${index}`}
                x={zone.start}
                stroke="#EF4444"
                strokeDasharray="5 5"
                strokeOpacity={0.6}
              />
            ))}

            <Area
              type="monotone"
              dataKey="score"
              stroke="url(#engagementStroke)"
              strokeWidth={3}
              fill="url(#engagementFill)"
              dot={false}
              activeDot={{
                r: 6,
                fill: "#3B82F6",
                stroke: "#E5E7EB",
                strokeWidth: 2,
              }}
            />

            {viralBaseline.length > 0 && (
              <Line
                type="monotone"
                dataKey="viral"
                stroke="#22C55E"
                strokeWidth={2}
                strokeDasharray="8 5"
                dot={false}
                opacity={0.75}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {dropZones.length > 0 && (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {dropZones.map((zone, index) => (
            <button
              key={`${zone.timestamp}-${index}`}
              onClick={() => onSeek && onSeek(zone.startSeconds)}
              style={{
                border: "1px solid rgba(245,158,11,0.22)",
                borderRadius: 999,
                padding: "9px 14px",
                background: "rgba(245,158,11,0.1)",
                color: "#FCD34D",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {zone.timestamp} · {zone.shortTitle}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}