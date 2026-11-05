"use client";

import { tempHexColor, formatTime } from "@/lib/temp-utils";

type Alert = {
  timestamp: number;
  sensor: string;
  message: string;
  level: "safe" | "warm" | "hot" | "critical";
};

type Props = {
  alerts: Alert[];
};

export default function AlertFeed({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-6)",
          height: 320,
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
          No alerts
        </span>
      </div>
    );
  }

  const sorted = [...alerts].sort((a, b) => b.timestamp - a.timestamp);

  const borderColorForLevel = (level: string) => {
    switch (level) {
      case "safe": return "var(--temp-safe)";
      case "warm": return "var(--temp-warm)";
      case "hot": return "var(--temp-hot)";
      case "critical": return "var(--temp-critical)";
      default: return "var(--border-subtle)";
    }
  };

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
        height: 320,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 11,
          color: "var(--text-secondary)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: "var(--space-2)",
          paddingLeft: "var(--space-2)",
        }}
      >
        Alert Feed
      </div>
      {sorted.map((alert, i) => (
        <div
          key={`${alert.timestamp}-${i}`}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-3)",
            padding: "var(--space-2) var(--space-3)",
            borderLeft: `2px solid ${borderColorForLevel(alert.level)}`,
            animation: i === 0 ? "alert-enter 0.2s ease" : undefined,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              color: "var(--text-muted)",
              flexShrink: 0,
              letterSpacing: "0.02em",
            }}
          >
            [{formatTime(alert.timestamp)}]
          </span>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--text-secondary)",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {alert.sensor}
          </span>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--text-primary)",
            }}
          >
            {alert.message}
          </span>
        </div>
      ))}
    </div>
  );
}
