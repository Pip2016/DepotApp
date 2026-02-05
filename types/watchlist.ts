export interface WatchlistItem {
  symbol: string;
  addedAt: string; // ISO Date
}

export const WATCHLIST_MAX_ITEMS = 10;
export const WATCHLIST_STORAGE_KEY = 'mydepot-watchlist';
