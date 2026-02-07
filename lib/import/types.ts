export interface ParsedHistoricalData {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  adjustedClose: number | null;
  volume: number | null;
}

export type CSVSource = 'yahoo' | 'stooq' | 'unknown';

export interface CSVParseResult {
  source: CSVSource;
  data: ParsedHistoricalData[];
  rowCount: number;
  dateRange: {
    from: string;
    to: string;
  } | null;
}

export interface ImportResult {
  success: boolean;
  symbol: string;
  recordsImported: number;
  recordsSkipped: number;
  recordsFailed: number;
  dateRange: { from: string; to: string } | null;
  error?: string;
}
