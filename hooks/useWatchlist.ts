'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  WatchlistItem,
  InsertWatchlistItem,
  UpdateWatchlistItem,
} from '@/types/database';

interface UseWatchlistReturn {
  items: WatchlistItem[];
  isLoading: boolean;
  error: string | null;
  addItem: (
    data: Omit<InsertWatchlistItem, 'user_id'>
  ) => Promise<WatchlistItem | null>;
  updateItem: (
    id: string,
    data: UpdateWatchlistItem
  ) => Promise<WatchlistItem | null>;
  removeItem: (id: string) => Promise<boolean>;
  isInWatchlist: (symbol: string) => boolean;
  toggleWatchlist: (symbol: string, name: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useWatchlist(): UseWatchlistReturn {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const fetchWatchlist = useCallback(async () => {
    if (!user || !supabase) return;

    const { data, error: fetchError } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching watchlist:', fetchError);
      setError('Watchlist konnte nicht geladen werden');
      return;
    }

    setItems(data || []);
  }, [user, supabase]);

  useEffect(() => {
    if (user && supabase) {
      setIsLoading(true);
      fetchWatchlist().finally(() => setIsLoading(false));
    } else {
      setItems([]);
      setIsLoading(false);
    }
  }, [user, supabase, fetchWatchlist]);

  const refresh = useCallback(async () => {
    setError(null);
    await fetchWatchlist();
  }, [fetchWatchlist]);

  const addItem = useCallback(
    async (
      data: Omit<InsertWatchlistItem, 'user_id'>
    ): Promise<WatchlistItem | null> => {
      if (!user || !supabase) return null;

      const { data: newItem, error: addError } = await supabase
        .from('watchlist')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (addError) {
        console.error('Error adding to watchlist:', addError);
        setError('Konnte nicht zur Watchlist hinzugefügt werden');
        return null;
      }

      setItems((prev) => [newItem, ...prev]);
      return newItem;
    },
    [user, supabase]
  );

  const updateItem = useCallback(
    async (
      id: string,
      data: UpdateWatchlistItem
    ): Promise<WatchlistItem | null> => {
      if (!supabase) return null;

      const { data: updated, error: updateError } = await supabase
        .from('watchlist')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating watchlist item:', updateError);
        setError('Watchlist-Eintrag konnte nicht aktualisiert werden');
        return null;
      }

      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      return updated;
    },
    [supabase]
  );

  const removeItem = useCallback(
    async (id: string): Promise<boolean> => {
      if (!supabase) return false;

      const { error: removeError } = await supabase.from('watchlist').delete().eq('id', id);

      if (removeError) {
        console.error('Error removing from watchlist:', removeError);
        setError('Konnte nicht von der Watchlist entfernt werden');
        return false;
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      return true;
    },
    [supabase]
  );

  const isInWatchlist = useCallback(
    (symbol: string): boolean => {
      return items.some(
        (item) => item.symbol.toUpperCase() === symbol.toUpperCase()
      );
    },
    [items]
  );

  const toggleWatchlist = useCallback(
    async (symbol: string, name: string): Promise<boolean> => {
      const existingItem = items.find(
        (item) => item.symbol.toUpperCase() === symbol.toUpperCase()
      );

      if (existingItem) {
        return await removeItem(existingItem.id);
      } else {
        const newItem = await addItem({ symbol: symbol.toUpperCase(), name });
        return newItem !== null;
      }
    },
    [items, addItem, removeItem]
  );

  return {
    items,
    isLoading,
    error,
    addItem,
    updateItem,
    removeItem,
    isInWatchlist,
    toggleWatchlist,
    refresh,
  };
}
