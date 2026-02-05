'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Portfolio,
  Position,
  InsertPortfolio,
  InsertPosition,
  UpdatePosition,
} from '@/types/database';

interface UseSupabasePortfolioReturn {
  portfolios: Portfolio[];
  activePortfolio: Portfolio | null;
  positions: Position[];
  isLoading: boolean;
  error: string | null;
  createPortfolio: (
    data: Omit<InsertPortfolio, 'user_id'>
  ) => Promise<Portfolio | null>;
  updatePortfolio: (
    id: string,
    data: Partial<Portfolio>
  ) => Promise<Portfolio | null>;
  deletePortfolio: (id: string) => Promise<boolean>;
  setActivePortfolio: (id: string) => void;
  addPosition: (
    data: Omit<InsertPosition, 'portfolio_id'>
  ) => Promise<Position | null>;
  updatePosition: (
    id: string,
    data: UpdatePosition
  ) => Promise<Position | null>;
  deletePosition: (id: string) => Promise<boolean>;
  importPositions: (
    positions: Omit<InsertPosition, 'portfolio_id'>[]
  ) => Promise<Position[]>;
  refresh: () => Promise<void>;
}

export function useSupabasePortfolio(): UseSupabasePortfolioReturn {
  const { user } = useAuth();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(
    null
  );
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const activePortfolio =
    portfolios.find((p) => p.id === activePortfolioId) || null;

  // Fetch portfolios
  const fetchPortfolios = useCallback(async () => {
    if (!user || !supabase) return;

    const { data, error: fetchError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching portfolios:', fetchError);
      setError('Portfolio konnte nicht geladen werden');
      return;
    }

    setPortfolios(data || []);

    // Set active portfolio to default or first one
    if (data && data.length > 0) {
      const defaultPortfolio = data.find((p: Portfolio) => p.is_default) || data[0];
      setActivePortfolioId(defaultPortfolio.id);
    }
  }, [user, supabase]);

  // Fetch positions for active portfolio
  const fetchPositions = useCallback(async () => {
    if (!activePortfolioId || !supabase) {
      setPositions([]);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('positions')
      .select('*')
      .eq('portfolio_id', activePortfolioId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching positions:', fetchError);
      setError('Positionen konnten nicht geladen werden');
      return;
    }

    setPositions(data || []);
  }, [activePortfolioId, supabase]);

  // Initial load
  useEffect(() => {
    if (user && supabase) {
      setIsLoading(true);
      fetchPortfolios().finally(() => setIsLoading(false));
    } else {
      setPortfolios([]);
      setPositions([]);
      setActivePortfolioId(null);
      setIsLoading(false);
    }
  }, [user, supabase, fetchPortfolios]);

  // Fetch positions when active portfolio changes
  useEffect(() => {
    if (activePortfolioId && supabase) {
      fetchPositions();
    }
  }, [activePortfolioId, supabase, fetchPositions]);

  const refresh = useCallback(async () => {
    setError(null);
    await fetchPortfolios();
    await fetchPositions();
  }, [fetchPortfolios, fetchPositions]);

  const createPortfolio = useCallback(
    async (
      data: Omit<InsertPortfolio, 'user_id'>
    ): Promise<Portfolio | null> => {
      if (!user || !supabase) return null;

      const { data: newPortfolio, error: createError } = await supabase
        .from('portfolios')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating portfolio:', createError);
        setError('Portfolio konnte nicht erstellt werden');
        return null;
      }

      setPortfolios((prev) => [...prev, newPortfolio]);
      return newPortfolio;
    },
    [user, supabase]
  );

  const updatePortfolio = useCallback(
    async (id: string, data: Partial<Portfolio>): Promise<Portfolio | null> => {
      if (!supabase) return null;

      const { data: updated, error: updateError } = await supabase
        .from('portfolios')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating portfolio:', updateError);
        setError('Portfolio konnte nicht aktualisiert werden');
        return null;
      }

      setPortfolios((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    },
    [supabase]
  );

  const deletePortfolio = useCallback(
    async (id: string): Promise<boolean> => {
      if (!supabase) return false;

      const { error: deleteError } = await supabase.from('portfolios').delete().eq('id', id);

      if (deleteError) {
        console.error('Error deleting portfolio:', deleteError);
        setError('Portfolio konnte nicht gelöscht werden');
        return false;
      }

      setPortfolios((prev) => prev.filter((p) => p.id !== id));

      // If deleted portfolio was active, switch to another
      if (activePortfolioId === id) {
        const remaining = portfolios.filter((p) => p.id !== id);
        setActivePortfolioId(remaining[0]?.id || null);
      }

      return true;
    },
    [supabase, activePortfolioId, portfolios]
  );

  const setActivePortfolio = useCallback((id: string) => {
    setActivePortfolioId(id);
  }, []);

  const addPosition = useCallback(
    async (
      data: Omit<InsertPosition, 'portfolio_id'>
    ): Promise<Position | null> => {
      if (!activePortfolioId || !supabase) return null;

      const { data: newPosition, error: addError } = await supabase
        .from('positions')
        .insert({
          ...data,
          portfolio_id: activePortfolioId,
        })
        .select()
        .single();

      if (addError) {
        console.error('Error adding position:', addError);
        setError('Position konnte nicht hinzugefügt werden');
        return null;
      }

      setPositions((prev) => [...prev, newPosition]);
      return newPosition;
    },
    [activePortfolioId, supabase]
  );

  const updatePosition = useCallback(
    async (id: string, data: UpdatePosition): Promise<Position | null> => {
      if (!supabase) return null;

      const { data: updated, error: updateError } = await supabase
        .from('positions')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating position:', updateError);
        setError('Position konnte nicht aktualisiert werden');
        return null;
      }

      setPositions((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    },
    [supabase]
  );

  const deletePosition = useCallback(
    async (id: string): Promise<boolean> => {
      if (!supabase) return false;

      const { error: deleteError } = await supabase.from('positions').delete().eq('id', id);

      if (deleteError) {
        console.error('Error deleting position:', deleteError);
        setError('Position konnte nicht gelöscht werden');
        return false;
      }

      setPositions((prev) => prev.filter((p) => p.id !== id));
      return true;
    },
    [supabase]
  );

  const importPositions = useCallback(
    async (
      positionsData: Omit<InsertPosition, 'portfolio_id'>[]
    ): Promise<Position[]> => {
      if (!activePortfolioId || !supabase || positionsData.length === 0) return [];

      const { data: newPositions, error: importError } = await supabase
        .from('positions')
        .insert(
          positionsData.map((p) => ({
            ...p,
            portfolio_id: activePortfolioId,
          }))
        )
        .select();

      if (importError) {
        console.error('Error importing positions:', importError);
        setError('Positionen konnten nicht importiert werden');
        return [];
      }

      setPositions((prev) => [...prev, ...newPositions]);
      return newPositions;
    },
    [activePortfolioId, supabase]
  );

  return {
    portfolios,
    activePortfolio,
    positions,
    isLoading,
    error,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    setActivePortfolio,
    addPosition,
    updatePosition,
    deletePosition,
    importPositions,
    refresh,
  };
}
