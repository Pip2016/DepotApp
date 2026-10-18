'use client';

import { useMemo } from 'react';
import { useMultipleStockQuotes } from './useStockData';
import type { Position } from '@/types/portfolio';
import type { StockQuote } from '@/types/stock';

// Yahoo notiert London in Pence, Johannesburg in Cent, Tel Aviv in Agorot
const MINOR_UNITS: Record<string, [string, number]> = {
  GBp: ['GBP', 0.01],
  GBX: ['GBP', 0.01],
  ZAc: ['ZAR', 0.01],
  ILA: ['ILS', 0.01],
};

const quoteCurrency = (currency: string): [string, number] => MINOR_UNITS[currency] ?? [currency, 1];

// Kurse in der Währung des Einstands (meist EUR), damit Wert und Gewinn/Verlust stimmen.
// Fehlt der Wechselkurs, entfällt der Kurs lieber, als in falscher Währung zu rechnen.
export function usePortfolioQuotes(positions: Position[]) {
  const symbols = useMemo(() => [...new Set(positions.map((p) => p.symbol))], [positions]);
  const { quotes, isLoading } = useMultipleStockQuotes(symbols);

  const pairs = useMemo(() => {
    const set = new Set<string>();
    for (const p of positions) {
      const q = quotes[p.symbol];
      if (!q) continue;
      const [cur] = quoteCurrency(q.currency);
      if (cur !== p.currency) set.add(`${cur}${p.currency}=X`);
    }
    return [...set];
  }, [positions, quotes]);
  const { quotes: fx, isLoading: fxLoading } = useMultipleStockQuotes(pairs);

  const converted = useMemo(() => {
    const out: Record<string, StockQuote> = {};
    for (const p of positions) {
      const q = quotes[p.symbol];
      if (!q) continue;
      const [cur, unit] = quoteCurrency(q.currency);
      const rate = cur === p.currency ? 1 : fx[`${cur}${p.currency}=X`]?.price;
      if (!rate) continue;
      const k = unit * rate;
      out[p.symbol] = {
        ...q,
        price: q.price * k,
        change: q.change * k,
        previousClose: q.previousClose * k,
        open: q.open * k,
        dayHigh: q.dayHigh * k,
        dayLow: q.dayLow * k,
        currency: p.currency,
      };
    }
    return out;
  }, [positions, quotes, fx]);

  return { quotes: converted, isLoading: isLoading || fxLoading };
}
