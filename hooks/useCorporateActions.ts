'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CorporateAction } from '@/lib/portfolio/corporate-actions';
import type { Position } from '@/types/portfolio';

export interface PendingAction {
  position: Position;
  action: CorporateAction;
}

// Kapitalmaßnahmen seit dem Kaufdatum, die noch nicht eingebucht oder verworfen wurden
export function useCorporateActions(positions: Position[]) {
  const [actions, setActions] = useState<Record<string, CorporateAction[]>>({});
  const key = positions.map((p) => `${p.symbol}@${p.buyDate}`).join(',');

  useEffect(() => {
    let cancelled = false;
    const queries = [...new Set(positions.filter((p) => p.buyDate).map((p) => `${p.symbol}@${p.buyDate}`))];
    Promise.all(
      queries.map(async (q) => {
        const [symbol, since] = q.split('@');
        const res = await fetch(`/api/corporate-actions?symbol=${encodeURIComponent(symbol)}&since=${since}`).catch(() => null);
        const data = res?.ok ? await res.json() : null;
        return [q, (data?.actions ?? []) as CorporateAction[]] as const;
      })
    ).then((entries) => {
      if (!cancelled) setActions(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return useMemo<PendingAction[]>(
    () =>
      positions.flatMap((position) =>
        (actions[`${position.symbol}@${position.buyDate}`] ?? [])
          .filter((action) => !position.appliedActions?.includes(action.id))
          .map((action) => ({ position, action }))
      ),
    [positions, actions]
  );
}
