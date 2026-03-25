import { useEffect, useState } from "react";

export function useSSE<T>(url: string, enabled = true): { data: T | null; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const eventSource = new EventSource(url, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
        setError(null);
      } catch {
        setError("Failed to parse SSE data");
      }
    };

    eventSource.onerror = () => {
      setError("SSE connection error");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [url, enabled]);

  return { data, error };
}
