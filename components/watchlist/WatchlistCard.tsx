'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { X, Star, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PercentChange } from '@/components/shared/PercentChange';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useMultipleStockQuotes } from '@/hooks/useStockData';
import { formatCurrency } from '@/lib/formatters/currency';
import { WatchlistItem, WATCHLIST_STORAGE_KEY } from '@/types/watchlist';
import { Skeleton } from '@/components/ui/skeleton';

export function WatchlistCard() {
  const [watchlist, setWatchlist] = useLocalStorage<WatchlistItem[]>(
    WATCHLIST_STORAGE_KEY,
    []
  );

  const symbols = useMemo(
    () => watchlist.map((item) => item.symbol),
    [watchlist]
  );

  const { quotes, isLoading } = useMultipleStockQuotes(symbols);

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4" />
          Watchlist
        </CardTitle>
      </CardHeader>
      <CardContent>
        {watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Star className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Füge Aktien zu deiner Watchlist hinzu
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Klicke auf den Stern auf einer Aktien-Seite
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {watchlist.map((item) => {
              const quote = quotes[item.symbol];
              return (
                <WatchlistRow
                  key={item.symbol}
                  symbol={item.symbol}
                  name={quote?.name}
                  price={quote?.price}
                  changePercent={quote?.changePercent}
                  currency={quote?.currency}
                  isLoading={isLoading && !quote}
                  onRemove={() => removeFromWatchlist(item.symbol)}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface WatchlistRowProps {
  symbol: string;
  name?: string;
  price?: number;
  changePercent?: number;
  currency?: string;
  isLoading: boolean;
  onRemove: () => void;
}

function WatchlistRow({
  symbol,
  name,
  price,
  changePercent,
  currency,
  isLoading,
  onRemove,
}: WatchlistRowProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="text-right space-y-1">
          <Skeleton className="h-4 w-16 ml-auto" />
          <Skeleton className="h-3 w-12 ml-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center justify-between rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted">
      <Link
        href={`/stock/${encodeURIComponent(symbol)}`}
        className="flex-1 min-w-0"
      >
        <div className="font-medium text-sm text-foreground">{symbol}</div>
        <div className="text-xs text-muted-foreground truncate">
          {name || 'Lädt...'}
        </div>
      </Link>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="font-medium text-sm tabular-nums text-foreground">
            {price !== undefined
              ? formatCurrency(price, currency || 'EUR')
              : '-'}
          </div>
          {changePercent !== undefined && (
            <PercentChange value={changePercent} size="sm" showIcon={false} />
          )}
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            onRemove();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-all"
          title="Aus Watchlist entfernen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
