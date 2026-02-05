'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ParsedPosition,
  ColumnMapping,
  MappableField,
} from '@/lib/csv/types';
import { reparseWithMapping, FIELD_LABELS } from '@/lib/csv/generic-parser';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatNumber } from '@/lib/formatters/number';
import { CheckCircle2, AlertCircle, ChevronDown, Settings2 } from 'lucide-react';

interface CsvPreviewProps {
  positions: ParsedPosition[];
  errors: string[];
  columnMapping: ColumnMapping;
  rawHeaders: string[];
  rawData: string[][];
  onConfirm: (positions: ParsedPosition[]) => void;
  onCancel: () => void;
}

const ALL_FIELDS: MappableField[] = [
  'name',
  'wkn',
  'isin',
  'quantity',
  'currency',
  'currentPrice',
  'currentValue',
  'buyPrice',
  'buyValue',
  'profitLoss',
  'profitLossPercent',
  'ignore',
];

export function CsvPreview({
  positions: initialPositions,
  errors,
  columnMapping: initialMapping,
  rawHeaders,
  rawData,
  onConfirm,
  onCancel,
}: CsvPreviewProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping);
  const [showMappingEditor, setShowMappingEditor] = useState(false);

  // Reparse positions when mapping changes
  const positions = useMemo(() => {
    if (mapping === initialMapping) {
      return initialPositions;
    }
    return reparseWithMapping(rawHeaders, rawData, mapping);
  }, [mapping, initialMapping, initialPositions, rawHeaders, rawData]);

  // Update a single column mapping
  const updateMapping = useCallback((columnIndex: number, field: MappableField) => {
    setMapping((prev) => ({
      ...prev,
      [columnIndex]: {
        ...prev[columnIndex],
        mappedTo: field,
        confidence: 'high', // User explicitly set this
      },
    }));
  }, []);

  // Get confidence badge color
  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return 'bg-positive/20 text-positive';
      case 'medium':
        return 'bg-accent/20 text-accent-foreground';
      case 'low':
        return 'bg-muted text-muted-foreground';
    }
  };

  // Check if required fields are mapped
  const hasRequiredFields = useMemo(() => {
    const mappedFields = Object.values(mapping).map((c) => c.mappedTo);
    return mappedFields.includes('name') && mappedFields.includes('quantity');
  }, [mapping]);

  return (
    <div className="space-y-4">
      {/* Header with status */}
      <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
        <div className="flex items-center gap-2">
          {positions.length > 0 ? (
            <CheckCircle2 className="h-5 w-5 text-positive" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
          <span className="text-sm font-medium">
            {positions.length} Position{positions.length !== 1 ? 'en' : ''} erkannt
          </span>
          <span className="text-sm text-muted-foreground">
            · {rawHeaders.length} Spalten · {rawData.length} Zeilen
          </span>
        </div>
        <button
          onClick={() => setShowMappingEditor(!showMappingEditor)}
          className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Settings2 className="h-4 w-4" />
          Spalten-Zuordnung
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showMappingEditor ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Hinweise</span>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-destructive">
            {errors.map((error, i) => (
              <li key={i}>· {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Column Mapping Editor */}
      {showMappingEditor && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Spalten-Zuordnung anpassen
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Wähle für jede Spalte aus der CSV-Datei das entsprechende Feld aus.
            Mindestens &quot;Bezeichnung&quot; und &quot;Anzahl&quot; müssen zugeordnet sein.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rawHeaders.map((header, index) => {
              const config = mapping[index];
              return (
                <div
                  key={index}
                  className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="truncate text-xs font-medium text-foreground"
                      title={header}
                    >
                      {header || `Spalte ${index + 1}`}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getConfidenceColor(
                        config?.confidence || 'low'
                      )}`}
                    >
                      {config?.confidence === 'high'
                        ? 'Sicher'
                        : config?.confidence === 'medium'
                          ? 'Möglich'
                          : 'Unbekannt'}
                    </span>
                  </div>
                  <select
                    value={config?.mappedTo || 'ignore'}
                    onChange={(e) =>
                      updateMapping(index, e.target.value as MappableField)
                    }
                    className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {ALL_FIELDS.map((field) => (
                      <option key={field} value={field}>
                        {FIELD_LABELS[field]}
                      </option>
                    ))}
                  </select>
                  {/* Sample value */}
                  {rawData[0] && rawData[0][index] && (
                    <span className="truncate text-[10px] text-muted-foreground">
                      Bsp: {rawData[0][index]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview Table */}
      {positions.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  WKN/ISIN
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Stück
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Kaufwert
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Aktueller Wert
                </th>
              </tr>
            </thead>
            <tbody>
              {positions.slice(0, 10).map((pos, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-medium">{pos.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {pos.wkn || pos.isin || '–'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatNumber(pos.quantity, 0)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {pos.buyValue
                      ? formatCurrency(pos.buyValue, pos.currency)
                      : pos.buyPrice
                        ? formatCurrency(pos.buyPrice * pos.quantity, pos.currency)
                        : '–'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {pos.currentValue
                      ? formatCurrency(pos.currentValue, pos.currency)
                      : pos.currentPrice
                        ? formatCurrency(pos.currentPrice * pos.quantity, pos.currency)
                        : '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {positions.length > 10 && (
            <div className="border-t border-border bg-muted/50 px-4 py-2 text-center text-xs text-muted-foreground">
              ... und {positions.length - 10} weitere Positionen
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Keine Positionen erkannt. Bitte überprüfe die Spalten-Zuordnung.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Abbrechen
        </button>
        <button
          onClick={() => onConfirm(positions)}
          disabled={!hasRequiredFields || positions.length === 0}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {positions.length} Position{positions.length !== 1 ? 'en' : ''}{' '}
          importieren
        </button>
      </div>
    </div>
  );
}
