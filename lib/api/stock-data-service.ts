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

    for (const provider of this.providers) {
      if (!provider.capabilities.quote) continue;

      try {
        console.log(
          `[StockDataService] Trying ${provider.name} for quote: ${symbol}`
        );
        const data = await provider.getQuote(symbol);

        return {
          success: true,
          data,
          provider: provider.name,
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

    for (const provider of this.providers) {
      if (!provider.capabilities.fundamentals || !provider.getFundamentals)
        continue;

      try {
        console.log(
          `[StockDataService] Trying ${provider.name} for fundamentals: ${symbol}`
        );
        const data = await provider.getFundamentals(symbol);

        return {
          success: true,
          data,
          provider: provider.name,
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

    for (const provider of this.providers) {
      if (!provider.capabilities.historical || !provider.getHistorical)
        continue;

      try {
        console.log(
          `[StockDataService] Trying ${provider.name} for historical: ${symbol}`
        );
        const data = await provider.getHistorical(symbol, range);

        return {
          success: true,
          data,
          provider: provider.name,
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
