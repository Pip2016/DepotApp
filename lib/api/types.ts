export interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        currency: string;
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
        exchangeName: string;
        shortName?: string;
        longName?: string;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }>;
    error: null | { code: string; description: string };
  };
}

export interface YahooQuoteSummaryResponse {
  quoteSummary: {
    result: Array<{
      summaryDetail?: {
        previousClose?: { raw: number };
        open?: { raw: number };
        dayLow?: { raw: number };
        dayHigh?: { raw: number };
        volume?: { raw: number };
        averageVolume?: { raw: number };
        marketCap?: { raw: number };
        fiftyTwoWeekLow?: { raw: number };
        fiftyTwoWeekHigh?: { raw: number };
        trailingPE?: { raw: number };
        forwardPE?: { raw: number };
        dividendYield?: { raw: number };
        dividendRate?: { raw: number };
        beta?: { raw: number };
        priceToBook?: { raw: number };
      };
      defaultKeyStatistics?: {
        trailingEps?: { raw: number };
        forwardEps?: { raw: number };
        beta?: { raw: number };
        priceToBook?: { raw: number };
      };
      financialData?: {
        currentPrice?: { raw: number };
        targetMeanPrice?: { raw: number };
      };
    }>;
    error: null | { code: string; description: string };
  };
}

export interface FinnhubNewsResponse {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}
