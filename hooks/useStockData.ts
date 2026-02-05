'use client';

import { useState, useEffect, useCallback } from 'react';
import { StockQuote, HistoricalData, FundamentalData } from '@/types/stock';
import { NewsArticle } from '@/types/news';

interface StockDataState {
  quote: StockQuote | null;
  history: HistoricalData[];
  fundamentals: FundamentalData | null;
  news: NewsArticle[];
  isLoading: boolean;
  error: string | null;
}

export function useStockData(symbol: string | null, range: string = '1mo') {
  const [state, setState] = useState<StockDataState>({
    quote: null,
    history: [],
    fundamentals: null,
    news: [],
    isLoading: false,
    error: null,
  });

  const fetchStockData = useCallback(async () => {
    if (!symbol) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const intervalMap: Record<string, string> = {
        '1d': '5m',
        '5d': '15m',
        '1mo': '1d',
        '3mo': '1d',
        '1y': '1wk',
        '5y': '1mo',
        'max': '1mo',
      };

      const interval = intervalMap[range] || '1d';

      const [stockRes, fundamentalsRes, newsRes] = await Promise.allSettled([
        fetch(`/api/stocks?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`),
        fetch(`/api/fundamentals?symbol=${encodeURIComponent(symbol)}`),
        fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`),
      ]);

      let quote: StockQuote | null = null;
      let history: HistoricalData[] = [];
      let fundamentals: FundamentalData | null = null;
      let news: NewsArticle[] = [];

      if (stockRes.status === 'fulfilled' && stockRes.value.ok) {
        const stockData = await stockRes.value.json();
        quote = stockData.quote;
        history = stockData.history || [];
      }

      if (fundamentalsRes.status === 'fulfilled' && fundamentalsRes.value.ok) {
        fundamentals = await fundamentalsRes.value.json();
      }

      if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
        news = await newsRes.value.json();
      }

      setState({
        quote,
        history,
        fundamentals,
        news,
        isLoading: false,
        error: quote ? null : 'Aktiendaten konnten nicht geladen werden',
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Fehler beim Laden der Daten',
      }));
      console.error('Error fetching stock data:', error);
    }
  }, [symbol, range]);

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  return { ...state, refetch: fetchStockData };
}

export function useMultipleStockQuotes(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (symbols.length === 0) return;

    const fetchQuotes = async () => {
      setIsLoading(true);
      const results: Record<string, StockQuote> = {};

      const responses = await Promise.allSettled(
        symbols.map((symbol) =>
          fetch(`/api/stocks?symbol=${encodeURIComponent(symbol)}&range=1d`)
            .then((res) => res.ok ? res.json() : null)
        )
      );

      responses.forEach((response, index) => {
        if (response.status === 'fulfilled' && response.value?.quote) {
          results[symbols[index]] = response.value.quote;
        }
      });

      setQuotes(results);
      setIsLoading(false);
    };

    fetchQuotes();

    // Refresh every 5 minutes
    const interval = setInterval(fetchQuotes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [symbols.join(',')]);

  return { quotes, isLoading };
}
