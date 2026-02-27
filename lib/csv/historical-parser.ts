export interface EODDataPoint {
  date: string; // YYYY-MM-DD
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  adjustedClose: number | null;
  volume: number | null;
}

/**
 * Parst Yahoo Finance CSV
 * Format: Date,Open,High,Low,Close,Adj Close,Volume
 */
export function parseYahooCSV(csv: string): EODDataPoint[] {
  const lines = csv.trim().split('\n');
  const results: EODDataPoint[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [date, open, high, low, close, adjClose, volume] = line.split(',');

    // Skip ungültige Zeilen
    if (!date || !close || close === 'null') continue;

    results.push({
      date,
      open: open && open !== 'null' ? parseFloat(open) : null,
      high: high && high !== 'null' ? parseFloat(high) : null,
      low: low && low !== 'null' ? parseFloat(low) : null,
      close: parseFloat(close),
      adjustedClose: adjClose && adjClose !== 'null' ? parseFloat(adjClose) : null,
      volume: volume && volume !== 'null' ? parseInt(volume) : null,
    });
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Parst Stooq CSV
 * Format: Date,Open,High,Low,Close,Volume
 */
export function parseStooqCSV(csv: string): EODDataPoint[] {
  const lines = csv.trim().split('\n');
  const results: EODDataPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [date, open, high, low, close, volume] = line.split(',');
    if (!date || !close) continue;

    // Stooq Datum: YYYYMMDD → YYYY-MM-DD
    let formattedDate = date;
    if (date.length === 8 && !date.includes('-')) {
      formattedDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    }

    results.push({
      date: formattedDate,
      open: open ? parseFloat(open) : null,
      high: high ? parseFloat(high) : null,
      low: low ? parseFloat(low) : null,
      close: parseFloat(close),
      adjustedClose: null,
      volume: volume ? parseInt(volume) : null,
    });
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Auto-Detect und Parse
 */
export function parseCSV(csv: string): {
  data: EODDataPoint[];
  source: 'yahoo' | 'stooq';
} {
  const firstLine = csv.split('\n')[0].toLowerCase();

  if (firstLine.includes('adj close')) {
    return { data: parseYahooCSV(csv), source: 'yahoo' };
  }
  return { data: parseStooqCSV(csv), source: 'stooq' };
}

/**
 * Download URLs
 */
export function getYahooURL(symbol: string): string {
  const now = Math.floor(Date.now() / 1000);
  return `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=0&period2=${now}&interval=1d&events=history`;
}

export function getStooqURL(symbol: string): string {
  return `https://stooq.com/q/d/l/?s=${symbol.toLowerCase()}&i=d`;
}
