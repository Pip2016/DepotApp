import { StockDataProvider, StockQuote, FundamentalData } from './types';

export class FinnhubProvider implements StockDataProvider {
  name = 'Finnhub';
  priority = 2;

  private apiKey: string;

  capabilities = {
    quote: true,
    fundamentals: true,
    historical: false,
    news: true,
  };

  constructor() {
    this.apiKey = process.env.FINNHUB_API_KEY || '';
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    if (!this.apiKey) {
      throw new Error('Finnhub API key not configured');
    }

    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${this.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Finnhub error: ${data.error}`);
    }

    // Finnhub returns c=0 when symbol not found
    if (data.c === 0 && data.h === 0 && data.l === 0) {
      throw new Error(`Symbol ${symbol} not found on Finnhub`);
    }

    return {
      symbol,
      name: symbol,
      price: data.c,
      change: data.d || 0,
      changePercent: data.dp || 0,
      previousClose: data.pc,
      open: data.o,
      dayHigh: data.h,
      dayLow: data.l,
      volume: 0,
      currency: 'USD',
      timestamp: Date.now(),
      provider: this.name,
    };
  }

  async getFundamentals(symbol: string): Promise<FundamentalData> {
    if (!this.apiKey) {
      throw new Error('Finnhub API key not configured');
    }

    const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${this.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const data = await response.json();
    const metrics = data.metric || {};

    if (Object.keys(metrics).length === 0) {
      throw new Error(`No fundamentals for ${symbol} on Finnhub`);
    }

    return {
      symbol,
      marketCap: metrics.marketCapitalization
        ? metrics.marketCapitalization * 1_000_000
        : undefined,
      peRatio: metrics.peBasicExclExtraTTM,
      dividendYield: metrics.dividendYieldIndicatedAnnual,
      fiftyTwoWeekHigh: metrics['52WeekHigh'] ?? 0,
      fiftyTwoWeekLow: metrics['52WeekLow'] ?? 0,
      averageVolume: metrics['10DayAverageTradingVolume']
        ? metrics['10DayAverageTradingVolume'] * 1_000_000
        : undefined,
      beta: metrics.beta,
      eps: metrics.epsBasicExclExtraItemsTTM,
      provider: this.name,
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${this.apiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
