import {
  StockDataProvider,
  StockQuote,
  FundamentalData,
  HistoricalDataPoint,
} from './types';

export class AlphaVantageProvider implements StockDataProvider {
  name = 'Alpha Vantage';
  priority = 3;

  private apiKey: string;

  capabilities = {
    quote: true,
    fundamentals: true,
    historical: true,
    news: false,
  };

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    if (!this.apiKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${this.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.Note) {
      throw new Error('Alpha Vantage rate limit reached');
    }

    if (data['Error Message']) {
      throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
    }

    const quote = data['Global Quote'];

    if (!quote || Object.keys(quote).length === 0) {
      throw new Error(`Symbol ${symbol} not found on Alpha Vantage`);
    }

    const price = parseFloat(quote['05. price']);

    return {
      symbol: quote['01. symbol'],
      name: quote['01. symbol'],
      price,
      change: parseFloat(quote['09. change']) || 0,
      changePercent:
        parseFloat(quote['10. change percent']?.replace('%', '')) || 0,
      previousClose: parseFloat(quote['08. previous close']) || 0,
      open: parseFloat(quote['02. open']) || 0,
      dayHigh: parseFloat(quote['03. high']) || 0,
      dayLow: parseFloat(quote['04. low']) || 0,
      volume: parseInt(quote['06. volume']) || 0,
      currency: 'USD',
      timestamp: Date.now(),
      provider: this.name,
    };
  }

  async getFundamentals(symbol: string): Promise<FundamentalData> {
    if (!this.apiKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${this.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.Note) {
      throw new Error('Alpha Vantage rate limit reached');
    }

    if (!data.Symbol) {
      throw new Error(`No fundamentals for ${symbol} on Alpha Vantage`);
    }

    return {
      symbol: data.Symbol,
      marketCap: parseInt(data.MarketCapitalization) || undefined,
      peRatio: parseFloat(data.PERatio) || undefined,
      forwardPE: parseFloat(data.ForwardPE) || undefined,
      dividendYield: parseFloat(data.DividendYield) || undefined,
      fiftyTwoWeekHigh: parseFloat(data['52WeekHigh']) || 0,
      fiftyTwoWeekLow: parseFloat(data['52WeekLow']) || 0,
      beta: parseFloat(data.Beta) || undefined,
      eps: parseFloat(data.EPS) || undefined,
      provider: this.name,
    };
  }

  async getHistorical(
    symbol: string,
    range: string
  ): Promise<HistoricalDataPoint[]> {
    if (!this.apiKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    // Alpha Vantage uses different functions for different ranges
    const isIntraday = range === '1d' || range === '5d';
    const func = isIntraday ? 'TIME_SERIES_INTRADAY' : 'TIME_SERIES_DAILY';
    const interval = isIntraday ? '&interval=15min' : '';
    const outputSize = range === '1mo' || range === '3mo' ? 'compact' : 'full';

    const url = `https://www.alphavantage.co/query?function=${func}&symbol=${encodeURIComponent(symbol)}${interval}&outputsize=${outputSize}&apikey=${this.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.Note) {
      throw new Error('Alpha Vantage rate limit reached');
    }

    const timeSeriesKey = isIntraday
      ? 'Time Series (15min)'
      : 'Time Series (Daily)';
    const timeSeries = data[timeSeriesKey];

    if (!timeSeries) {
      throw new Error(`No historical data for ${symbol} on Alpha Vantage`);
    }

    // Limit data points based on range
    const limitMap: Record<string, number> = {
      '1d': 26,
      '5d': 130,
      '1mo': 22,
      '3mo': 66,
      '1y': 252,
      '5y': 1260,
      max: 5000,
    };
    const limit = limitMap[range] || 100;

    const entries = Object.entries(timeSeries).slice(0, limit);

    return entries
      .map(([date, values]) => {
        const v = values as Record<string, string>;
        return {
          date: date.split(' ')[0],
          open: parseFloat(v['1. open']),
          high: parseFloat(v['2. high']),
          low: parseFloat(v['3. low']),
          close: parseFloat(v['4. close']),
          volume: parseInt(v['5. volume']),
        };
      })
      .reverse();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${this.apiKey}`
      );
      const data = await response.json();
      return !data.Note && !data['Error Message'];
    } catch {
      return false;
    }
  }
}
