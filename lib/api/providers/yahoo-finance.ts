import {
  StockDataProvider,
  StockQuote,
  FundamentalData,
  HistoricalDataPoint,
} from './types';

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
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      throw new Error('No data returned from Yahoo Finance');
    }

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];

    return {
      symbol: meta.symbol,
      name: meta.shortName || meta.longName || meta.symbol,
      price: meta.regularMarketPrice,
      change: meta.regularMarketPrice - meta.previousClose,
      changePercent:
        ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) *
        100,
      previousClose: meta.previousClose,
      open: quote?.open?.[0] || meta.regularMarketPrice,
      dayHigh: meta.regularMarketDayHigh,
      dayLow: meta.regularMarketDayLow,
      volume: meta.regularMarketVolume,
      currency: meta.currency,
      timestamp: Date.now(),
      provider: this.name,
    };
  }

  async getFundamentals(symbol: string): Promise<FundamentalData> {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail,defaultKeyStatistics,financialData`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.quoteSummary?.result?.[0];

    if (!result) {
      throw new Error('No fundamentals data from Yahoo Finance');
    }

    const summary = result.summaryDetail || {};
    const keyStats = result.defaultKeyStatistics || {};

    return {
      symbol,
      marketCap: summary.marketCap?.raw,
      peRatio: summary.trailingPE?.raw,
      forwardPE: summary.forwardPE?.raw,
      dividendYield: summary.dividendYield?.raw,
      fiftyTwoWeekHigh: summary.fiftyTwoWeekHigh?.raw ?? 0,
      fiftyTwoWeekLow: summary.fiftyTwoWeekLow?.raw ?? 0,
      averageVolume: summary.averageVolume?.raw,
      beta: keyStats.beta?.raw,
      eps: keyStats.trailingEps?.raw,
      provider: this.name,
    };
  }

  async getHistorical(
    symbol: string,
    range: string
  ): Promise<HistoricalDataPoint[]> {
    const intervalMap: Record<string, string> = {
      '1d': '5m',
      '5d': '15m',
      '1mo': '1d',
      '3mo': '1d',
      '1y': '1wk',
      '5y': '1mo',
      max: '1mo',
    };
    const interval = intervalMap[range] || '1d';

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      throw new Error('No historical data from Yahoo Finance');
    }

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};

    return timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quotes.open?.[i] || 0,
      high: quotes.high?.[i] || 0,
      low: quotes.low?.[i] || 0,
      close: quotes.close?.[i] || 0,
      volume: quotes.volume?.[i] || 0,
    }));
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(
        'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d',
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
