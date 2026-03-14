'use client';

import { AlertCircle, RefreshCw, Database, Loader2 } from 'lucide-react';
import { useFundamentals } from '@/hooks/useFundamentals';
import { FUNDAMENTALS_CATEGORIES } from '@/types/fundamentals';
import { FundamentalsTable } from './FundamentalsTable';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface FundamentalsViewProps {
  symbol: string;
}

export function FundamentalsView({ symbol }: FundamentalsViewProps) {
  const { data, currency, isLoading, error, isCached, isLimitReached, refetch } =
    useFundamentals(symbol);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Lade fundamentale Kennzahlen...</span>
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Erneut versuchen
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (data.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Keine fundamentalen Kennzahlen für {symbol} verfügbar.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {(isCached || isLimitReached) && (
        <Alert variant={isLimitReached ? 'destructive' : 'default'} className="bg-muted/50">
          <Database className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {isLimitReached
                ? 'API-Limit erreicht. Zeige gecachte Daten.'
                : 'Daten aus Cache geladen.'}
            </span>
            {!isLimitReached && (
              <Button variant="ghost" size="sm" onClick={refetch}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Aktualisieren
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Fundamentals Categories */}
      {FUNDAMENTALS_CATEGORIES.map((category) => {
        // Prüfe ob mindestens eine Kennzahl Daten hat
        const hasData = category.metrics.some((metric) =>
          data.some((year) => year[metric.key] !== undefined && year[metric.key] !== null)
        );

        if (!hasData) return null;

        return (
          <FundamentalsTable
            key={category.nameEn}
            title={category.name}
            metrics={category.metrics}
            data={data}
            currency={currency}
          />
        );
      })}

      {/* Data Source Info */}
      <p className="text-xs text-muted-foreground text-right">
        Datenquelle: Financial Modeling Prep | Letzte Aktualisierung: {new Date().toLocaleDateString('de-DE')}
      </p>
    </div>
  );
}
