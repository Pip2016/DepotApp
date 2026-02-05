'use client';

import { ParsedPosition, BrokerFormat } from '@/lib/csv/types';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatNumber } from '@/lib/formatters/number';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface CsvPreviewProps {
  positions: ParsedPosition[];
  format: BrokerFormat;
  errors: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function CsvPreview({
  positions,
  format,
  errors,
  onConfirm,
  onCancel,
}: CsvPreviewProps) {
  const formatLabel =
    format === 'comdirect'
      ? 'Comdirect'
      : format === 'postbank'
        ? 'Postbank'
        : 'Unbekannt';

  return (
    <div className="space-y-4">
      {/* Format Detection */}
      <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
        <CheckCircle2 className="h-5 w-5 text-positive" />
        <span className="text-sm font-medium">
          Format erkannt: <strong>{formatLabel}</strong>
        </span>
        <span className="text-sm text-muted-foreground">
          · {positions.length} Position{positions.length !== 1 ? 'en' : ''} gefunden
        </span>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Warnungen</span>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-destructive">
            {errors.map((error, i) => (
              <li key={i}>· {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                ISIN
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Stück
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Kaufkurs
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Aktueller Wert
              </th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos, i) => (
              <tr key={i} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3 font-medium">{pos.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {pos.isin}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatNumber(pos.quantity, 0)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {pos.buyPrice ? formatCurrency(pos.buyPrice, pos.currency) : '–'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {pos.currentValue ? formatCurrency(pos.currentValue, pos.currency) : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Abbrechen
        </button>
        <button
          onClick={onConfirm}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {positions.length} Position{positions.length !== 1 ? 'en' : ''} importieren
        </button>
      </div>
    </div>
  );
}
