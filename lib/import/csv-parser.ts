import { parseYahooCSV } from './yahoo-csv-parser';
import { parseStooqCSV } from './stooq-csv-parser';
import { CSVSource, CSVParseResult, ParsedHistoricalData } from './types';

export function detectCSVSource(csvContent: string): CSVSource {
  const firstLine = csvContent.split('\n')[0].toLowerCase();

  // Yahoo hat "Adj Close"
  if (firstLine.includes('adj close')) {
    return 'yahoo';
  }

  // Stooq hat typischerweise nur Date,Open,High,Low,Close,Volume
  if (
    firstLine.includes('date') &&
    firstLine.includes('close') &&
    !firstLine.includes('adj')
  ) {
    return 'stooq';
  }

  return 'unknown';
}

export function parseCSV(
  csvContent: string,
  forceSource?: CSVSource
): CSVParseResult {
  const source = forceSource || detectCSVSource(csvContent);

  let data: ParsedHistoricalData[];

  switch (source) {
    case 'yahoo':
      data = parseYahooCSV(csvContent);
      break;
    case 'stooq':
      data = parseStooqCSV(csvContent);
      break;
    default:
      // Versuche Yahoo als Fallback
      try {
        data = parseYahooCSV(csvContent);
      } catch {
        data = parseStooqCSV(csvContent);
      }
  }

  const dateRange =
    data.length > 0
      ? { from: data[0].date, to: data[data.length - 1].date }
      : null;

  return {
    source,
    data,
    rowCount: data.length,
    dateRange,
  };
}

// Re-export types
export type { CSVSource, CSVParseResult, ParsedHistoricalData } from './types';
