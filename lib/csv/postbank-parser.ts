import { ParsedPosition } from './types';

function parseGermanNumber(value: string): number {
  if (!value) return 0;
  const cleaned = value.trim();
  // German format: 1.234,56 -> 1234.56
  return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
}

export function parsePostbankCsv(csvContent: string): ParsedPosition[] {
  const lines = csvContent.split('\n').filter(line => line.trim());

  if (lines.length < 2) return [];

  const positions: ParsedPosition[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(';').map(col => col.trim());

    if (columns.length < 6) continue;

    try {
      const position: ParsedPosition = {
        name: columns[0],
        wkn: columns[1] || undefined,
        isin: columns[2],
        quantity: parseGermanNumber(columns[3]),
        currency: columns[4] || 'EUR',
        buyPrice: columns[5] ? parseGermanNumber(columns[5]) : undefined,
        buyValue: columns[6] ? parseGermanNumber(columns[6]) : undefined,
        currentPrice: columns[7] ? parseGermanNumber(columns[7]) : undefined,
        currentValue: columns[8] ? parseGermanNumber(columns[8]) : undefined,
        profitLoss: columns[9] ? parseGermanNumber(columns[9]) : undefined,
        profitLossPercent: columns[10] ? parseGermanNumber(columns[10]) : undefined,
      };

      if (position.isin && position.quantity > 0) {
        positions.push(position);
      }
    } catch (error) {
      console.error(`Error parsing postbank line ${i}:`, error);
    }
  }

  return positions;
}

export function isPostbankFormat(header: string): boolean {
  return header.includes('Wertpapierbezeichnung') && header.includes('ISIN') && !header.includes('"Bezeichnung"');
}
