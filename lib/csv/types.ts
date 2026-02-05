export interface ParsedPosition {
  name: string;
  wkn?: string;
  isin?: string;
  quantity: number;
  currency: string;
  currentPrice?: number;
  currentValue?: number;
  buyPrice?: number;
  buyValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
}

export type BrokerFormat = 'comdirect' | 'postbank' | 'generic' | 'unknown';

export interface CsvParseResult {
  format: BrokerFormat;
  positions: ParsedPosition[];
  errors: string[];
  columnMapping?: ColumnMapping;
  rawHeaders?: string[];
  rawData?: string[][];
}

// Column mapping types
export type MappableField =
  | 'name'
  | 'wkn'
  | 'isin'
  | 'quantity'
  | 'currency'
  | 'currentPrice'
  | 'currentValue'
  | 'buyPrice'
  | 'buyValue'
  | 'profitLoss'
  | 'profitLossPercent'
  | 'ignore';

export interface ColumnMapping {
  [columnIndex: number]: {
    header: string;
    mappedTo: MappableField;
    confidence: 'high' | 'medium' | 'low';
  };
}

export interface DetectedFormat {
  delimiter: string;
  hasHeader: boolean;
  encoding: string;
}

// Keywords for auto-detecting column mappings (German & English)
export const COLUMN_KEYWORDS: Record<MappableField, string[]> = {
  name: ['bezeichnung', 'name', 'wertpapier', 'titel', 'security', 'description'],
  wkn: ['wkn'],
  isin: ['isin'],
  quantity: ['stück', 'stueck', 'anzahl', 'nominale', 'quantity', 'shares', 'bestand', 'menge'],
  currency: ['währung', 'waehrung', 'currency', 'curr'],
  currentPrice: ['kurs', 'aktueller kurs', 'price', 'current price', 'preis'],
  currentValue: ['wert', 'wert in eur', 'value', 'current value', 'marktwert', 'depotwert'],
  buyPrice: ['kaufkurs', 'einstandskurs', 'buy price', 'purchase price', 'anschaffungskurs'],
  buyValue: ['kaufwert', 'anschaffungskosten', 'anschaffungswert', 'buy value', 'purchase value', 'einstandswert'],
  profitLoss: ['gewinn', 'verlust', 'g/v', 'profit', 'loss', 'differenz seit kauf absolut', 'performance'],
  profitLossPercent: ['gewinn/verlust', 'g/v %', 'differenz seit kauf relativ', 'performance %', 'rendite'],
  ignore: [],
};
