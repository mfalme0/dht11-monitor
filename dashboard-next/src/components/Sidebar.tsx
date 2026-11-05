"use client";

import { useState, useEffect } from "react";

type Props = {
  collapsed: boolean;
};

const NAV_ITEMS = [
  { icon: "◉", label: "Dashboard", active: true },
  { icon: "◈", label: "Sensors" },
  { icon: "◫", label: "History" },
  { icon: "⚙", label: "Settings" },
];

export default function Sidebar({ collapsed }: Props) {
  const [uptime, setUptime] = useState("--");

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      setUptime(h > 0 ? `${h}h ${m}m` : `${m}m`);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside
      style={{
        width: collapsed ? 60 : 220,
        minHeight: "100%",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        padding: collapsed ? "var(--space-4) 0" : "var(--space-6)",
        transition: "width 0.2s ease",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          marginBottom: "var(--space-8)",
          padding: collapsed ? "0" : "0 var(--space-1)",
        }}
      >
        {collapsed ? (
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 700,
              color: "var(--accent)",
              textAlign: "center",
              letterSpacing: "0.15em",
            }}
          >
            TW
          </div>
        ) : (
          <>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              TEMPWATCH
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 11,
                color: "var(--text-muted)",
                marginTop: 2,
                letterSpacing: "0.02em",
              }}
            >
              v2.1.0
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {NAV_ITEMS.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: collapsed
                ? "var(--space-3) 0"
                : "var(--space-3) var(--space-4)",
              marginBottom: "var(--space-1)",
              borderLeft: item.active
                ? "2px solid var(--accent)"
                : "2px solid transparent",
              background: item.active ? "var(--accent-dim)" : "transparent",
              cursor: "pointer",
              transition: "background 0.15s ease",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
            onMouseEnter={(e) => {
              if (!item.active) e.currentTarget.style.background = "var(--bg-raised)";
            }}
            onMouseLeave={(e) => {
              if (!item.active) e.currentTarget.style.background = "transparent";
            }}
          >
            <span
              style={{
                fontSize: 16,
                color: item.active ? "var(--accent)" : "var(--text-secondary)",
                width: 20,
                textAlign: "center",
              }}
            >
              {item.icon}
            </span>
            {!collapsed && (
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  color: item.active ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: item.active ? 600 : 400,
                }}
              >
                {item.label}
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Docker badge */}
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: "var(--space-4)",
          padding: collapsed
            ? "var(--space-4) 0"
            : "var(--space-4) var(--space-1)",
        }}
      >
        {!collapsed && (
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 11,
              color: "var(--text-muted)",
              marginBottom: "var(--space-2)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            Container
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? 0 : "0 var(--space-1)",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--temp-safe)",
              flexShrink: 0,
            }}
          />
          {!collapsed && (
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 11,
                color: "var(--text-secondary)",
                lineHeight: 1.3,
              }}
            >
              <div>dht11-dashboard</div>
              <div style={{ color: "var(--text-muted)", marginTop: 1 }}>
                up {uptime}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
