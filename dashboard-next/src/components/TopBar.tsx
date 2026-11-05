"use client";

import { useEffect, useState } from "react";

type Props = {
  connected: boolean;
  lastUpdate: number | null;
};

export default function TopBar({ connected, lastUpdate }: Props) {
  const [now, setNow] = useState("");

  useEffect(() => {
    const tick = () => {
      setNow(
        new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      style={{
        height: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 var(--space-6)",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        flexShrink: 0,
      }}
    >
      {/* Left: title */}
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 18,
          fontWeight: 500,
          color: "var(--text-primary)",
        }}
      >
        Temperature Monitor
      </span>

      {/* Center: live indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: connected ? "var(--temp-safe)" : "var(--temp-hot)",
            animation: connected ? "live-blink 1s ease-in-out infinite" : undefined,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 13,
            color: connected ? "var(--temp-safe)" : "var(--text-muted)",
            letterSpacing: "0.02em",
          }}
        >
          LIVE · {now}
        </span>
      </div>

      {/* Right: refresh interval */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-4)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.02em",
          }}
        >
          1s refresh
        </span>
        <div
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-secondary)",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          ⚙
        </div>
      </div>
    </header>
  );
}
