'use client';

import { useState, useCallback } from 'react';
import { CsvUploader } from '@/components/import/CsvUploader';
import { CsvPreview } from '@/components/import/CsvPreview';
import { mapParsedToPositions } from '@/components/import/ImportMapping';
import { usePortfolio } from '@/hooks/usePortfolio';
import { isComdirectFormat, parseComdirectCsv } from '@/lib/csv/comdirect-parser';
import { isPostbankFormat, parsePostbankCsv } from '@/lib/csv/postbank-parser';
import { ParsedPosition, BrokerFormat, CsvParseResult } from '@/lib/csv/types';
import { CheckCircle2, Upload } from 'lucide-react';

export default function ImportPage() {
  const { importPositions } = usePortfolio();
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [importComplete, setImportComplete] = useState(false);

  const handleFileLoaded = useCallback((content: string, filename: string) => {
    const lines = content.split('\n');
    const headerLine = lines[0] || '';

    let format: BrokerFormat = 'unknown';
    let positions: ParsedPosition[] = [];
    const errors: string[] = [];

    if (isComdirectFormat(headerLine)) {
      format = 'comdirect';
      positions = parseComdirectCsv(content);
    } else if (isPostbankFormat(headerLine)) {
      format = 'postbank';
      positions = parsePostbankCsv(content);
    } else {
      errors.push(
        'Das CSV-Format konnte nicht automatisch erkannt werden. Bitte stelle sicher, dass es sich um einen Export von Comdirect oder Postbank handelt.'
      );
    }

    if (positions.length === 0 && format !== 'unknown') {
      errors.push('Keine gültigen Positionen in der Datei gefunden.');
    }

    setParseResult({ format, positions, errors });
    setImportComplete(false);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!parseResult || parseResult.positions.length === 0) return;

    const mapped = mapParsedToPositions(parseResult.positions);
    importPositions(mapped);
    setImportComplete(true);
  }, [parseResult, importPositions]);

  const handleCancel = useCallback(() => {
    setParseResult(null);
    setImportComplete(false);
  }, []);

  const handleReset = useCallback(() => {
    setParseResult(null);
    setImportComplete(false);
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">CSV Import</h1>
        <p className="text-sm text-muted-foreground">
          Importiere deine Positionen aus einem Broker-Export (Comdirect oder Postbank)
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
            {parseResult?.positions.length} Position
            {parseResult?.positions.length !== 1 ? 'en' : ''} wurden
            importiert.
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
      ) : parseResult && parseResult.positions.length > 0 ? (
        /* CSV Preview */
        <CsvPreview
          positions={parseResult.positions}
          format={parseResult.format}
          errors={parseResult.errors}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ) : (
        /* Upload Area */
        <div className="space-y-6">
          <CsvUploader onFileLoaded={handleFileLoaded} />

          {parseResult && parseResult.errors.length > 0 && (
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
                    Positionen bestätigen
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Überprüfe die erkannten Positionen und bestätige den Import.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Unterstützte Broker:
              </p>
              <p className="mt-1 text-sm text-foreground">
                Comdirect · Postbank
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
