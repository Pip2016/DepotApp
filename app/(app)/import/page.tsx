'use client';

import { useState, useCallback } from 'react';
import { CsvUploader } from '@/components/import/CsvUploader';
import { CsvPreview } from '@/components/import/CsvPreview';
import { usePortfolio } from '@/hooks/usePortfolio';
import { parseGenericCsv } from '@/lib/csv/generic-parser';
import { ParsedPosition, CsvParseResult, ColumnMapping } from '@/lib/csv/types';
import { CheckCircle2 } from 'lucide-react';

export default function ImportPage() {
  const { importPositions } = usePortfolio();
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [importComplete, setImportComplete] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleFileLoaded = useCallback((content: string, _filename: string) => {
    const result = parseGenericCsv(content);
    setParseResult(result);
    setImportComplete(false);
  }, []);

  const handleConfirm = useCallback((positions: ParsedPosition[]) => {
    if (positions.length === 0) return;

    // Map parsed positions to portfolio positions
    const mapped = positions.map((p) => ({
      symbol: p.wkn || p.isin || p.name.substring(0, 10).toUpperCase(),
      isin: p.isin,
      wkn: p.wkn,
      name: p.name,
      quantity: p.quantity,
      buyPrice: p.buyPrice ?? p.buyValue ? (p.buyValue! / p.quantity) : 0,
      buyDate: new Date().toISOString().split('T')[0],
      currency: (p.currency === 'EUR' || p.currency === 'USD' ? p.currency : 'EUR') as 'EUR' | 'USD',
      currentPrice: p.currentPrice,
    }));

    importPositions(mapped);
    setImportedCount(positions.length);
    setImportComplete(true);
  }, [importPositions]);

  const handleCancel = useCallback(() => {
    setParseResult(null);
    setImportComplete(false);
  }, []);

  const handleReset = useCallback(() => {
    setParseResult(null);
    setImportComplete(false);
    setImportedCount(0);
  }, []);

  // Check if we have valid parse result with required data for preview
  const hasValidParseResult = parseResult &&
    parseResult.columnMapping &&
    parseResult.rawHeaders &&
    parseResult.rawData;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">CSV Import</h1>
        <p className="text-sm text-muted-foreground">
          Importiere deine Positionen aus einer CSV-Datei. Die Spalten werden automatisch erkannt.
        </p>
      </div>

      {/* Import Complete */}
      {importComplete ? (
        <div className="rounded-xl border border-positive/50 bg-positive/5 p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-positive" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            Import erfolgreich!
          </h2>
          <p className="mt-2 text-muted-foreground">
            {importedCount} Position{importedCount !== 1 ? 'en' : ''} wurden importiert.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={handleReset}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Weitere Datei importieren
            </button>
            <a
              href="/"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Zum Dashboard
            </a>
          </div>
        </div>
      ) : hasValidParseResult ? (
        /* CSV Preview with mapping editor */
        <CsvPreview
          positions={parseResult.positions}
          errors={parseResult.errors}
          columnMapping={parseResult.columnMapping as ColumnMapping}
          rawHeaders={parseResult.rawHeaders as string[]}
          rawData={parseResult.rawData as string[][]}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ) : (
        /* Upload Area */
        <div className="space-y-6">
          <CsvUploader onFileLoaded={handleFileLoaded} />

          {parseResult && parseResult.errors.length > 0 && !hasValidParseResult && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <p className="font-medium text-destructive">Fehler beim Import</p>
              {parseResult.errors.map((error, i) => (
                <p key={i} className="mt-1 text-sm text-destructive">
                  {error}
                </p>
              ))}
            </div>
          )}

          {/* Instructions */}
          <div className="card-shadow rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-lg font-semibold text-card-foreground">
              So funktioniert der Import
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </div>
                <div>
                  <p className="font-medium text-card-foreground">
                    CSV-Datei exportieren
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Logge dich bei deinem Broker ein und exportiere deine
                    Depotübersicht als CSV-Datei.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </div>
                <div>
                  <p className="font-medium text-card-foreground">
                    Datei hochladen
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ziehe die CSV-Datei in den Upload-Bereich oder klicke zum
                    Auswählen.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  3
                </div>
                <div>
                  <p className="font-medium text-card-foreground">
                    Spalten-Zuordnung prüfen
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Die Spalten werden automatisch erkannt. Du kannst die
                    Zuordnung bei Bedarf anpassen.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  4
                </div>
                <div>
                  <p className="font-medium text-card-foreground">
                    Positionen importieren
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Überprüfe die erkannten Positionen und bestätige den Import.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Unterstützte Formate:
              </p>
              <p className="mt-1 text-sm text-foreground">
                CSV-Dateien mit Komma (,) oder Semikolon (;) als Trennzeichen.
                Spalten werden automatisch anhand der Überschriften erkannt.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
