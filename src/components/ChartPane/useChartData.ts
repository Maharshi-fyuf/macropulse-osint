import { useState, useEffect } from 'react';
import { OHLCPoint } from '@/types/yahoo';

interface UseChartDataResult {
  data: OHLCPoint[];
  loading: boolean;
  error: string | null;
  resolvedSymbol: string;
}

export function useChartData(symbol: string): UseChartDataResult {
  const [data, setData] = useState<OHLCPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedSymbol, setResolvedSymbol] = useState(symbol);

  useEffect(() => {
    setResolvedSymbol(symbol);
  }, [symbol]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/finance?ticker=${encodeURIComponent(symbol)}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }

        const json = await res.json();

        if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
          throw new Error('No data returned for this symbol.');
        }

        if (isMounted) {
          if (json.resolvedSymbol) {
            setResolvedSymbol(json.resolvedSymbol);
          }
          setData(json.data as OHLCPoint[]);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch data');
          setLoading(false);
        }
      }
    }

    const timeoutId = setTimeout(fetchData, 50);

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [symbol]);

  return { data, loading, error, resolvedSymbol };
}
