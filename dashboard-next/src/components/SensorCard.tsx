"use client";

import { tempColor, sparklinePath } from "@/lib/temp-utils";

type Props = {
  id: string;
  label: string;
  value: number | null;
  history: number[];
  min?: number;
  max?: number;
  avg?: number;
  thresholdWarn?: number;
  thresholdCrit?: number;
  unit?: string;
};

export default function SensorCard({
  id,
  label,
  value,
  history,
  min,
  max,
  avg,
  thresholdWarn = 50,
  thresholdCrit = 90,
  unit = "°C",
}: Props) {
  const color = value !== null ? tempColor(value) : "var(--text-muted)";
  const historyMin = history.length > 0 ? Math.min(...history) : min;
  const historyMax = history.length > 0 ? Math.max(...history) : max;
  const historyAvg =
    history.length > 0
      ? history.reduce((a, b) => a + b, 0) / history.length
      : avg;

  const sparkD = sparklinePath(history.slice(-60), 200, 40);

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-6)",
        transition: "border-color 0.15s ease, background 0.15s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-active)";
        e.currentTarget.style.background = "var(--bg-raised)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.background = "var(--bg-surface)";
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-4)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
          }}
        />
      </div>

      {/* Value */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 36,
          fontWeight: 600,
          lineHeight: 1.1,
          color,
          letterSpacing: "0.02em",
          marginBottom: "var(--space-4)",
        }}
      >
        {value !== null ? value.toFixed(1) : "--"}{" "}
        <span style={{ fontSize: 18, opacity: 0.7 }}>{unit}</span>
      </div>

      {/* Sparkline */}
      {history.length > 1 && (
        <svg
          width="100%"
          height={40}
          viewBox="0 0 200 40"
          preserveAspectRatio="none"
          style={{ display: "block", marginBottom: "var(--space-3)" }}
        >
          <path
            d={sparkD}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-4)",
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: "var(--space-3)",
        }}
      >
        {[
          { label: "MIN", value: historyMin },
          { label: "MAX", value: historyMax },
          { label: "AVG", value: historyAvg },
        ].map((stat) => (
          <span
            key={stat.label}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              color: "var(--text-secondary)",
              letterSpacing: "0.02em",
            }}
          >
            {stat.label} {stat.value !== null && stat.value !== undefined ? stat.value.toFixed(1) : "--"}
          </span>
        ))}
      </div>
    </div>
  );
}
