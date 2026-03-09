import { createClient } from '@/lib/supabase/client';
import { parseCSV } from '@/lib/import/csv-parser';
import { getYahooDownloadURL } from '@/lib/import/yahoo-csv-parser';
import {
  getStooqDownloadURL,
  formatSymbolForStooq,
} from '@/lib/import/stooq-csv-parser';
import { ImportResult, ParsedHistoricalData } from '@/lib/import/types';

export interface HistoricalDataPoint {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  adjustedClose: number | null;
  volume: number | null;
}

class HistoricalDataService {
  // ============================================
  // DATEN ABRUFEN
  // ============================================

  async getHistoricalData(
    symbol: string,
    startDate?: string,
    endDate?: string
  ): Promise<HistoricalDataPoint[]> {
    const supabase = createClient();

    if (!supabase) {
      console.warn('[HistoricalData] Supabase not configured');
      return [];
    }

    let query = supabase
      .from('stock_historical')
      .select('date, open, high, low, close, adjusted_close, volume')
      .eq('symbol', symbol.toUpperCase())
      .order('date', { ascending: true });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      // Table might not exist yet
      if (error.code === 'PGRST205' || error.message?.includes('stock_historical')) {
        console.warn('[HistoricalData] Table not found, returning empty');
        return [];
      }
      console.error('Error fetching historical data:', error);
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

  // Prüfen ob Daten existieren
  async hasHistoricalData(symbol: string): Promise<boolean> {
    const supabase = createClient();
    if (!supabase) return false;

    const { count, error } = await supabase
      .from('stock_historical')
      .select('id', { count: 'exact', head: true })
      .eq('symbol', symbol.toUpperCase());

    if (error) return false;
    return (count || 0) > 0;
  }

  // Letztes Datum abrufen
  async getLastDate(symbol: string): Promise<string | null> {
    const supabase = createClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('stock_historical')
      .select('date')
      .eq('symbol', symbol.toUpperCase())
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data.date;
  }

  // ============================================
  // DATEN IMPORTIEREN
  // ============================================

  // Import aus CSV String
  async importFromCSV(
    symbol: string,
    csvContent: string,
    source: 'yahoo_csv' | 'stooq_csv' | 'manual' = 'manual'
  ): Promise<ImportResult> {
    const supabase = createClient();

    if (!supabase) {
      return {
        success: false,
        symbol,
        recordsImported: 0,
        recordsSkipped: 0,
        recordsFailed: 0,
        dateRange: null,
        error: 'Supabase not configured',
      };
    }

    try {
      const parseResult = parseCSV(csvContent);

      if (parseResult.data.length === 0) {
        return {
          success: false,
          symbol,
          recordsImported: 0,
          recordsSkipped: 0,
          recordsFailed: 0,
          dateRange: null,
          error: 'No valid data found in CSV',
        };
      }

      // Daten für Supabase vorbereiten
      const records = parseResult.data.map((row) => ({
        symbol: symbol.toUpperCase(),
        date: row.date,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        adjusted_close: row.adjustedClose,
        volume: row.volume,
        source,
      }));

      // Batch Insert mit Upsert (überschreibt existierende)
      const { data, error } = await supabase
        .from('stock_historical')
        .upsert(records, {
          onConflict: 'symbol,date',
          ignoreDuplicates: false,
        })
        .select('id');

      if (error) {
        throw error;
      }

      // Import Log erstellen
      await this.logImport({
        importType:
          source === 'manual'
            ? 'csv_manual'
            : source === 'yahoo_csv'
              ? 'csv_yahoo'
              : 'csv_stooq',
        symbols: [symbol.toUpperCase()],
        recordsImported: data?.length || records.length,
        recordsSkipped: 0,
        recordsFailed: 0,
        dateFrom: parseResult.dateRange?.from,
        dateTo: parseResult.dateRange?.to,
        status: 'completed',
      });

      return {
        success: true,
        symbol: symbol.toUpperCase(),
        recordsImported: data?.length || records.length,
        recordsSkipped: 0,
        recordsFailed: 0,
        dateRange: parseResult.dateRange,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        symbol,
        recordsImported: 0,
        recordsSkipped: 0,
        recordsFailed: 0,
        dateRange: null,
        error: errorMessage,
      };
    }
  }

  // Automatischer Download von Yahoo Finance
  async importFromYahoo(symbol: string, startDate?: Date): Promise<ImportResult> {
    try {
      const url = getYahooDownloadURL(symbol, startDate);

      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Yahoo Finance returned ${response.status}`);
      }

      const csvContent = await response.text();
      return await this.importFromCSV(symbol, csvContent, 'yahoo_csv');
    } catch (error) {
      return {
        success: false,
        symbol,
        recordsImported: 0,
        recordsSkipped: 0,
        recordsFailed: 0,
        dateRange: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to download from Yahoo',
      };
    }
  }

  // Automatischer Download von Stooq
  async importFromStooq(symbol: string, market?: string): Promise<ImportResult> {
    try {
      const stooqSymbol = formatSymbolForStooq(symbol, market);
      const url = getStooqDownloadURL(stooqSymbol);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Stooq returned ${response.status}`);
      }

      const csvContent = await response.text();

      // Prüfen ob es echte Daten sind (Stooq gibt manchmal leere Responses)
      if (csvContent.trim().split('\n').length < 2) {
        throw new Error('No data returned from Stooq');
      }

      return await this.importFromCSV(symbol, csvContent, 'stooq_csv');
    } catch (error) {
      return {
        success: false,
        symbol,
        recordsImported: 0,
        recordsSkipped: 0,
        recordsFailed: 0,
        dateRange: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to download from Stooq',
      };
    }
  }

  // Smart Import: Versucht automatisch die beste Quelle
  async smartImport(symbol: string): Promise<ImportResult> {
    // 1. Versuche Yahoo Finance
    console.log(`[SmartImport] Trying Yahoo for ${symbol}...`);
    let result = await this.importFromYahoo(symbol);

    if (result.success && result.recordsImported > 0) {
      console.log(
        `[SmartImport] Yahoo success: ${result.recordsImported} records`
      );
      return result;
    }

    // 2. Versuche Stooq
    console.log(`[SmartImport] Trying Stooq for ${symbol}...`);
    result = await this.importFromStooq(symbol);

    if (result.success && result.recordsImported > 0) {
      console.log(
        `[SmartImport] Stooq success: ${result.recordsImported} records`
      );
      return result;
    }

    // 3. Alle Quellen fehlgeschlagen
    console.log(`[SmartImport] All sources failed for ${symbol}`);
    return {
      success: false,
      symbol,
      recordsImported: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      dateRange: null,
      error: 'All data sources failed',
    };
  }

  // ============================================
  // TÄGLICHE UPDATES
  // ============================================

  // Update für ein Symbol (nur neue Daten)
  async updateSymbol(symbol: string): Promise<ImportResult> {
    const lastDate = await this.getLastDate(symbol);

    if (!lastDate) {
      // Keine Daten vorhanden → Kompletter Import
      return await this.smartImport(symbol);
    }

    // Nur Daten seit letztem Datum holen
    const startDate = new Date(lastDate);
    startDate.setDate(startDate.getDate() + 1); // Tag nach letztem Datum

    // Wenn letztes Datum heute ist, nichts zu tun
    const today = new Date().toISOString().split('T')[0];
    if (lastDate >= today) {
      return {
        success: true,
        symbol,
        recordsImported: 0,
        recordsSkipped: 0,
        recordsFailed: 0,
        dateRange: null,
      };
    }

    return await this.importFromYahoo(symbol, startDate);
  }

  // Bulk Update für alle aktiven Symbole
  async updateAllSymbols(): Promise<{
    total: number;
    success: number;
    failed: number;
    results: ImportResult[];
  }> {
    const supabase = createClient();

    if (!supabase) {
      return { total: 0, success: 0, failed: 0, results: [] };
    }

    // Alle aktiven Symbole holen
    const { data: metadata, error } = await supabase
      .from('stock_metadata')
      .select('symbol')
      .eq('is_active', true);

    if (error || !metadata) {
      return { total: 0, success: 0, failed: 0, results: [] };
    }

    const results: ImportResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const { symbol } of metadata) {
      const result = await this.updateSymbol(symbol);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }

      // Rate Limiting: 1 Sekunde Pause zwischen Requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return {
      total: metadata.length,
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private async logImport(params: {
    importType: 'csv_yahoo' | 'csv_stooq' | 'csv_manual' | 'api_bulk' | 'api_daily';
    symbols: string[];
    recordsImported: number;
    recordsSkipped: number;
    recordsFailed: number;
    dateFrom?: string;
    dateTo?: string;
    status: 'started' | 'completed' | 'failed' | 'partial';
    error?: string;
  }): Promise<void> {
    const supabase = createClient();

    if (!supabase) return;

    try {
      await supabase.from('data_import_log').insert({
        import_type: params.importType,
        symbols: params.symbols,
        symbol_count: params.symbols.length,
        records_imported: params.recordsImported,
        records_skipped: params.recordsSkipped,
        records_failed: params.recordsFailed,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        status: params.status,
        error_message: params.error,
        triggered_by: 'system',
        completed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log import:', error);
    }
  }
}

export const historicalDataService = new HistoricalDataService();
