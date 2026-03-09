// hooks/useEODData.ts

import { useState, useEffect } from 'react';

export interface EODPrice {
  date: string;
  close: number;
}

export interface EODDataPoint {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  adjustedClose: number | null;
  volume: number | null;
}

export function useStockPrice(symbol: string) {
  const [price, setPrice] = useState<EODPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/eod/price/${symbol}`)
      .then(res => {
        if (!res.ok) throw new Error('Keine Daten');
        return res.json();
      })
      .then(data => {
        if (data.close) setPrice(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [symbol]);

  return { price, loading, error };
}

export function useHistoricalData(symbol: string, days?: number) {
  const [data, setData] = useState<EODDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const url = days
      ? `/api/eod/${symbol}?days=${days}`
      : `/api/eod/${symbol}`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Keine Daten');
        return res.json();
      })
      .then(result => {
        if (result.data) setData(result.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [symbol, days]);

  return { data, loading, error };
}
