'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Activity, InsertActivity, UpdateActivity } from '@/types/database';

interface UseActivitiesReturn {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  addActivity: (data: InsertActivity) => Promise<Activity | null>;
  updateActivity: (
    id: string,
    data: UpdateActivity
  ) => Promise<Activity | null>;
  deleteActivity: (id: string) => Promise<boolean>;
  getActivitiesByPortfolio: (portfolioId: string) => Activity[];
  getActivitiesByPosition: (positionId: string) => Activity[];
  getActivitiesBySymbol: (symbol: string) => Activity[];
  refresh: () => Promise<void>;
}

export function useActivities(portfolioId?: string): UseActivitiesReturn {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const fetchActivities = useCallback(async () => {
    if (!user || !supabase) {
      setIsLoading(false);
      return;
    }

    let query = supabase
      .from('activities')
      .select('*, portfolios!inner(user_id)')
      .eq('portfolios.user_id', user.id)
      .order('executed_at', { ascending: false });

    if (portfolioId) {
      query = query.eq('portfolio_id', portfolioId);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching activities:', fetchError);
      setError('Aktivitäten konnten nicht geladen werden');
      return;
    }

    // Remove the joined portfolios data - use type assertion for the joined result
    const cleanedData = (data || []).map((item: Activity & { portfolios?: unknown }) => {
      const { portfolios: _portfolios, ...activity } = item;
      return activity as Activity;
    });
    setActivities(cleanedData);
  }, [user, portfolioId, supabase]);

  useEffect(() => {
    if (user && supabase) {
      setIsLoading(true);
      fetchActivities().finally(() => setIsLoading(false));
    } else {
      setActivities([]);
      setIsLoading(false);
    }
  }, [user, supabase, fetchActivities]);

  const refresh = useCallback(async () => {
    setError(null);
    await fetchActivities();
  }, [fetchActivities]);

  const addActivity = useCallback(
    async (data: InsertActivity): Promise<Activity | null> => {
      if (!supabase) return null;

      const { data: newActivity, error: insertError } = await supabase
        .from('activities')
        .insert(data)
        .select()
        .single();

      if (insertError) {
        console.error('Error adding activity:', insertError);
        setError('Aktivität konnte nicht hinzugefügt werden');
        return null;
      }

      setActivities((prev) => [newActivity, ...prev]);
      return newActivity;
    },
    [supabase]
  );

  const updateActivity = useCallback(
    async (id: string, data: UpdateActivity): Promise<Activity | null> => {
      if (!supabase) return null;

      const { data: updated, error: updateError } = await supabase
        .from('activities')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating activity:', updateError);
        setError('Aktivität konnte nicht aktualisiert werden');
        return null;
      }

      setActivities((prev) =>
        prev.map((activity) => (activity.id === id ? updated : activity))
      );
      return updated;
    },
    [supabase]
  );

  const deleteActivity = useCallback(
    async (id: string): Promise<boolean> => {
      if (!supabase) return false;

      const { error: deleteError } = await supabase.from('activities').delete().eq('id', id);

      if (deleteError) {
        console.error('Error deleting activity:', deleteError);
        setError('Aktivität konnte nicht gelöscht werden');
        return false;
      }

      setActivities((prev) => prev.filter((activity) => activity.id !== id));
      return true;
    },
    [supabase]
  );

  const getActivitiesByPortfolio = useCallback(
    (portfolioId: string): Activity[] => {
      return activities.filter(
        (activity) => activity.portfolio_id === portfolioId
      );
    },
    [activities]
  );

  const getActivitiesByPosition = useCallback(
    (positionId: string): Activity[] => {
      return activities.filter(
        (activity) => activity.position_id === positionId
      );
    },
    [activities]
  );

  const getActivitiesBySymbol = useCallback(
    (symbol: string): Activity[] => {
      return activities.filter(
        (activity) => activity.symbol.toUpperCase() === symbol.toUpperCase()
      );
    },
    [activities]
  );

  return {
    activities,
    isLoading,
    error,
    addActivity,
    updateActivity,
    deleteActivity,
    getActivitiesByPortfolio,
    getActivitiesByPosition,
    getActivitiesBySymbol,
    refresh,
  };
}
