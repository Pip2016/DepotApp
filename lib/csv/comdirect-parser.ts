import { ParsedPosition } from './types';

function parseGermanNumber(value: string): number {
  if (!value) return 0;
  // Remove quotes, whitespace
  const cleaned = value.replace(/"/g, '').trim();
  // Remove + sign
  const withoutSign = cleaned.replace(/^\+/, '');
  // Remove % sign
  const withoutPercent = withoutSign.replace(/%$/, '');
  // German format: 1.234,56 -> 1234.56
  return parseFloat(withoutPercent.replace(/\./g, '').replace(',', '.'));
}

export function parseComdirectCsv(csvContent: string): ParsedPosition[] {
  const lines = csvContent.split('\n').filter(line => line.trim());

  if (lines.length < 2) return [];

  // Comdirect header contains "Bezeichnung" and uses semicolons with quotes
  const positions: ParsedPosition[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by semicolons and remove surrounding quotes
    const columns = line.split(';').map(col => col.replace(/^"|"$/g, '').trim());

    if (columns.length < 6) continue;

    try {
      const position: ParsedPosition = {
        name: columns[0],
        wkn: columns[1] || undefined,
        isin: columns[2],
        quantity: parseGermanNumber(columns[3]),
        currency: columns[4] || 'EUR',
        currentPrice: columns[5] ? parseGermanNumber(columns[5]) : undefined,
        currentValue: columns[6] ? parseGermanNumber(columns[6]) : undefined,
        buyPrice: columns[7] ? parseGermanNumber(columns[7]) : undefined,
        buyValue: columns[8] ? parseGermanNumber(columns[8]) : undefined,
        profitLoss: columns[9] ? parseGermanNumber(columns[9]) : undefined,
        profitLossPercent: columns[10] ? parseGermanNumber(columns[10]) : undefined,
      };

      if (position.isin && position.quantity > 0) {
        positions.push(position);
      }
    } catch (error) {
      console.error(`Error parsing comdirect line ${i}:`, error);
    }
  }

  return positions;
}

export function isComdirectFormat(header: string): boolean {
  return header.includes('"Bezeichnung"') && header.includes('"ISIN"') && header.includes('"Kaufkurs"');
}
