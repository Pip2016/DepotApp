import { YahooChartResponse, YahooQuoteSummaryResponse } from './types';
import { StockQuote, FundamentalData, HistoricalData } from '@/types/stock';

const BASE_URL = 'https://query1.finance.yahoo.com';

export async function getStockChart(
  symbol: string,
  interval: string = '1d',
  range: string = '1mo'
): Promise<{ quote: StockQuote | null; history: HistoricalData[] }> {
  try {
    const response = await fetch(
      `${BASE_URL}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data: YahooChartResponse = await response.json();

    if (data.chart.error) {
      throw new Error(data.chart.error.description);
    }

    const result = data.chart.result[0];
    if (!result) return { quote: null, history: [] };

    const meta = result.meta;
    const quotes = result.indicators.quote[0];
    const timestamps = result.timestamp || [];

    const history: HistoricalData[] = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quotes.open[i] ?? 0,
      high: quotes.high[i] ?? 0,
      low: quotes.low[i] ?? 0,
      close: quotes.close[i] ?? 0,
      volume: quotes.volume[i] ?? 0,
    })).filter(d => d.close > 0);

    const lastClose = history.length > 0 ? history[history.length - 1].close : meta.regularMarketPrice;
    const change = lastClose - meta.previousClose;
    const changePercent = (change / meta.previousClose) * 100;

    const quote: StockQuote = {
      symbol: meta.symbol,
      name: meta.shortName || meta.longName || meta.symbol,
      price: meta.regularMarketPrice,
      change,
      changePercent,
      previousClose: meta.previousClose,
      open: history.length > 0 ? history[history.length - 1].open : 0,
      dayHigh: history.length > 0 ? history[history.length - 1].high : 0,
      dayLow: history.length > 0 ? history[history.length - 1].low : 0,
      volume: history.length > 0 ? history[history.length - 1].volume : 0,
      currency: meta.currency,
    };

    return { quote, history };
  } catch (error) {
    console.error(`Error fetching stock chart for ${symbol}:`, error);
    return { quote: null, history: [] };
  }
}

export async function getFundamentals(symbol: string): Promise<FundamentalData | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail,defaultKeyStatistics,financialData`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data: YahooQuoteSummaryResponse = await response.json();

    if (data.quoteSummary.error) {
      throw new Error(data.quoteSummary.error.description);
    }

    const result = data.quoteSummary.result[0];
    if (!result) return null;

    const summary = result.summaryDetail;
    const keyStats = result.defaultKeyStatistics;

    return {
      symbol,
      peRatio: summary?.trailingPE?.raw,
      forwardPE: summary?.forwardPE?.raw,
      dividendYield: summary?.dividendYield?.raw,
      dividendRate: summary?.dividendRate?.raw,
      beta: summary?.beta?.raw ?? keyStats?.beta?.raw,
      fiftyTwoWeekHigh: summary?.fiftyTwoWeekHigh?.raw ?? 0,
      fiftyTwoWeekLow: summary?.fiftyTwoWeekLow?.raw ?? 0,
      marketCap: summary?.marketCap?.raw ?? 0,
      averageVolume: summary?.averageVolume?.raw ?? 0,
      eps: keyStats?.trailingEps?.raw,
      priceToBook: summary?.priceToBook?.raw ?? keyStats?.priceToBook?.raw,
    };
  } catch (error) {
    console.error(`Error fetching fundamentals for ${symbol}:`, error);
    return null;
  }
}

export async function searchStock(query: string): Promise<Array<{ symbol: string; name: string; exchange: string }>> {
  try {
    const response = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`,
      { next: { revalidate: 60 } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.quotes || []).map((q: { symbol: string; shortname?: string; longname?: string; exchange?: string }) => ({
      symbol: q.symbol,
      name: q.shortname || q.longname || q.symbol,
      exchange: q.exchange || '',
    }));
  } catch {
    return [];
  }
}
