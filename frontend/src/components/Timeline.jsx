import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Line, ComposedChart
} from "recharts";

function zoneColor(score) {
  if (score < 0.35) return "#E24B4A";
  if (score < 0.55) return "#EF9F27";
  return "#1D9E75";
}

const CustomDot = () => null;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value;
  const color = zoneColor(score);
  const m = Math.floor(label / 60);
  const s = label % 60;
  return (
    <div style={{
      background: "#fff", border: "1px solid #eee",
      borderRadius: 8, padding: "8px 12px",
      fontSize: 12, fontFamily: "DM Sans, sans-serif",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    }}>
      <div style={{ color: "#888", marginBottom: 3 }}>
        {m}:{s.toString().padStart(2, "0")}
      </div>
      <div style={{ fontWeight: 700, color }}>
        Engagement: {Math.round(score * 100)}%
      </div>
      <div style={{ color, fontSize: 11 }}>
        {score < 0.35 ? "Drop zone" : score < 0.55 ? "Risk zone" : "Engaged"}
      </div>
    </div>
  );
};

export default function Timeline({ data = [], dropZones = [], viralBaseline = [], onSeek }) {
  if (!data.length) return null;

  const chartData = data.map(d => ({
    t: d.t,
    score: d.score,
    viral: viralBaseline.find(v => v.t === d.t)?.score ?? null,
  }));

  function handleClick(e) {
    if (e && e.activeLabel !== undefined) {
      onSeek && onSeek(Number(e.activeLabel));
    }
  }

  function fmtTime(t) {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div style={{ width: "100%", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 12, color: "#888", flexWrap: "wrap", alignItems: "center" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#1D9E75", marginRight: 4 }} />Engaged</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#EF9F27", marginRight: 4 }} />Risk zone</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#E24B4A", marginRight: 4 }} />Drop zone</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#aaa" }}>Click any point to jump to that second</span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} onClick={handleClick} style={{ cursor: "pointer" }}>
          <defs>
            <linearGradient id="engagementGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#1D9E75" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="t" tickFormatter={fmtTime} tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`} tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0.35} stroke="#E24B4A" strokeDasharray="4 4" strokeWidth={1} opacity={0.5} />
          <ReferenceLine y={0.55} stroke="#EF9F27" strokeDasharray="4 4" strokeWidth={1} opacity={0.4} />
          {dropZones.map((z, i) => (
            <ReferenceLine key={i} x={z.start} stroke="#E24B4A" strokeWidth={2} strokeDasharray="6 3" opacity={0.7} />
          ))}
          <Area type="monotone" dataKey="score" stroke="#1D9E75" strokeWidth={2} fill="url(#engagementGrad)" dot={<CustomDot />} activeDot={{ r: 5, fill: "#1D9E75", stroke: "#fff", strokeWidth: 2 }} />
          {viralBaseline.length > 0 && (
            <Line type="monotone" dataKey="viral" stroke="#1D9E75" strokeWidth={2} strokeDasharray="6 3" dot={false} opacity={0.5} />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {dropZones.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {dropZones.map((z, i) => (
            <button key={i} onClick={() => onSeek && onSeek(z.startSeconds)} style={{ background: "#FCEBEB", color: "#791F1F", border: "1px solid #F7C1C1", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {z.timestamp} — {z.shortTitle}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}