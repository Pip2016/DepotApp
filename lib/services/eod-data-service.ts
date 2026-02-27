import { createClient } from '@/lib/supabase/client';
import {
  parseCSV,
  EODDataPoint,
  getYahooURL,
  getStooqURL,
} from '@/lib/csv/historical-parser';

class EODDataService {
  // ============================================
  // DATEN LESEN (für User Requests)
  // ============================================

  async getHistorical(symbol: string, days?: number): Promise<EODDataPoint[]> {
    const supabase = createClient();
    if (!supabase) return [];

    let query = supabase
      .from('stock_historical')
      .select('date, open, high, low, close, adjusted_close, volume')
      .eq('symbol', symbol.toUpperCase())
      .order('date', { ascending: true });

    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      query = query.gte('date', startDate.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('DB Error:', error);
      return [];
    }

    return (data || []).map((row) => ({
      date: row.date,
      open: row.open ? Number(row.open) : null,
      high: row.high ? Number(row.high) : null,
      low: row.low ? Number(row.low) : null,
      close: Number(row.close),
      adjustedClose: row.adjusted_close ? Number(row.adjusted_close) : null,
      volume: row.volume ? Number(row.volume) : null,
    }));
  }

  async getLastDate(symbol: string): Promise<string | null> {
    const supabase = createClient();
    if (!supabase) return null;

    const { data } = await supabase
      .from('stock_historical')
      .select('date')
      .eq('symbol', symbol.toUpperCase())
      .order('date', { ascending: false })
      .limit(1)
      .single();

    return data?.date || null;
  }

  async getLatestPrice(
    symbol: string
  ): Promise<{ date: string; close: number } | null> {
    const supabase = createClient();
    if (!supabase) return null;

    const { data } = await supabase
      .from('stock_historical')
      .select('date, close')
      .eq('symbol', symbol.toUpperCase())
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (!data) return null;
    return { date: data.date, close: Number(data.close) };
  }

  // ============================================
  // DATEN IMPORTIEREN
  // ============================================

  async importCSV(
    symbol: string,
    csvContent: string
  ): Promise<{
    success: boolean;
    imported: number;
    error?: string;
  }> {
    const supabase = createClient();
    if (!supabase) {
      return { success: false, imported: 0, error: 'Supabase nicht konfiguriert' };
    }

    try {
      const { data: parsed, source } = parseCSV(csvContent);

      if (parsed.length === 0) {
        return {
          success: false,
          imported: 0,
          error: 'Keine Daten in CSV gefunden',
        };
      }

      // Für Supabase vorbereiten
      const records = parsed.map((row) => ({
        symbol: symbol.toUpperCase(),
        date: row.date,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        adjusted_close: row.adjustedClose,
        volume: row.volume,
        source: (source === 'yahoo' ? 'yahoo_csv' : 'stooq_csv') as 'yahoo_csv' | 'stooq_csv',
      }));

      // Upsert (insert or update)
      const { error } = await supabase
        .from('stock_historical')
        .upsert(records, { onConflict: 'symbol,date' });

      if (error) throw error;

      // Symbol in stock_symbols sicherstellen
      await this.ensureSymbolExists(symbol);

      // Last updated setzen
      await supabase
        .from('stock_symbols')
        .update({ last_updated: parsed[parsed.length - 1].date })
        .eq('symbol', symbol.toUpperCase());

      return { success: true, imported: records.length };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        error:
          error instanceof Error ? error.message : 'Import fehlgeschlagen',
      };
    }
  }

  async downloadAndImport(
    symbol: string,
    source: 'yahoo' | 'stooq' = 'yahoo'
  ): Promise<{
    success: boolean;
    imported: number;
    error?: string;
  }> {
    try {
      const url = source === 'yahoo' ? getYahooURL(symbol) : getStooqURL(symbol);

      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (!response.ok) {
        throw new Error(`Download fehlgeschlagen: ${response.status}`);
      }

      const csv = await response.text();

      // Check if we got actual data
      if (csv.trim().split('\n').length < 2) {
        throw new Error('Keine Daten erhalten');
      }

      return await this.importCSV(symbol, csv);
    } catch (error) {
      // Fallback zu anderer Quelle
      if (source === 'yahoo') {
        console.log(`Yahoo fehlgeschlagen für ${symbol}, versuche Stooq...`);
        return await this.downloadAndImport(symbol, 'stooq');
      }

      return {
        success: false,
        imported: 0,
        error:
          error instanceof Error ? error.message : 'Download fehlgeschlagen',
      };
    }
  }

  // ============================================
  // TÄGLICHES UPDATE (für Cron Job)
  // ============================================

  async updateSymbol(
    symbol: string
  ): Promise<{ success: boolean; message: string }> {
    const lastDate = await this.getLastDate(symbol);
    const today = new Date().toISOString().split('T')[0];

    // Wenn schon aktuell, nichts tun
    if (lastDate === today) {
      return { success: true, message: 'Bereits aktuell' };
    }

    // Neue Daten laden
    const result = await this.downloadAndImport(symbol, 'yahoo');

    if (result.success) {
      return {
        success: true,
        message: `${result.imported} Datenpunkte geladen`,
      };
    }

    return { success: false, message: result.error || 'Update fehlgeschlagen' };
  }

  async updateAllActiveSymbols(): Promise<{
    total: number;
    success: number;
    failed: number;
    details: Array<{ symbol: string; success: boolean; message: string }>;
  }> {
    const supabase = createClient();
    if (!supabase) {
      return { total: 0, success: 0, failed: 0, details: [] };
    }

    const { data: symbols } = await supabase
      .from('stock_symbols')
      .select('symbol')
      .eq('is_active', true);

    if (!symbols || symbols.length === 0) {
      return { total: 0, success: 0, failed: 0, details: [] };
    }

    const details: Array<{ symbol: string; success: boolean; message: string }> =
      [];
    let successCount = 0;
    let failedCount = 0;

    for (const { symbol } of symbols) {
      // Rate limiting: 2 Sekunden Pause
      await new Promise((r) => setTimeout(r, 2000));

      const result = await this.updateSymbol(symbol);
      details.push({ symbol, ...result });

      if (result.success) successCount++;
      else failedCount++;
    }

    return {
      total: symbols.length,
      success: successCount,
      failed: failedCount,
      details,
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private async ensureSymbolExists(symbol: string): Promise<void> {
    const supabase = createClient();
    if (!supabase) return;

    const { data } = await supabase
      .from('stock_symbols')
      .select('id')
      .eq('symbol', symbol.toUpperCase())
      .single();

    if (!data) {
      await supabase.from('stock_symbols').insert({
        symbol: symbol.toUpperCase(),
        yahoo_symbol: symbol,
        stooq_symbol: symbol.toLowerCase(),
        is_active: true,
      });
    }
  }

  async addSymbol(symbol: string, name?: string): Promise<void> {
    const supabase = createClient();
    if (!supabase) return;

    await supabase.from('stock_symbols').upsert(
      {
        symbol: symbol.toUpperCase(),
        name,
        yahoo_symbol: symbol,
        stooq_symbol: symbol.toLowerCase(),
        is_active: true,
      },
      { onConflict: 'symbol' }
    );
  }

  async getActiveSymbols(): Promise<string[]> {
    const supabase = createClient();
    if (!supabase) return [];

    const { data } = await supabase
      .from('stock_symbols')
      .select('symbol')
      .eq('is_active', true);

    return (data || []).map((d) => d.symbol);
  }
}

export const eodDataService = new EODDataService();
