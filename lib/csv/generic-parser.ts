import {
  ParsedPosition,
  CsvParseResult,
  ColumnMapping,
  MappableField,
  COLUMN_KEYWORDS,
} from './types';

/**
 * Parse a German number format (1.234,56) to a float
 */
function parseGermanNumber(value: string): number {
  if (!value || value.trim() === '' || value === '--' || value === '-') {
    return 0;
  }
  // Remove quotes and whitespace
  let cleaned = value.replace(/["']/g, '').trim();
  // Remove thousand separators (.) and replace decimal comma with dot
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  // Remove any percentage signs
  cleaned = cleaned.replace(/%/g, '');
  // Remove any + signs
  cleaned = cleaned.replace(/^\+/, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Detect the delimiter used in the CSV (comma, semicolon, or tab)
 */
function detectDelimiter(content: string): string {
  const firstLines = content.split('\n').slice(0, 5).join('\n');

  const semicolonCount = (firstLines.match(/;/g) || []).length;
  const commaCount = (firstLines.match(/,/g) || []).length;
  const tabCount = (firstLines.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    return ';';
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    return '\t';
  }
  return ',';
}

/**
 * Parse a CSV line respecting quoted fields
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Auto-detect column mapping based on header keywords
 */
function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const usedFields = new Set<MappableField>();

  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    let bestMatch: MappableField = 'ignore';
    let bestConfidence: 'high' | 'medium' | 'low' = 'low';
    let foundHighConfidence = false;

    // Check each field's keywords
    for (const [field, keywords] of Object.entries(COLUMN_KEYWORDS)) {
      if (field === 'ignore' || foundHighConfidence) continue;

      for (const keyword of keywords) {
        if (normalizedHeader === keyword) {
          // Exact match
          if (!usedFields.has(field as MappableField)) {
            bestMatch = field as MappableField;
            bestConfidence = 'high';
            foundHighConfidence = true;
            break;
          }
        } else if (normalizedHeader.includes(keyword) && !foundHighConfidence) {
          // Partial match
          if (!usedFields.has(field as MappableField) && bestConfidence === 'low') {
            bestMatch = field as MappableField;
            bestConfidence = 'medium';
          }
        }
      }
    }

    if (bestMatch !== 'ignore') {
      usedFields.add(bestMatch);
    }

    mapping[index] = {
      header,
      mappedTo: bestMatch,
      confidence: bestConfidence,
    };
  });

  return mapping;
}

/**
 * Apply column mapping to parse a data row into a ParsedPosition
 */
function applyMapping(row: string[], mapping: ColumnMapping): ParsedPosition | null {
  const position: Partial<ParsedPosition> = {
    currency: 'EUR', // Default
  };

  for (const [indexStr, config] of Object.entries(mapping)) {
    const index = parseInt(indexStr, 10);
    const value = row[index];

    if (!value || value.trim() === '' || config.mappedTo === 'ignore') {
      continue;
    }

    switch (config.mappedTo) {
      case 'name':
        position.name = value.replace(/["']/g, '').trim();
        break;
      case 'wkn':
        position.wkn = value.replace(/["']/g, '').trim();
        break;
      case 'isin':
        position.isin = value.replace(/["']/g, '').trim();
        break;
      case 'quantity':
        position.quantity = parseGermanNumber(value);
        break;
      case 'currency':
        position.currency = value.replace(/["']/g, '').trim().toUpperCase();
        break;
      case 'currentPrice':
        position.currentPrice = parseGermanNumber(value);
        break;
      case 'currentValue':
        position.currentValue = parseGermanNumber(value);
        break;
      case 'buyPrice':
        position.buyPrice = parseGermanNumber(value);
        break;
      case 'buyValue':
        position.buyValue = parseGermanNumber(value);
        break;
      case 'profitLoss':
        position.profitLoss = parseGermanNumber(value);
        break;
      case 'profitLossPercent':
        position.profitLossPercent = parseGermanNumber(value);
        break;
    }
  }

  // Validate required fields
  if (!position.name || position.quantity === undefined || position.quantity <= 0) {
    return null;
  }

  // Calculate missing values if possible
  if (!position.currentValue && position.currentPrice && position.quantity) {
    position.currentValue = position.currentPrice * position.quantity;
  }
  if (!position.buyValue && position.buyPrice && position.quantity) {
    position.buyValue = position.buyPrice * position.quantity;
  }

  return position as ParsedPosition;
}

/**
 * Main function: Parse CSV content dynamically
 */
export function parseGenericCsv(content: string): CsvParseResult {
  const errors: string[] = [];

  // Clean content - remove BOM and normalize line endings
  const cleanContent = content
    .replace(/^\uFEFF/, '') // Remove BOM
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  // Detect delimiter
  const delimiter = detectDelimiter(cleanContent);

  // Split into lines and filter empty ones
  const lines = cleanContent.split('\n').filter(line => line.trim() !== '');

  if (lines.length < 2) {
    errors.push('Die CSV-Datei enthält nicht genügend Daten (mindestens Header + 1 Zeile benötigt).');
    return { format: 'unknown', positions: [], errors };
  }

  // Parse header row
  const rawHeaders = parseCSVLine(lines[0], delimiter);

  // Detect column mapping
  const columnMapping = detectColumnMapping(rawHeaders);

  // Check if we found required fields
  const mappedFields = Object.values(columnMapping).map(c => c.mappedTo);
  const hasName = mappedFields.includes('name');
  const hasQuantity = mappedFields.includes('quantity');

  if (!hasName) {
    errors.push('Spalte für "Bezeichnung/Name" konnte nicht erkannt werden.');
  }
  if (!hasQuantity) {
    errors.push('Spalte für "Anzahl/Stück" konnte nicht erkannt werden.');
  }

  // Parse data rows
  const rawData: string[][] = [];
  const positions: ParsedPosition[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i], delimiter);
    rawData.push(row);

    if (hasName && hasQuantity) {
      const position = applyMapping(row, columnMapping);
      if (position) {
        positions.push(position);
      }
    }
  }

  return {
    format: 'generic',
    positions,
    errors,
    columnMapping,
    rawHeaders,
    rawData,
  };
}

/**
 * Re-parse with updated column mapping (after user adjustments)
 */
export function reparseWithMapping(
  rawHeaders: string[],
  rawData: string[][],
  columnMapping: ColumnMapping
): ParsedPosition[] {
  const positions: ParsedPosition[] = [];

  for (const row of rawData) {
    const position = applyMapping(row, columnMapping);
    if (position) {
      positions.push(position);
    }
  }

  return positions;
}

/**
 * Get human-readable field names (German)
 */
export const FIELD_LABELS: Record<MappableField, string> = {
  name: 'Bezeichnung',
  wkn: 'WKN',
  isin: 'ISIN',
  quantity: 'Anzahl',
  currency: 'Währung',
  currentPrice: 'Aktueller Kurs',
  currentValue: 'Aktueller Wert',
  buyPrice: 'Kaufkurs',
  buyValue: 'Kaufwert',
  profitLoss: 'Gewinn/Verlust',
  profitLossPercent: 'Gewinn/Verlust %',
  ignore: 'Ignorieren',
};
