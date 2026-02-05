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
  marketCap?: number;
  currency: string;
}

export interface FundamentalData {
  symbol: string;
  peRatio?: number;
  forwardPE?: number;
  dividendYield?: number;
  dividendRate?: number;
  beta?: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap: number;
  averageVolume: number;
  eps?: number;
  priceToBook?: number;
}

export interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
