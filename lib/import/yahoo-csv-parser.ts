import { ParsedHistoricalData } from './types';

export function parseYahooCSV(csvContent: string): ParsedHistoricalData[] {
  const lines = csvContent.trim().split('\n');

  // Header prüfen
  const header = lines[0];
  if (!header.includes('Date') || !header.includes('Close')) {
    throw new Error('Invalid Yahoo Finance CSV format');
  }

  const results: ParsedHistoricalData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',');

    // Yahoo Format: Date,Open,High,Low,Close,Adj Close,Volume
    const [date, open, high, low, close, adjClose, volume] = values;

    // Skip invalid rows (z.B. "null" values)
    if (!date || close === 'null' || !close) continue;

    try {
      results.push({
        date: date, // YYYY-MM-DD Format
        open: open && open !== 'null' ? parseFloat(open) : null,
        high: high && high !== 'null' ? parseFloat(high) : null,
        low: low && low !== 'null' ? parseFloat(low) : null,
        close: parseFloat(close),
        adjustedClose:
          adjClose && adjClose !== 'null' ? parseFloat(adjClose) : null,
        volume: volume && volume !== 'null' ? parseInt(volume) : null,
      });
    } catch {
      console.warn(`Skipping invalid row ${i}: ${line}`);
    }
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

// Yahoo Finance CSV Download URL generieren
export function getYahooDownloadURL(
  symbol: string,
  startDate?: Date,
  endDate?: Date
): string {
  const period1 = startDate ? Math.floor(startDate.getTime() / 1000) : 0;
  const period2 = endDate
    ? Math.floor(endDate.getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  return `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=${period1}&period2=${period2}&interval=1d&events=history`;
}
