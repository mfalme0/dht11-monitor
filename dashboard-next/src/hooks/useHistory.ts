"use client";

import { useEffect, useState, useRef } from "react";

type HistoryEntry = {
  temperature: number | null;
  humidity: number | null;
  timestamp: number;
};

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/sensors/history");
        const data = await res.json();
        setHistory(data);
      } catch {}
    }

    fetchHistory();
    intervalRef.current = setInterval(fetchHistory, 5000);

    return () => clearInterval(intervalRef.current);
  }, []);

  return history;
}
