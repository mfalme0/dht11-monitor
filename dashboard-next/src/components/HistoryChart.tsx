"use client";

import { CHART_COLORS, formatTimeShort } from "@/lib/temp-utils";

type HistoryEntry = {
  temperature: number | null;
  humidity: number | null;
  timestamp: number;
};

type Props = {
  history: HistoryEntry[];
};

export default function HistoryChart({ history }: Props) {
  if (history.length < 2) {
    return (
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-6)",
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          Waiting for data...
        </span>
      </div>
    );
  }

  const temps = history.map((h) => h.temperature).filter((v): v is number => v !== null);
  const hums = history.map((h) => h.humidity).filter((v): v is number => v !== null);

  const chartW = 800;
  const chartH = 160;
  const padL = 45;
  const padR = 10;
  const padT = 10;
  const padB = 30;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  function makeLinePath(
    data: number[],
    min: number,
    max: number
  ): string {
    const range = max - min || 1;
    const step = innerW / (data.length - 1);
    return data
      .map((v, i) => {
        const x = padL + i * step;
        const y = padT + innerH - ((v - min) / range) * innerH;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  const allVals = [...temps, ...hums];
  const globalMin = Math.floor(Math.min(...allVals) - 2);
  const globalMax = Math.ceil(Math.max(...allVals) + 2);

  const tempPath = makeLinePath(temps, globalMin, globalMax);
  const humPath = makeLinePath(hums, 0, 100);

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => {
    const ratio = i / yTicks;
    const val = globalMax - ratio * (globalMax - globalMin);
    const y = padT + ratio * innerH;
    return { val, y };
  });

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-3)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 11,
            color: "var(--text-secondary)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          History
        </span>
        <div style={{ display: "flex", gap: "var(--space-4)" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-display)",
              fontSize: 11,
              color: "var(--text-secondary)",
            }}
          >
            <span
              style={{
                width: 12,
                height: 2,
                background: CHART_COLORS[0],
                borderRadius: 1,
                display: "inline-block",
              }}
            />
            Temp °C
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-display)",
              fontSize: 11,
              color: "var(--text-secondary)",
            }}
          >
            <span
              style={{
                width: 12,
                height: 2,
                background: CHART_COLORS[1],
                borderRadius: 1,
                display: "inline-block",
              }}
            />
            Humidity %
          </span>
        </div>
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${chartW} ${chartH}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        {/* Grid lines */}
        {yTickValues.map((tick, i) => (
          <g key={i}>
            <line
              x1={padL}
              y1={tick.y}
              x2={chartW - padR}
              y2={tick.y}
              stroke="var(--border-subtle)"
              strokeWidth={0.5}
            />
            <text
              x={padL - 8}
              y={tick.y + 4}
              textAnchor="end"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 10,
                fill: "var(--text-muted)",
              }}
            >
              {tick.val.toFixed(0)}
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {history
          .map((h, i) => ({ h, i }))
          .filter(({ i }) => {
            const step = Math.max(1, Math.floor(history.length / 6));
            return i % step === 0 || i === history.length - 1;
          })
          .map(({ h, i }) => {
            const ratio = i / (history.length - 1);
            const x = padL + ratio * innerW;
            return (
              <text
                key={i}
                x={x}
                y={chartH - 4}
                textAnchor="middle"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 9,
                  fill: "var(--text-muted)",
                }}
              >
                {formatTimeShort(h.timestamp)}
              </text>
            );
          })}

        {/* Threshold line */}
        <line
          x1={padL}
          y1={padT + innerH - ((50 - globalMin) / (globalMax - globalMin)) * innerH}
          x2={chartW - padR}
          y2={padT + innerH - ((50 - globalMin) / (globalMax - globalMin)) * innerH}
          stroke="var(--temp-warm)"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.5}
        />

        {/* Temperature line */}
        <path d={tempPath} fill="none" stroke={CHART_COLORS[0]} strokeWidth={1.5} />

        {/* Humidity line */}
        <path
          d={makeLinePath(hums, 0, 100)}
          fill="none"
          stroke={CHART_COLORS[1]}
          strokeWidth={1.5}
          opacity={0.6}
        />
      </svg>
    </div>
  );
}
