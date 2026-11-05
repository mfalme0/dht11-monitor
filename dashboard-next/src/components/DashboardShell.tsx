"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import GaugeWidget from "./GaugeWidget";
import SensorCard from "./SensorCard";
import AlertFeed from "./AlertFeed";
import HistoryChart from "./HistoryChart";
import { useSSE } from "@/hooks/useSSE";
import { useHistory } from "@/hooks/useHistory";
import { dewPoint, comfortIndex } from "@/lib/temp-utils";

export default function DashboardShell() {
  const { data, connected } = useSSE();
  const history = useHistory();
  const [alerts, setAlerts] = useState<
    { timestamp: number; sensor: string; message: string; level: "safe" | "warm" | "hot" | "critical" }[]
  >([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 900px)");
    setSidebarCollapsed(mql.matches);
    const handler = (e: MediaQueryListEvent) => setSidebarCollapsed(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch("/api/sensors/stream");
        // Initial alerts from history
      } catch {}
    }
    fetchAlerts();
  }, []);

  // Compute derived data
  const tempHistory = history.map((h) => h.temperature).filter((v): v is number => v !== null);
  const humHistory = history.map((h) => h.humidity).filter((v): v is number => v !== null);

  const tempMin = tempHistory.length > 0 ? Math.min(...tempHistory) : undefined;
  const tempMax = tempHistory.length > 0 ? Math.max(...tempHistory) : undefined;
  const tempAvg = tempHistory.length > 0 ? tempHistory.reduce((a, b) => a + b, 0) / tempHistory.length : undefined;

  const humMin = humHistory.length > 0 ? Math.min(...humHistory) : undefined;
  const humMax = humHistory.length > 0 ? Math.max(...humHistory) : undefined;
  const humAvg = humHistory.length > 0 ? humHistory.reduce((a, b) => a + b, 0) / humHistory.length : undefined;

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        background: "var(--bg-void)",
      }}
    >
      <Sidebar collapsed={sidebarCollapsed} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <TopBar connected={connected} lastUpdate={data.timestamp} />

        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: "var(--space-6)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-6)",
          }}
        >
          {/* Top section: Gauge + Alert Feed */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(280px, 1fr) minmax(300px, 2fr)",
              gap: "var(--space-6)",
              alignItems: "start",
            }}
          >
            {/* Hero Gauge */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-8)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <GaugeWidget
                value={data.temperature}
                containerName="Living Room DHT11"
              />
            </div>

            {/* Alert Feed */}
            <AlertFeed alerts={alerts} />
          </div>

          {/* Sensor Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "var(--space-4)",
            }}
          >
            <SensorCard
              id="dht11_temp"
              label="Temperature"
              value={data.temperature}
              history={tempHistory}
              min={tempMin}
              max={tempMax}
              avg={tempAvg}
            />
            <SensorCard
              id="dht11_hum"
              label="Humidity"
              value={data.humidity}
              history={humHistory}
              min={humMin}
              max={humMax}
              avg={humAvg}
              thresholdWarn={70}
              thresholdCrit={90}
              unit="%"
            />
            <SensorCard
              id="dew_point"
              label="Dew Point"
              value={
                data.temperature !== null && data.humidity !== null
                  ? dewPoint(data.temperature, data.humidity)
                  : null
              }
              history={[]}
              thresholdWarn={20}
              thresholdCrit={30}
            />
            <SensorCard
              id="comfort"
              label="Comfort Index"
              value={
                data.humidity !== null && data.temperature !== null
                  ? comfortIndex(data.humidity, data.temperature)
                  : null
              }
              history={[]}
              min={0}
              max={40}
              thresholdWarn={30}
              thresholdCrit={38}
              unit=""
            />
          </div>

          {/* History Chart */}
          <HistoryChart history={history} />
        </main>
      </div>
    </div>
  );
}
