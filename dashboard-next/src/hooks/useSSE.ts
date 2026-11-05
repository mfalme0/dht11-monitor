"use client";

import { useEffect, useRef, useCallback, useState } from "react";

type SensorData = {
  temperature: number | null;
  humidity: number | null;
  timestamp: number | null;
};

export function useSSE() {
  const [data, setData] = useState<SensorData>({
    temperature: null,
    humidity: null,
    timestamp: null,
  });
  const [connected, setConnected] = useState(false);
  const retryRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const connect = useCallback(() => {
    const es = new EventSource("/api/sensors/stream");

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.connected) return;
        setData({
          temperature: parsed.temperature,
          humidity: parsed.humidity,
          timestamp: parsed.timestamp,
        });
      } catch {}
    };

    es.onerror = () => {
      es.close();
      setConnected(false);
      retryRef.current = setTimeout(connect, 3000);
    };

    return () => {
      es.close();
      clearTimeout(retryRef.current);
    };
  }, []);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return { data, connected };
}
