import { createClient } from '@/lib/supabase/client';
import type { Json } from '@/types/database';

// Cache Durations in Minuten
export const CACHE_DURATION = {
  quote: 5, // 5 Minuten - Kurse ändern sich häufig
  fundamentals: 1440, // 24 Stunden - Fundamentals ändern sich selten
  historical: 360, // 6 Stunden - Historische Daten
  news: 30, // 30 Minuten - News sollten aktuell sein
} as const;

type CacheDataType = keyof typeof CACHE_DURATION;

interface CacheEntry<T> {
  data: T;
  provider: string | null;
  fetchedAt: string;
  expiresAt: string;
}

// Client-Side Cache Service
export class StockCacheService {
  private memoryCache: Map<string, { data: unknown; expiresAt: number }> =
    new Map();
  private dbCacheDisabled = false;
  private dbCacheWarningShown = false;

  private generateCacheKey(
    dataType: CacheDataType,
    symbol: string,
    extra?: string
  ): string {
    const parts = [dataType, symbol.toUpperCase()];
    if (extra) parts.push(extra);
    return parts.join(':');
  }

  private getExpirationDate(dataType: CacheDataType): Date {
    const minutes = CACHE_DURATION[dataType];
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  // Memory Cache für ultra-schnelle wiederholte Zugriffe
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setInMemory<T>(key: string, data: T, expiresAt: Date): void {
    this.memoryCache.set(key, {
      data,
      expiresAt: expiresAt.getTime(),
    });
  }

  private handleMissingTable(): void {
    this.dbCacheDisabled = true;
    if (!this.dbCacheWarningShown) {
      this.dbCacheWarningShown = true;
      console.warn(
        '[Cache] stock_cache table not found. Using memory-only cache. ' +
        'Run the migration in supabase/migrations/002_stock_cache.sql to enable DB caching.'
      );
    }
  }

  // Aus Supabase Cache lesen
  async get<T>(
    dataType: CacheDataType,
    symbol: string,
    extra?: string
  ): Promise<CacheEntry<T> | null> {
    const cacheKey = this.generateCacheKey(dataType, symbol, extra);

    // 1. Erst Memory Cache prüfen (schnellste Option)
    const memoryData = this.getFromMemory<CacheEntry<T>>(cacheKey);
    if (memoryData) {
      console.log(`[Cache] Memory HIT: ${cacheKey}`);
      return memoryData;
    }

    // 2. Dann Supabase Cache prüfen
    if (this.dbCacheDisabled) {
      return null;
    }

    const supabase = createClient();
    if (!supabase) {
      console.log(`[Cache] Supabase not configured, skipping cache`);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('stock_cache')
        .select('data, provider, fetched_at, expires_at')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) {
        // Check if table doesn't exist
        if (error.code === 'PGRST205' || error.message?.includes('stock_cache')) {
          this.handleMissingTable();
          return null;
        }
        console.log(`[Cache] MISS: ${cacheKey}`);
        return null;
      }

      if (!data) {
        console.log(`[Cache] MISS: ${cacheKey}`);
        return null;
      }

      console.log(`[Cache] Supabase HIT: ${cacheKey}`);

      const cacheEntry: CacheEntry<T> = {
        data: data.data as T,
        provider: data.provider,
        fetchedAt: data.fetched_at,
        expiresAt: data.expires_at,
      };

      // In Memory Cache speichern für nächsten Zugriff
      this.setInMemory(cacheKey, cacheEntry, new Date(data.expires_at));

      return cacheEntry;
    } catch (error) {
      console.error('[Cache] Error reading:', error);
      return null;
    }
  }

  // In Supabase Cache schreiben
  async set<T>(
    dataType: CacheDataType,
    symbol: string,
    data: T,
    provider: string,
    extra?: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(dataType, symbol, extra);
    const expiresAt = this.getExpirationDate(dataType);

    // Always store in memory cache first
    const cacheEntry: CacheEntry<T> = {
      data,
      provider,
      fetchedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    this.setInMemory(cacheKey, cacheEntry, expiresAt);

    // Skip DB cache if disabled or not configured
    if (this.dbCacheDisabled) {
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      console.log(`[Cache] Supabase not configured, using memory cache only`);
      return;
    }

    try {
      // Upsert - Insert oder Update falls existiert
      const { error } = await supabase.from('stock_cache').upsert(
        {
          cache_key: cacheKey,
          symbol: symbol.toUpperCase(),
          data_type: dataType,
          data: data as Json,
          provider,
          fetched_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: 'cache_key',
        }
      );

      if (error) {
        // Check if table doesn't exist
        if (error.code === 'PGRST205' || error.message?.includes('stock_cache')) {
          this.handleMissingTable();
          return;
        }
        console.error('[Cache] Error writing:', error);
        return;
      }

      console.log(
        `[Cache] STORED: ${cacheKey} (expires: ${expiresAt.toISOString()})`
      );
    } catch (error) {
      console.error('[Cache] Error:', error);
    }
  }

  // Cache für ein Symbol invalidieren
  async invalidate(symbol: string, dataType?: CacheDataType): Promise<void> {
    // Always clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(symbol.toUpperCase())) {
        if (!dataType || key.startsWith(dataType)) {
          this.memoryCache.delete(key);
        }
      }
    }

    if (this.dbCacheDisabled) return;

    const supabase = createClient();
    if (!supabase) return;

    try {
      let query = supabase
        .from('stock_cache')
        .delete()
        .eq('symbol', symbol.toUpperCase());

      if (dataType) {
        query = query.eq('data_type', dataType);
      }

      const { error } = await query;

      if (error?.code === 'PGRST205') {
        this.handleMissingTable();
        return;
      }

      console.log(`[Cache] INVALIDATED: ${symbol} ${dataType || 'all'}`);
    } catch (error) {
      console.error('[Cache] Error invalidating:', error);
    }
  }

  // Cleanup abgelaufener Einträge
  async cleanup(): Promise<number> {
    // Cleanup memory cache
    let memoryCleanedCount = 0;
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
        memoryCleanedCount++;
      }
    }

    if (this.dbCacheDisabled) {
      return memoryCleanedCount;
    }

    const supabase = createClient();
    if (!supabase) return memoryCleanedCount;

    try {
      const { data, error } = await supabase
        .from('stock_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        if (error.code === 'PGRST205') {
          this.handleMissingTable();
          return memoryCleanedCount;
        }
        throw error;
      }

      const dbCount = data?.length || 0;
      const totalCount = memoryCleanedCount + dbCount;
      console.log(`[Cache] CLEANUP: Removed ${totalCount} expired entries (${memoryCleanedCount} memory, ${dbCount} db)`);
      return totalCount;
    } catch (error) {
      console.error('[Cache] Cleanup error:', error);
      return memoryCleanedCount;
    }
  }
}

// Singleton Instance
export const stockCache = new StockCacheService();
