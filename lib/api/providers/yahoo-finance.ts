import {
  StockDataProvider,
  StockQuote,
  FundamentalData,
  HistoricalDataPoint,
} from './types';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export class YahooFinanceProvider implements StockDataProvider {
  name = 'Yahoo Finance';
  priority = 1;

  capabilities = {
    quote: true,
    fundamentals: true,
    historical: true,
    news: false,
  };

  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      const quote = await yahooFinance.quote(symbol);

      if (!quote || !quote.regularMarketPrice) {
        throw new Error(`Symbol ${symbol} not found on Yahoo Finance`);
      }

      return {
        symbol: quote.symbol,
        name: quote.shortName || quote.longName || quote.symbol,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        previousClose: quote.regularMarketPreviousClose || 0,
        open: quote.regularMarketOpen || quote.regularMarketPrice,
        dayHigh: quote.regularMarketDayHigh || 0,
        dayLow: quote.regularMarketDayLow || 0,
        volume: quote.regularMarketVolume || 0,
        currency: quote.currency || 'USD',
        timestamp: Date.now(),
        provider: this.name,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Yahoo Finance error for ${symbol}: ${message}`);
    }
  }

  async getFundamentals(symbol: string): Promise<FundamentalData> {
    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ['summaryDetail', 'defaultKeyStatistics'],
      });

      const summary = result.summaryDetail;
      const keyStats = result.defaultKeyStatistics;

      if (!summary && !keyStats) {
        throw new Error(`No fundamentals for ${symbol} on Yahoo Finance`);
      }

      return {
        symbol,
        marketCap: summary?.marketCap,
        peRatio: summary?.trailingPE,
        forwardPE: summary?.forwardPE,
        dividendYield: summary?.dividendYield,
        fiftyTwoWeekHigh: summary?.fiftyTwoWeekHigh ?? 0,
        fiftyTwoWeekLow: summary?.fiftyTwoWeekLow ?? 0,
        averageVolume: summary?.averageVolume,
        beta: keyStats?.beta,
        eps: keyStats?.trailingEps,
        provider: this.name,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Yahoo Finance fundamentals error for ${symbol}: ${message}`);
    }
  }

  async getHistorical(
    symbol: string,
    range: string
  ): Promise<HistoricalDataPoint[]> {
    try {
      // Map range to period and interval
      const rangeConfig: Record<string, { period1: Date; interval: '1d' | '1wk' | '1mo' | '5m' | '15m' }> = {
        '1d': { period1: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), interval: '5m' },
        '5d': { period1: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), interval: '15m' },
        '1mo': { period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), interval: '1d' },
        '3mo': { period1: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), interval: '1d' },
        '1y': { period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), interval: '1wk' },
        '5y': { period1: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000), interval: '1mo' },
        'max': { period1: new Date('1970-01-01'), interval: '1mo' },
      };

      const config = rangeConfig[range] || rangeConfig['1mo'];

      const result = await yahooFinance.chart(symbol, {
        period1: config.period1,
        interval: config.interval,
      });

      if (!result || !result.quotes || result.quotes.length === 0) {
        throw new Error(`No historical data for ${symbol} on Yahoo Finance`);
      }

      return result.quotes
        .filter(q => q.close !== null && q.close !== undefined)
        .map(q => ({
          date: q.date instanceof Date
            ? q.date.toISOString().split('T')[0]
            : new Date(q.date as number * 1000).toISOString().split('T')[0],
          open: q.open || 0,
          high: q.high || 0,
          low: q.low || 0,
          close: q.close || 0,
          volume: q.volume || 0,
        }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Yahoo Finance historical error for ${symbol}: ${message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const quote = await yahooFinance.quote('AAPL');
      return !!quote?.regularMarketPrice;
    } catch {
      return false;
    }
  }
}
