export interface ParsedPosition {
  name: string;
  wkn?: string;
  isin: string;
  quantity: number;
  currency: string;
  currentPrice?: number;
  currentValue?: number;
  buyPrice?: number;
  buyValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
}

export type BrokerFormat = 'comdirect' | 'postbank' | 'unknown';

export interface CsvParseResult {
  format: BrokerFormat;
  positions: ParsedPosition[];
  errors: string[];
}
