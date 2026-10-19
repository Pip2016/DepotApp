'use client';

import { useState } from 'react';
import { GitBranch } from 'lucide-react';
import { applyAction, actionToEntries, type CorporateAction } from '@/lib/portfolio/corporate-actions';
import type { LedgerEntry } from '@/lib/portfolio/ledger';
import { useCorporateActions } from '@/hooks/useCorporateActions';
import { formatCurrency } from '@/lib/formatters/currency';
import type { Position } from '@/types/portfolio';

interface CorporateActionsPanelProps {
  positions: Position[];
  // Bestand am Vorabend der Maßnahme (später gekaufte Stücke nehmen nicht teil)
  positionAt: (symbol: string, date: string) => Position | null;
  onBook: (entries: Array<Omit<LedgerEntry, 'id'>>) => Promise<boolean>;
  onDismiss: (actionId: string) => void;
}

const formatDate = (date: string) => new Date(date).toLocaleDateString('de-DE');
const formatQty = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 4 });

// Faktor als Verhältnis alt:neu (0,5 -> "2:1", 8/9 -> "9:8")
function ratioLabel(factor: number): string {
  for (let d = 1; d <= 50; d++) {
    const n = Math.round(factor * d);
    if (n > 0 && Math.abs(n / d - factor) < 1e-6) return `${d}:${n}`;
  }
  return `1:${formatQty(factor)}`;
}

function describe(action: CorporateAction, position: Position): string {
  if (action.type === 'split' && action.factor) {
    const after = formatQty(applyAction(position, action).parent.quantity);
    return `${action.factor >= 1 ? 'Split' : 'Zusammenlegung'} ${ratioLabel(action.factor)} – ${formatQty(position.quantity)} → ${after} Stück`;
  }
  if (action.type === 'spinoff' && action.child && action.ratio) {
    return `Abspaltung ${action.child.name} (${action.child.symbol}): ${formatQty(action.ratio)} je Aktie → ${Math.floor(position.quantity * action.ratio + 1e-9)} Stück`;
  }
  return action.note ?? 'Kapitalmaßnahme';
}

export function CorporateActionsPanel({ positions, positionAt, onBook, onDismiss }: CorporateActionsPanelProps) {
  const pending = useCorporateActions(positions);
  const [done, setDone] = useState<string[]>([]);
  const open = pending.filter((p) => !done.includes(`${p.position.id}:${p.action.id}`));
  if (open.length === 0) return null;

  const book = async (position: Position, action: CorporateAction) => {
    const held = positionAt(position.symbol, action.date) ?? position;
    if (await onBook(actionToEntries(held, action))) setDone((d) => [...d, `${position.id}:${action.id}`]);
  };

  const dismiss = (position: Position, action: CorporateAction) => {
    onDismiss(action.id);
    setDone((d) => [...d, `${position.id}:${action.id}`]);
  };

  return (
    <div className="card-shadow rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-foreground">Kapitalmaßnahmen seit Kauf</h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Bei Abspaltungen wird der Einstand nach dem Kursverhältnis am ersten Handelstag aufgeteilt (steuerneutral).
        Hat die Bank die neuen Aktien als Ertrag verbucht, weicht ihr Einstand ab. „Schon erledigt“, wenn Stückzahl
        und Einstand die Maßnahme bereits enthalten.
      </p>
      <ul className="space-y-2">
        {open.map(({ position: current, action }) => {
          const position = positionAt(current.symbol, action.date) ?? current;
          const preview = action.type === 'spinoff' ? applyAction(position, action) : null;
          return (
            <li
              key={`${current.id}:${action.id}`}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  {position.name} · {formatDate(action.date)}
                </p>
                <p className="text-muted-foreground">{describe(action, position)}</p>
                {preview?.child && (
                  <p className="text-xs text-muted-foreground">
                    Einstand danach: {position.symbol} {formatCurrency(preview.parent.buyPrice, position.currency)},{' '}
                    {preview.child.symbol} {formatCurrency(preview.child.buyPrice, position.currency)}
                    {preview.fractionalShares ? ` · ${formatQty(preview.fractionalShares)} Bruchteile in bar` : ''}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {(action.type === 'split' || (action.type === 'spinoff' && action.parentShare != null)) && (
                  <button
                    onClick={() => book(position, action)}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Einbuchen
                  </button>
                )}
                <button
                  onClick={() => dismiss(position, action)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {action.type === 'unknown' ? 'Geprüft' : 'Schon erledigt'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
