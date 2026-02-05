'use client';

import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Portfolio, Position } from '@/types/portfolio';
import { mockPortfolio } from '@/data/mock-portfolio';

const PORTFOLIO_KEY = 'mydepot-portfolio';

export function usePortfolio() {
  const [portfolio, setPortfolio] = useLocalStorage<Portfolio>(
    PORTFOLIO_KEY,
    mockPortfolio
  );

  const addPosition = useCallback(
    (position: Omit<Position, 'id'>) => {
      setPortfolio((prev) => ({
        ...prev,
        positions: [
          ...prev.positions,
          { ...position, id: crypto.randomUUID() },
        ],
        updatedAt: new Date().toISOString(),
      }));
    },
    [setPortfolio]
  );

  const updatePosition = useCallback(
    (id: string, updates: Partial<Position>) => {
      setPortfolio((prev) => ({
        ...prev,
        positions: prev.positions.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
        updatedAt: new Date().toISOString(),
      }));
    },
    [setPortfolio]
  );

  const removePosition = useCallback(
    (id: string) => {
      setPortfolio((prev) => ({
        ...prev,
        positions: prev.positions.filter((p) => p.id !== id),
        updatedAt: new Date().toISOString(),
      }));
    },
    [setPortfolio]
  );

  const importPositions = useCallback(
    (positions: Omit<Position, 'id'>[]) => {
      setPortfolio((prev) => ({
        ...prev,
        positions: [
          ...prev.positions,
          ...positions.map((p) => ({ ...p, id: crypto.randomUUID() })),
        ],
        updatedAt: new Date().toISOString(),
      }));
    },
    [setPortfolio]
  );

  const totalPositions = useMemo(() => portfolio.positions.length, [portfolio.positions]);

  return {
    portfolio,
    setPortfolio,
    addPosition,
    updatePosition,
    removePosition,
    importPositions,
    totalPositions,
  };
}
