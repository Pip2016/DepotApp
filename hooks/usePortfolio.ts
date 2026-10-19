'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { computeHoldings, type Holding, type LedgerEntry } from '@/lib/portfolio/ledger';
import { mockPortfolio } from '@/data/mock-portfolio';
import type { Portfolio, Position } from '@/types/portfolio';
import type { Activity, InsertActivity } from '@/types/database';

// Angemeldet liegt das Depot als Buchungen in Supabase (Tabelle activities), sonst im Browser.
const LEDGER_KEY = 'mydepot-ledger';
// Älteres Format: nur Bestände mit Einstand
const LEGACY_KEY = 'mydepot-portfolio';

type NewEntry = Omit<LedgerEntry, 'id'>;

interface LocalLedger {
  entries: LedgerEntry[];
  dismissed: string[];
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`localStorage ${key}:`, error);
  }
}

const isMock = (positions: Position[]) =>
  positions.length === mockPortfolio.positions.length &&
  positions.every((p, i) => p.symbol === mockPortfolio.positions[i].symbol && p.quantity === mockPortfolio.positions[i].quantity);

// Bestände aus dem alten Browser-Format als Einbuchungen mit ihrem Einstand übernehmen
export function legacyToEntries(positions: Position[]): NewEntry[] {
  return positions
    .filter((p) => p.quantity > 0)
    .map((p) => ({
      type: 'transfer' as const,
      symbol: p.symbol,
      name: p.name,
      isin: p.isin,
      wkn: p.wkn,
      quantity: p.quantity,
      price: p.buyPrice || 0,
      fees: 0,
      tax: 0,
      currency: p.currency,
      date: p.buyDate || new Date().toISOString().slice(0, 10),
      notes: 'Übernommener Bestand',
    }));
}

function readLegacy(): Position[] {
  const legacy = readJson<Portfolio>(LEGACY_KEY);
  const positions = legacy?.positions ?? [];
  return isMock(positions) ? [] : positions;
}

function fromRow(row: Activity): LedgerEntry {
  return {
    id: row.id,
    type: row.type,
    symbol: row.symbol,
    name: row.name ?? undefined,
    isin: row.isin ?? undefined,
    wkn: row.wkn ?? undefined,
    quantity: Number(row.quantity),
    price: Number(row.price),
    fees: Number(row.fees ?? 0),
    tax: Number(row.tax ?? 0),
    ratio: row.ratio != null ? Number(row.ratio) : undefined,
    currency: row.currency,
    date: row.executed_at.slice(0, 10),
    actionId: row.action_id ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function toRow(entry: NewEntry, portfolioId: string): InsertActivity {
  const amount = entry.type === 'split' || entry.type === 'spinoff' ? 0 : entry.price * entry.quantity;
  return {
    portfolio_id: portfolioId,
    type: entry.type,
    symbol: entry.symbol,
    name: entry.name ?? null,
    isin: entry.isin ?? null,
    wkn: entry.wkn ?? null,
    // Die Datenbank verlangt quantity > 0 (Splits und Abspaltungen buchen 1)
    quantity: entry.quantity,
    price: entry.price,
    total_amount: amount,
    currency: entry.currency,
    fees: entry.fees,
    tax: entry.tax,
    ratio: entry.ratio ?? null,
    action_id: entry.actionId ?? null,
    executed_at: `${entry.date}T12:00:00Z`,
    notes: entry.notes ?? null,
  };
}

// Fehlende Spalten heißen: Migration 007 wurde in Supabase noch nicht ausgeführt
function describeError(error: { message?: string; code?: string }): string {
  const msg = error.message ?? '';
  if (error.code === '42703' || error.code === 'PGRST204' || /column|spinoff/i.test(msg)) {
    return 'Die Datenbank ist noch nicht auf Buchungen umgestellt. Bitte supabase/migrations/007_activity_ledger.sql im Supabase SQL Editor ausführen.';
  }
  return `Depot konnte nicht gespeichert werden: ${msg}`;
}

export function usePortfolio() {
  const { user, isLoading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const cloud = !!(user && supabase);

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [portfolioName, setPortfolioName] = useState('Mein Depot');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [legacyPositions, setLegacyPositions] = useState<Position[]>([]);

  // Laden
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      if (!cloud) {
        let ledger = readJson<LocalLedger>(LEDGER_KEY);
        if (!ledger) {
          const migrated = legacyToEntries(readLegacy()).map((e) => ({ ...e, id: crypto.randomUUID() }));
          ledger = { entries: migrated, dismissed: [] };
          writeJson(LEDGER_KEY, ledger);
        }
        if (!cancelled) {
          setEntries(ledger.entries);
          setDismissed(ledger.dismissed);
          setPortfolioId('local');
          setIsLoading(false);
        }
        return;
      }

      const { data: portfolios, error: pErr } = await supabase!
        .from('portfolios')
        .select('*')
        .eq('user_id', user!.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);
      if (pErr) {
        if (!cancelled) setError(describeError(pErr));
        return;
      }
      let portfolio = portfolios?.[0];
      if (!portfolio) {
        const { data: created, error: cErr } = await supabase!
          .from('portfolios')
          .insert({ user_id: user!.id, name: 'Mein Depot', is_default: true })
          .select()
          .single();
        if (cErr || !created) {
          if (!cancelled) setError(describeError(cErr ?? {}));
          return;
        }
        portfolio = created;
      }

      const { data: rows, error: aErr } = await supabase!
        .from('activities')
        .select('*')
        .eq('portfolio_id', portfolio.id)
        .order('executed_at', { ascending: true });
      if (cancelled) return;
      if (aErr) setError(describeError(aErr));

      setPortfolioId(portfolio.id);
      setPortfolioName(portfolio.name);
      setDismissed(portfolio.dismissed_actions ?? []);
      setEntries((rows ?? []).map(fromRow));
      // Ein Depot aus der Zeit vor dem Login kann ins Konto übernommen werden
      const local = readJson<LocalLedger>(LEDGER_KEY);
      setLegacyPositions(local?.entries.length ? [] : readLegacy());
      setIsLoading(false);
    }

    load().finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [authLoading, cloud, supabase, user]);

  const saveLocal = useCallback((next: LedgerEntry[], nextDismissed: string[]) => {
    writeJson(LEDGER_KEY, { entries: next, dismissed: nextDismissed });
  }, []);

  const addEntries = useCallback(
    async (newEntries: NewEntry[]): Promise<boolean> => {
      if (newEntries.length === 0) return true;
      if (!cloud) {
        const next = [...entries, ...newEntries.map((e) => ({ ...e, id: crypto.randomUUID() }))];
        setEntries(next);
        saveLocal(next, dismissed);
        return true;
      }
      if (!portfolioId) return false;
      const { data, error: iErr } = await supabase!
        .from('activities')
        .insert(newEntries.map((e) => toRow(e, portfolioId)))
        .select();
      if (iErr) {
        setError(describeError(iErr));
        return false;
      }
      setEntries((prev) => [...prev, ...(data ?? []).map(fromRow)]);
      return true;
    },
    [cloud, entries, dismissed, portfolioId, supabase, saveLocal]
  );

  const deleteEntries = useCallback(
    async (ids: string[]): Promise<boolean> => {
      if (ids.length === 0) return true;
      if (!cloud) {
        const next = entries.filter((e) => !ids.includes(e.id));
        setEntries(next);
        saveLocal(next, dismissed);
        return true;
      }
      const { error: dErr } = await supabase!.from('activities').delete().in('id', ids);
      if (dErr) {
        setError(describeError(dErr));
        return false;
      }
      setEntries((prev) => prev.filter((e) => !ids.includes(e.id)));
      return true;
    },
    [cloud, entries, dismissed, supabase, saveLocal]
  );

  const dismissAction = useCallback(
    async (actionId: string) => {
      const next = [...new Set([...dismissed, actionId])];
      setDismissed(next);
      if (!cloud) return saveLocal(entries, next);
      if (!portfolioId) return;
      const { error: uErr } = await supabase!.from('portfolios').update({ dismissed_actions: next }).eq('id', portfolioId);
      if (uErr) setError(describeError(uErr));
    },
    [cloud, dismissed, entries, portfolioId, supabase, saveLocal]
  );

  const migrateLegacy = useCallback(async () => {
    if (await addEntries(legacyToEntries(legacyPositions))) setLegacyPositions([]);
  }, [addEntries, legacyPositions]);

  const { holdings, warnings } = useMemo(() => computeHoldings(entries), [entries]);

  const positions = useMemo<Position[]>(
    () =>
      holdings
        .filter((h) => h.quantity > 1e-9)
        .map((h) => ({
          id: h.symbol,
          symbol: h.symbol,
          isin: h.isin,
          wkn: h.wkn,
          name: h.name,
          quantity: h.quantity,
          buyPrice: h.avgCost,
          buyDate: h.firstDate,
          currency: h.currency === 'USD' ? 'USD' : 'EUR',
          appliedActions: [...h.actionIds, ...dismissed],
        })),
    [holdings, dismissed]
  );

  const portfolio = useMemo<Portfolio>(
    () => ({ id: portfolioId ?? 'local', name: portfolioName, positions, createdAt: '', updatedAt: '' }),
    [portfolioId, portfolioName, positions]
  );

  const totals = useMemo(
    () => ({
      realizedPnl: holdings.reduce((s, h) => s + h.realizedPnl, 0),
      dividendsNet: holdings.reduce((s, h) => s + h.dividendsNet, 0),
    }),
    [holdings]
  );

  // Kauf aus dem Dialog "Position hinzufügen"
  const addPosition = useCallback(
    (p: Omit<Position, 'id'>) =>
      addEntries([
        {
          type: 'buy',
          symbol: p.symbol,
          name: p.name,
          isin: p.isin,
          wkn: p.wkn,
          quantity: p.quantity,
          price: p.buyPrice,
          fees: 0,
          tax: 0,
          currency: p.currency,
          date: p.buyDate,
        },
      ]),
    [addEntries]
  );

  // Bestand aus dem CSV-Import einbuchen
  const importPositions = useCallback((ps: Omit<Position, 'id'>[]) => addEntries(legacyToEntries(ps as Position[])), [addEntries]);

  // Position samt aller Buchungen löschen
  const removePosition = useCallback(
    (symbol: string) => deleteEntries(entries.filter((e) => e.symbol === symbol).map((e) => e.id)),
    [deleteEntries, entries]
  );

  return {
    portfolio,
    holdings,
    entries,
    totals,
    warnings,
    storage: cloud ? ('cloud' as const) : ('local' as const),
    isLoading,
    error,
    legacyPositions,
    addEntries,
    deleteEntries,
    dismissAction,
    migrateLegacy,
    addPosition,
    importPositions,
    removePosition,
  };
}

export type { Holding };
