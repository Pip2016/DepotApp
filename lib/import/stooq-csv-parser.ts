import { ParsedHistoricalData } from './types';

export function parseStooqCSV(csvContent: string): ParsedHistoricalData[] {
  const lines = csvContent.trim().split('\n');

  // Stooq Header: Date,Open,High,Low,Close,Volume
  const header = lines[0].toLowerCase();
  if (!header.includes('date') || !header.includes('close')) {
    throw new Error('Invalid Stooq CSV format');
  }

  const results: ParsedHistoricalData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',');
    const [date, open, high, low, close, volume] = values;

    if (!date || !close) continue;

    // Stooq Datumsformat: YYYYMMDD oder YYYY-MM-DD
    let formattedDate = date;
    if (date.length === 8 && !date.includes('-')) {
      formattedDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    }

    try {
      results.push({
        date: formattedDate,
        open: open ? parseFloat(open) : null,
        high: high ? parseFloat(high) : null,
        low: low ? parseFloat(low) : null,
        close: parseFloat(close),
        adjustedClose: null, // Stooq hat kein Adj Close
        volume: volume ? parseInt(volume) : null,
      });
    } catch {
      console.warn(`Skipping invalid row ${i}: ${line}`);
    }
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

// Stooq CSV Download URL generieren
export function getStooqDownloadURL(symbol: string): string {
  // Stooq Symbol Konvertierung
  // US Aktien: AAPL.US
  // DE Aktien: SAP.DE
  // UK Aktien: VOD.UK
  return `https://stooq.com/q/d/l/?s=${symbol.toLowerCase()}&i=d`;
}

// Symbol für Stooq formatieren
export function formatSymbolForStooq(symbol: string, market?: string): string {
  // Wenn bereits mit Markt-Suffix
  if (symbol.includes('.')) {
    return symbol.toLowerCase();
  }

  // Automatisch Suffix hinzufügen
  const upperSymbol = symbol.toUpperCase();

  // Bekannte US Symbole
  const usSymbols = [
    'AAPL',
    'MSFT',
    'GOOGL',
    'GOOG',
    'AMZN',
    'META',
    'TSLA',
    'NVDA',
    'AMD',
    'INTC',
    'NFLX',
    'DIS',
    'V',
    'MA',
    'JPM',
    'BAC',
    'WMT',
    'PG',
    'JNJ',
    'UNH',
  ];
  if (usSymbols.includes(upperSymbol) || market === 'US') {
    return `${symbol.toLowerCase()}.us`;
  }

  // Bekannte DE Symbole
  const deSymbols = [
    'SAP',
    'BMW',
    'SIE',
    'ALV',
    'BAS',
    'DTE',
    'VOW3',
    'MRK',
    'ADS',
    'DBK',
    'DPW',
    'RWE',
    'EON',
    'HEN3',
    'FRE',
    'IFX',
    'MUV2',
    'CON',
  ];
  if (deSymbols.includes(upperSymbol) || market === 'DE') {
    return `${symbol.toLowerCase()}.de`;
  }

  return symbol.toLowerCase();
}
