'use client';

import { useMemo } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  WatchlistItem,
  WATCHLIST_STORAGE_KEY,
  WATCHLIST_MAX_ITEMS,
} from '@/types/watchlist';
import { useToast } from '@/hooks/use-toast';

interface AddToWatchlistButtonProps {
  symbol: string;
  className?: string;
}

export function AddToWatchlistButton({
  symbol,
  className,
}: AddToWatchlistButtonProps) {
  const { toast } = useToast();
  const [watchlist, setWatchlist] = useLocalStorage<WatchlistItem[]>(
    WATCHLIST_STORAGE_KEY,
    []
  );

  const isInWatchlist = useMemo(
    () => watchlist.some((item) => item.symbol === symbol),
    [watchlist, symbol]
  );

  const toggleWatchlist = () => {
    if (isInWatchlist) {
      setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
      toast({
        title: 'Aus Watchlist entfernt',
        description: `${symbol} wurde aus deiner Watchlist entfernt.`,
      });
    } else {
      if (watchlist.length >= WATCHLIST_MAX_ITEMS) {
        toast({
          title: 'Watchlist voll',
          description: `Du kannst maximal ${WATCHLIST_MAX_ITEMS} Aktien in deiner Watchlist haben.`,
          variant: 'destructive',
        });
        return;
      }

      setWatchlist((prev) => [
        ...prev,
        { symbol, addedAt: new Date().toISOString() },
      ]);
      toast({
        title: 'Zur Watchlist hinzugefügt',
        description: `${symbol} wurde zu deiner Watchlist hinzugefügt.`,
      });
    }
  };

  return (
    <button
      onClick={toggleWatchlist}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isInWatchlist
          ? 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 dark:text-yellow-500'
          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
        className
      )}
      title={isInWatchlist ? 'Aus Watchlist entfernen' : 'Zur Watchlist hinzufügen'}
    >
      <Star
        className={cn('h-4 w-4', isInWatchlist && 'fill-current')}
      />
      {isInWatchlist ? 'Auf Watchlist' : 'Watchlist'}
    </button>
  );
}
