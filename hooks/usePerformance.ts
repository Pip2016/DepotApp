'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PerformanceData } from '@/lib/api/stock-data-service';

interface UsePerformanceResult {
  performance: PerformanceData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePerformance(symbol: string): UsePerformanceResult {
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformance = useCallback(async () => {
    if (!symbol) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/performance?symbol=${encodeURIComponent(symbol)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.userMessage || 'Failed to fetch performance'
        );
      }

      const data = await response.json();
      setPerformance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPerformance(null);
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  return {
    performance,
    isLoading,
    error,
    refetch: fetchPerformance,
  };
}
