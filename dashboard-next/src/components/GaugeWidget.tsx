"use client";

import { useEffect, useRef, useState } from "react";
import { tempColorRaw, gaugeArc } from "@/lib/temp-utils";

type Props = {
  value: number | null;
  min?: number;
  max?: number;
  label?: string;
  containerName?: string;
};

const SVG_SIZE = 280;
const CENTER = SVG_SIZE / 2;
const RADIUS = 120;
const TRACK_WIDTH = 2;
const FILL_WIDTH = 8;
const ARC_START = 135;
const ARC_TOTAL = 220;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, start: number, sweep: number) {
  const s = polarToCartesian(cx, cy, r, start);
  const e = polarToCartesian(cx, cy, r, start + sweep);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
}

const CIRCUMFERENCE = (2 * Math.PI * RADIUS * ARC_TOTAL) / 360;

export default function GaugeWidget({
  value,
  min = 0,
  max = 120,
  label = "CORE TEMP",
  containerName = "DHT11 Sensor",
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [displayValue, setDisplayValue] = useState(0);
  const animRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || value === null) return;
    const start = displayValue;
    const end = value;
    const duration = 400;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(start + (end - start) * eased);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      }
    }

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [value, mounted]);

  const effectiveValue = value ?? displayValue;
  const sweep = mounted ? gaugeArc(effectiveValue, min, max) : 0;
  const color = tempColorRaw(effectiveValue);
  const shouldPulse = effectiveValue >= 50 && value !== null;

  const trackD = arcPath(CENTER, CENTER, RADIUS, ARC_START, ARC_TOTAL);
  const fillD = arcPath(CENTER, CENTER, RADIUS, ARC_START, sweep);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <svg
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        style={{
          filter: shouldPulse
            ? `drop-shadow(0 0 20px ${color}66)`
            : undefined,
          animation: shouldPulse ? "gauge-pulse 2s ease-in-out infinite" : undefined,
        }}
      >
        {/* Track */}
        <path
          d={trackD}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={TRACK_WIDTH}
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={fillD}
          fill="none"
          stroke={color}
          strokeWidth={FILL_WIDTH}
          strokeLinecap="round"
          style={{
            transition: mounted ? "stroke-dashoffset 0.6s ease-out" : undefined,
          }}
        />
        {/* Tick marks */}
        {Array.from({ length: 13 }).map((_, i) => {
          const angle = ARC_START + (ARC_TOTAL / 12) * i;
          const inner = polarToCartesian(CENTER, CENTER, RADIUS - 14, angle);
          const outer = polarToCartesian(CENTER, CENTER, RADIUS - 8, angle);
          return (
            <line
              key={i}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--text-muted)"
              strokeWidth={i % 3 === 0 ? 2 : 1}
            />
          );
        })}
        {/* Inner ring */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS - 20}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={0.5}
        />
      </svg>
      {/* Center text overlay */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1,
            color,
            letterSpacing: "0.02em",
          }}
        >
          {value !== null ? effectiveValue.toFixed(1) : "--"}
        </div>
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginTop: 4,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {label}
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
          {containerName}
        </div>
      </div>
    </div>
  );
}
