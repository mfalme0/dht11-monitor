export type SensorReading = {
  id: string;
  label: string;
  value: number;
  history: number[];
  min: number;
  max: number;
  avg: number;
  threshold_warn: number;
  threshold_crit: number;
};

export type Threshold = {
  min: number;
  color: string;
};

const THERMAL_THRESHOLDS: Threshold[] = [
  { min: 0, color: "var(--temp-safe)" },
  { min: 50, color: "var(--temp-warm)" },
  { min: 70, color: "var(--temp-hot)" },
  { min: 90, color: "var(--temp-critical)" },
];

export function tempColor(value: number, thresholds?: Threshold[]): string {
  const t = thresholds ?? THERMAL_THRESHOLDS;
  let color = t[0].color;
  for (const th of t) {
    if (value >= th.min) color = th.color;
  }
  return color;
}

export function tempColorRaw(value: number): string {
  if (value >= 90) return "#E03E3E";
  if (value >= 70) return "#F57C42";
  if (value >= 50) return "#F5C542";
  return "#3DD68C";
}

export function tempHexColor(value: number): string {
  if (value >= 90) return "#E03E3E";
  if (value >= 70) return "#F57C42";
  if (value >= 50) return "#F5C542";
  return "#3DD68C";
}

export function gaugeArc(value: number, min: number, max: number): number {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return ratio * 220;
}

export function sparklinePath(data: number[], width: number, height: number): string {
  if (data.length < 2) return "";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => ({
    x: i * step,
    y: height - ((v - min) / range) * (height - 4) - 2,
  }));
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatTimeShort(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dewPoint(temp: number, humidity: number): number {
  const a = 17.27;
  const b = 237.7;
  const v = (a * temp) / (b + temp) + Math.log(humidity / 100);
  return (b * v) / (a - v);
}

export function comfortIndex(humidity: number, temp: number): number {
  if (humidity < 30) return 20;
  if (humidity <= 60 && temp >= 18 && temp <= 26) return 25;
  if (humidity <= 70) return 28;
  if (humidity > 80) return 35;
  return 30;
}

export const CHART_COLORS = [
  "#5B8DEF",
  "#3DD68C",
  "#F5C542",
  "#F57C42",
  "#B57DEF",
  "#42C5F5",
  "#F5425B",
  "#A0AEC0",
];
