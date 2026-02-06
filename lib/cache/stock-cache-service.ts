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

      if (error || !data) {
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

    const supabase = createClient();
    if (!supabase) {
      console.log(`[Cache] Supabase not configured, using memory cache only`);
      // Still store in memory cache
      const cacheEntry: CacheEntry<T> = {
        data,
        provider,
        fetchedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
      this.setInMemory(cacheKey, cacheEntry, expiresAt);
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
        console.error('[Cache] Error writing:', error);
        return;
      }

      console.log(
        `[Cache] STORED: ${cacheKey} (expires: ${expiresAt.toISOString()})`
      );

      // Auch in Memory Cache speichern
      const cacheEntry: CacheEntry<T> = {
        data,
        provider,
        fetchedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
      this.setInMemory(cacheKey, cacheEntry, expiresAt);
    } catch (error) {
      console.error('[Cache] Error:', error);
    }
  }

  // Cache für ein Symbol invalidieren
  async invalidate(symbol: string, dataType?: CacheDataType): Promise<void> {
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

      await query;

      // Memory Cache auch leeren
      for (const key of this.memoryCache.keys()) {
        if (key.includes(symbol.toUpperCase())) {
          this.memoryCache.delete(key);
        }
      }

      console.log(`[Cache] INVALIDATED: ${symbol} ${dataType || 'all'}`);
    } catch (error) {
      console.error('[Cache] Error invalidating:', error);
    }
  }

  // Cleanup abgelaufener Einträge
  async cleanup(): Promise<number> {
    const supabase = createClient();
    if (!supabase) return 0;

    try {
      const { data, error } = await supabase
        .from('stock_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) throw error;

      const count = data?.length || 0;
      console.log(`[Cache] CLEANUP: Removed ${count} expired entries`);
      return count;
    } catch (error) {
      console.error('[Cache] Cleanup error:', error);
      return 0;
    }
  }
}

// Singleton Instance
export const stockCache = new StockCacheService();
