export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  currency: string;
  timestamp: number;
  provider: string;
}

export interface FundamentalData {
  symbol: string;
  marketCap?: number;
  peRatio?: number;
  forwardPE?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  averageVolume?: number;
  beta?: number;
  eps?: number;
  provider: string;
}

export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ProviderError {
  provider: string;
  error: string;
  statusCode?: number;
  timestamp: number;
}

export interface ProviderCapabilities {
  quote: boolean;
  fundamentals: boolean;
  historical: boolean;
  news: boolean;
}

export interface StockDataProvider {
  name: string;
  priority: number;
  capabilities: ProviderCapabilities;

  getQuote(symbol: string): Promise<StockQuote>;
  getFundamentals?(symbol: string): Promise<FundamentalData>;
  getHistorical?(symbol: string, range: string): Promise<HistoricalDataPoint[]>;
  isAvailable(): Promise<boolean>;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  provider?: string;
  fromCache?: boolean;
  errors: ProviderError[];
}

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
