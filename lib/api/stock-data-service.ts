import {
  StockDataProvider,
  StockQuote,
  FundamentalData,
  HistoricalDataPoint,
  ProviderError,
  ServiceResponse,
} from './providers/types';
import { YahooFinanceProvider } from './providers/yahoo-finance';
import { FinnhubProvider } from './providers/finnhub';
import { AlphaVantageProvider } from './providers/alpha-vantage';
import { stockCache } from '@/lib/cache/stock-cache-service';

// Performance Daten Interface
export interface PerformanceData {
  currentPrice: number;

  // Absolute Änderungen
  change1D: number;
  change1W: number;
  change1M: number;
  change3M: number;
  changeYTD: number;
  change1Y: number;

  // Prozentuale Änderungen
  changePercent1D: number;
  changePercent1W: number;
  changePercent1M: number;
  changePercent3M: number;
  changePercentYTD: number;
  changePercent1Y: number;
}

class StockDataService {
  private providers: StockDataProvider[];
  private errorLog: ProviderError[] = [];

  constructor() {
    // Initialize providers sorted by priority
    this.providers = [
      new YahooFinanceProvider(),
      new FinnhubProvider(),
      new AlphaVantageProvider(),
    ].sort((a, b) => a.priority - b.priority);
  }

  private logError(
    provider: string,
    error: string,
    statusCode?: number
  ): void {
    const providerError: ProviderError = {
      provider,
      error,
      statusCode,
      timestamp: Date.now(),
    };

    this.errorLog.push(providerError);
    console.error(`[${provider}] ${error}`);

    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }
  }

  async getQuote(symbol: string): Promise<ServiceResponse<StockQuote>> {
    const errors: ProviderError[] = [];

    // 1. Cache prüfen
    const cached = await stockCache.get<StockQuote>('quote', symbol);
    if (cached) {
      return {
        success: true,
        data: cached.data,
        provider: cached.provider || undefined,
        fromCache: true,
        errors: [],
      };
    }

    // 2. Von API holen
    for (const provider of this.providers) {
      if (!provider.capabilities.quote) continue;

      try {
        console.log(
          `[StockDataService] Fetching quote from ${provider.name}: ${symbol}`
        );
        const data = await provider.getQuote(symbol);

        // 3. In Cache speichern
        await stockCache.set('quote', symbol, data, provider.name);

        return {
          success: true,
          data,
          provider: provider.name,
          fromCache: false,
          errors,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const providerError: ProviderError = {
          provider: provider.name,
          error: errorMessage,
          timestamp: Date.now(),
        };

        errors.push(providerError);
        this.logError(provider.name, errorMessage);
        continue;
      }
    }

    return {
      success: false,
      errors,
    };
  }

  async getFundamentals(
    symbol: string
  ): Promise<ServiceResponse<FundamentalData>> {
    const errors: ProviderError[] = [];

    // 1. Cache prüfen (24h Cache!)
    const cached = await stockCache.get<FundamentalData>('fundamentals', symbol);
    if (cached) {
      return {
        success: true,
        data: cached.data,
        provider: cached.provider || undefined,
        fromCache: true,
        errors: [],
      };
    }

    // 2. Von API holen
    for (const provider of this.providers) {
      if (!provider.capabilities.fundamentals || !provider.getFundamentals)
        continue;

      try {
        console.log(
          `[StockDataService] Fetching fundamentals from ${provider.name}: ${symbol}`
        );
        const data = await provider.getFundamentals(symbol);

        // 3. In Cache speichern
        await stockCache.set('fundamentals', symbol, data, provider.name);

        return {
          success: true,
          data,
          provider: provider.name,
          fromCache: false,
          errors,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          provider: provider.name,
          error: errorMessage,
          timestamp: Date.now(),
        });

        this.logError(provider.name, errorMessage);
        continue;
      }
    }

    return {
      success: false,
      errors,
    };
  }

  async getHistorical(
    symbol: string,
    range: string
  ): Promise<ServiceResponse<HistoricalDataPoint[]>> {
    const errors: ProviderError[] = [];

    // 1. Cache prüfen (6h Cache, mit Range als Extra-Key)
    const cached = await stockCache.get<HistoricalDataPoint[]>(
      'historical',
      symbol,
      range
    );
    if (cached) {
      return {
        success: true,
        data: cached.data,
        provider: cached.provider || undefined,
        fromCache: true,
        errors: [],
      };
    }

    // 2. Von API holen
    for (const provider of this.providers) {
      if (!provider.capabilities.historical || !provider.getHistorical)
        continue;

      try {
        console.log(
          `[StockDataService] Fetching historical from ${provider.name}: ${symbol} (${range})`
        );
        const data = await provider.getHistorical(symbol, range);

        // 3. In Cache speichern
        await stockCache.set('historical', symbol, data, provider.name, range);

        return {
          success: true,
          data,
          provider: provider.name,
          fromCache: false,
          errors,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          provider: provider.name,
          error: errorMessage,
          timestamp: Date.now(),
        });

        this.logError(provider.name, errorMessage);
        continue;
      }
    }

    return {
      success: false,
      errors,
    };
  }

  // Performance für verschiedene Zeiträume berechnen
  async getPerformanceData(
    symbol: string
  ): Promise<ServiceResponse<PerformanceData>> {
    const errors: ProviderError[] = [];

    try {
      // Historische Daten für 1 Jahr holen (beinhaltet alle kürzeren Zeiträume)
      const historicalResult = await this.getHistorical(symbol, '1y');

      if (!historicalResult.success || !historicalResult.data) {
        return { success: false, errors: historicalResult.errors };
      }

      const data = historicalResult.data;
      const currentPrice = data[data.length - 1]?.close;

      if (!currentPrice || data.length === 0) {
        return {
          success: false,
          errors: [
            {
              provider: 'calculation',
              error: 'Insufficient data',
              timestamp: Date.now(),
            },
          ],
        };
      }

      // Performance berechnen
      const performance = this.calculatePerformanceFromHistorical(
        data,
        currentPrice
      );

      return {
        success: true,
        data: performance,
        provider: historicalResult.provider,
        fromCache: historicalResult.fromCache,
        errors: [],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push({
        provider: 'calculation',
        error: errorMessage,
        timestamp: Date.now(),
      });
      return { success: false, errors };
    }
  }

  // Hilfsfunktion: Performance aus historischen Daten berechnen
  private calculatePerformanceFromHistorical(
    data: HistoricalDataPoint[],
    currentPrice: number
  ): PerformanceData {
    const now = new Date();

    // Finde Preise für verschiedene Zeitpunkte
    const findPriceAtDate = (targetDate: Date): number | null => {
      const targetStr = targetDate.toISOString().split('T')[0];

      // Suche den nächstgelegenen Datenpunkt
      for (let i = data.length - 1; i >= 0; i--) {
        if (data[i].date <= targetStr) {
          return data[i].close;
        }
      }
      return data[0]?.close || null;
    };

    // Zeitpunkte berechnen
    const date1D = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const date1W = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const date1M = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const date3M = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const dateYTD = new Date(now.getFullYear(), 0, 1); // 1. Januar
    const date1Y = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Preise finden
    const price1D = findPriceAtDate(date1D) || currentPrice;
    const price1W = findPriceAtDate(date1W) || currentPrice;
    const price1M = findPriceAtDate(date1M) || currentPrice;
    const price3M = findPriceAtDate(date3M) || currentPrice;
    const priceYTD = findPriceAtDate(dateYTD) || currentPrice;
    const price1Y = findPriceAtDate(date1Y) || currentPrice;

    // Änderungen berechnen
    const calcChange = (oldPrice: number) => currentPrice - oldPrice;
    const calcChangePercent = (oldPrice: number) =>
      oldPrice > 0 ? ((currentPrice - oldPrice) / oldPrice) * 100 : 0;

    return {
      currentPrice,

      change1D: calcChange(price1D),
      change1W: calcChange(price1W),
      change1M: calcChange(price1M),
      change3M: calcChange(price3M),
      changeYTD: calcChange(priceYTD),
      change1Y: calcChange(price1Y),

      changePercent1D: calcChangePercent(price1D),
      changePercent1W: calcChangePercent(price1W),
      changePercent1M: calcChangePercent(price1M),
      changePercent3M: calcChangePercent(price3M),
      changePercentYTD: calcChangePercent(priceYTD),
      changePercent1Y: calcChangePercent(price1Y),
    };
  }

  async checkProviderHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    const checks = await Promise.allSettled(
      this.providers.map(async (provider) => ({
        name: provider.name,
        available: await provider.isAvailable(),
      }))
    );

    for (const check of checks) {
      if (check.status === 'fulfilled') {
        health[check.value.name] = check.value.available;
      }
    }

    return health;
  }

  getRecentErrors(): ProviderError[] {
    return this.errorLog.slice(-20);
  }

  getProviderInfo(): Array<{
    name: string;
    priority: number;
    capabilities: StockDataProvider['capabilities'];
  }> {
    return this.providers.map((p) => ({
      name: p.name,
      priority: p.priority,
      capabilities: p.capabilities,
    }));
  }
}

// Singleton instance
export const stockDataService = new StockDataService();
