'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FundamentalsResponse, StockFundamentals } from '@/types/fundamentals';

interface UseFundamentalsOptions {
  years?: number;
  enabled?: boolean;
}

interface UseFundamentalsResult {
  data: StockFundamentals[];
  currency: string;
  isLoading: boolean;
  error: string | null;
  isCached: boolean;
  isLimitReached: boolean;
  refetch: () => Promise<void>;
}

export function useFundamentals(
  symbol: string | null,
  options: UseFundamentalsOptions = {}
): UseFundamentalsResult {
  const { years = 10, enabled = true } = options;

  const [data, setData] = useState<StockFundamentals[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [isLimitReached, setIsLimitReached] = useState(false);

  const fetchFundamentals = useCallback(async () => {
    if (!symbol || !enabled) {
      setData([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        symbol: symbol.toUpperCase(),
        years: years.toString(),
      });

      const response = await fetch(`/api/fundamentals/historical?${params}`);
      const result: FundamentalsResponse = await response.json();

      if (result.error && result.years.length === 0) {
        setError(result.error);
        setData([]);
      } else {
        setData(result.years);
        setCurrency(result.currency);
        setIsCached(result.cached);
        setIsLimitReached(result.limitReached || false);

        // Wenn Limit erreicht aber Daten vorhanden, zeige Warning statt Error
        if (result.limitReached && result.years.length > 0) {
          setError(null);
        } else if (result.error) {
          setError(result.error);
        }
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to fetch fundamentals');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, years, enabled]);

  useEffect(() => {
    fetchFundamentals();
  }, [symbol, years]);

  return {
    data,
    currency,
    isLoading,
    error,
    isCached,
    isLimitReached,
    refetch: fetchFundamentals,
  };
}

// Helper: Wert formatieren
export function formatFundamentalValue(
  value: number | undefined | null,
  format: 'number' | 'currency' | 'percent' | 'ratio' | 'integer',
  decimals: number = 2,
  currency: string = 'EUR'
): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '–';
  }

  switch (format) {
    case 'currency':
      // Große Zahlen abkürzen
      if (Math.abs(value) >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(decimals)} Mrd.`;
      }
      if (Math.abs(value) >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(decimals)} Mio.`;
      }
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);

    case 'percent':
      const sign = value > 0 ? '+' : '';
      return `${sign}${value.toFixed(decimals)}%`;

    case 'ratio':
      return value.toFixed(decimals);

    case 'integer':
      return new Intl.NumberFormat('de-DE').format(Math.round(value));

    case 'number':
    default:
      return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
  }
}

// Helper: Farbe für Wert (positiv/negativ)
export function getValueColor(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'text-muted-foreground';
  }
  if (value > 0) {
    return 'text-green-600 dark:text-green-400';
  }
  if (value < 0) {
    return 'text-red-600 dark:text-red-400';
  }
  return 'text-muted-foreground';
}
