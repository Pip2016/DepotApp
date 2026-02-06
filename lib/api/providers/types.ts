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
