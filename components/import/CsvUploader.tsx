'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CsvUploaderProps {
  onFileLoaded: (content: string, filename: string) => void;
}

export function CsvUploader({ onFileLoaded }: CsvUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      if (!file.name.endsWith('.csv') && !file.name.endsWith('.CSV')) {
        setError('Bitte wähle eine CSV-Datei aus.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          setFileName(file.name);
          onFileLoaded(content, file.name);
        }
      };
      reader.onerror = () => {
        setError('Fehler beim Lesen der Datei.');
      };
      reader.readAsText(file, 'utf-8');
    },
    [onFileLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const reset = () => {
    setFileName(null);
    setError(null);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50',
          fileName && 'border-positive bg-positive/5'
        )}
      >
        {fileName ? (
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-positive" />
            <div>
              <p className="font-medium text-foreground">{fileName}</p>
              <p className="text-sm text-muted-foreground">
                Datei erfolgreich geladen
              </p>
            </div>
            <button
              onClick={reset}
              className="ml-4 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-center font-medium text-foreground">
              CSV-Datei hierher ziehen
            </p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              oder klicke um eine Datei auszuwählen
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Unterstützt: Comdirect, Postbank
            </p>
          </>
        )}
        <input
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
