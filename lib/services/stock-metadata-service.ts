import { createClient } from '@/lib/supabase/client';

interface StockMetadata {
  symbol: string;
  name: string;
  type?: 'stock' | 'etf' | 'fund' | 'crypto' | 'other';
  currency?: string;
  exchange?: string;
  country?: string;
  isin?: string;
  wkn?: string;
  sector?: string;
  industry?: string;
  yahooSymbol?: string;
  stooqSymbol?: string;
  finnhubSymbol?: string;
}

class StockMetadataService {
  async ensureMetadataExists(
    symbol: string,
    data?: Partial<StockMetadata>
  ): Promise<void> {
    const supabase = createClient();

    if (!supabase) return;

    // Prüfen ob bereits existiert
    const { data: existing, error: selectError } = await supabase
      .from('stock_metadata')
      .select('id')
      .eq('symbol', symbol.toUpperCase())
      .single();

    // Handle table not existing
    if (selectError?.code === 'PGRST205') {
      console.warn('[StockMetadata] Table not found');
      return;
    }

    if (existing) return;

    // Determine country and currency from symbol
    const isDE = symbol.includes('.DE');
    const defaultCountry = isDE ? 'DE' : 'US';
    const defaultCurrency = isDE ? 'EUR' : 'USD';

    // Neu anlegen
    const { error: insertError } = await supabase.from('stock_metadata').insert({
      symbol: symbol.toUpperCase(),
      name: data?.name || symbol.toUpperCase(),
      type: data?.type || 'stock',
      currency: data?.currency || defaultCurrency,
      exchange: data?.exchange,
      country: data?.country || defaultCountry,
      sector: data?.sector,
      industry: data?.industry,
      isin: data?.isin,
      wkn: data?.wkn,
      yahoo_symbol: data?.yahooSymbol || symbol,
      stooq_symbol: data?.stooqSymbol || symbol.toLowerCase(),
      finnhub_symbol: data?.finnhubSymbol || symbol,
      is_active: true,
    });

    if (insertError) {
      console.error('[StockMetadata] Insert error:', insertError);
    }
  }

  async getMetadata(symbol: string): Promise<StockMetadata | null> {
    const supabase = createClient();

    if (!supabase) return null;

    const { data, error } = await supabase
      .from('stock_metadata')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .single();

    if (error || !data) return null;

    return {
      symbol: data.symbol,
      name: data.name,
      type: data.type,
      currency: data.currency,
      exchange: data.exchange || undefined,
      country: data.country || undefined,
      isin: data.isin || undefined,
      wkn: data.wkn || undefined,
      sector: data.sector || undefined,
      industry: data.industry || undefined,
      yahooSymbol: data.yahoo_symbol || undefined,
      stooqSymbol: data.stooq_symbol || undefined,
      finnhubSymbol: data.finnhub_symbol || undefined,
    };
  }

  async getActiveSymbols(): Promise<string[]> {
    const supabase = createClient();

    if (!supabase) return [];

    const { data, error } = await supabase
      .from('stock_metadata')
      .select('symbol')
      .eq('is_active', true);

    if (error) {
      // Handle table not existing
      if (error.code === 'PGRST205') {
        console.warn('[StockMetadata] Table not found');
        return [];
      }
      console.error('[StockMetadata] Error:', error);
      return [];
    }

    return (data || []).map((d) => d.symbol);
  }

  async deactivateSymbol(symbol: string): Promise<void> {
    const supabase = createClient();

    if (!supabase) return;

    await supabase
      .from('stock_metadata')
      .update({ is_active: false })
      .eq('symbol', symbol.toUpperCase());
  }

  async updateMetadata(
    symbol: string,
    data: Partial<StockMetadata>
  ): Promise<void> {
    const supabase = createClient();

    if (!supabase) return;

    const updateData: Record<string, unknown> = {
      last_updated: new Date().toISOString(),
    };

    if (data.name) updateData.name = data.name;
    if (data.type) updateData.type = data.type;
    if (data.currency) updateData.currency = data.currency;
    if (data.exchange) updateData.exchange = data.exchange;
    if (data.country) updateData.country = data.country;
    if (data.sector) updateData.sector = data.sector;
    if (data.industry) updateData.industry = data.industry;
    if (data.isin) updateData.isin = data.isin;
    if (data.wkn) updateData.wkn = data.wkn;

    await supabase
      .from('stock_metadata')
      .update(updateData)
      .eq('symbol', symbol.toUpperCase());
  }

  async searchSymbols(query: string): Promise<StockMetadata[]> {
    const supabase = createClient();

    if (!supabase) return [];

    const { data, error } = await supabase
      .from('stock_metadata')
      .select('*')
      .or(`symbol.ilike.%${query}%,name.ilike.%${query}%,isin.ilike.%${query}%`)
      .eq('is_active', true)
      .limit(20);

    if (error || !data) return [];

    return data.map((d) => ({
      symbol: d.symbol,
      name: d.name,
      type: d.type,
      currency: d.currency,
      exchange: d.exchange || undefined,
      country: d.country || undefined,
      isin: d.isin || undefined,
      wkn: d.wkn || undefined,
    }));
  }
}

export const stockMetadataService = new StockMetadataService();
