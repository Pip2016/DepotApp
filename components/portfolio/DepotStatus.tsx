'use client';

import { AlertTriangle, CloudUpload, HardDrive } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters/currency';
import type { usePortfolio } from '@/hooks/usePortfolio';

interface DepotStatusProps {
  depot: ReturnType<typeof usePortfolio>;
}

// Speicherort, Fehler, Übernahme eines alten Browser-Depots und realisierte Erträge
export function DepotStatus({ depot }: DepotStatusProps) {
  const { storage, error, legacyPositions, migrateLegacy, totals, warnings, entries } = depot;

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {legacyPositions.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            In diesem Browser liegt noch ein Depot mit {legacyPositions.length} Positionen. Ins Konto übernehmen? Die Positionen
            werden mit ihrem Einstand als Einbuchung angelegt.
          </span>
          <button
            onClick={migrateLegacy}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <CloudUpload className="h-4 w-4" />
            Übernehmen
          </button>
        </div>
      )}

      {storage === 'local' && (
        <div className="flex gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0" />
          Nicht angemeldet: Das Depot wird nur in diesem Browser gespeichert.
        </div>
      )}

      {warnings.map((w) => (
        <div key={w} className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          {w}
        </div>
      ))}

      {entries.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Realisierte Gewinne/Verluste: <span className="font-medium text-foreground">{formatCurrency(totals.realizedPnl)}</span>
          {' · '}Dividenden netto: <span className="font-medium text-foreground">{formatCurrency(totals.dividendsNet)}</span>
          {' · '}
          {entries.length} Buchungen
        </p>
      )}
    </div>
  );
}
