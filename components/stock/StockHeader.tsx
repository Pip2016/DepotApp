'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters/currency';
import { PercentChange } from '@/components/shared/PercentChange';
import { StockQuote } from '@/types/stock';
import { Skeleton } from '@/components/ui/skeleton';

interface StockHeaderProps {
  quote: StockQuote | null;
  isLoading: boolean;
}

export function StockHeader({ quote, isLoading }: StockHeaderProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-5 w-24" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-muted-foreground">
        Aktiendaten nicht verfügbar
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{quote.name}</h1>
        <span className="rounded-md bg-muted px-2 py-1 text-sm font-medium text-muted-foreground">
          {quote.symbol}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-4xl font-bold tabular-nums text-foreground">
          {formatCurrency(quote.price, quote.currency)}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-lg font-medium tabular-nums',
              quote.change >= 0 ? 'text-positive' : 'text-negative'
            )}
          >
            {quote.change >= 0 ? '+' : ''}
            {formatCurrency(quote.change, quote.currency)}
          </span>
          <PercentChange value={quote.changePercent} size="lg" />
        </div>
      </div>
    </div>
  );
}
