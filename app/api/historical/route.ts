import { NextResponse } from 'next/server';
import { historicalDataService } from '@/lib/services/historical-data-service';
import { stockDataService } from '@/lib/api/stock-data-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '1y';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  // Berechne Start-Datum basierend auf Range
  const endDate = new Date();
  let startDate = new Date();

  switch (range) {
    case '1d':
      startDate.setDate(endDate.getDate() - 1);
      break;
    case '5d':
      startDate.setDate(endDate.getDate() - 5);
      break;
    case '1w':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '1m':
    case '1mo':
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case '3m':
    case '3mo':
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case 'ytd':
      startDate = new Date(endDate.getFullYear(), 0, 1);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case '5y':
      startDate.setFullYear(endDate.getFullYear() - 5);
      break;
    case 'max':
      startDate = new Date(2000, 0, 1);
      break;
    default:
      startDate.setFullYear(endDate.getFullYear() - 1);
  }

  const upperSymbol = symbol.toUpperCase();

  // 1. Versuche aus Datenbank zu laden
  let data = await historicalDataService.getHistoricalData(
    upperSymbol,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );

  // 2. Wenn keine oder zu wenig Daten, versuche Auto-Import
  if (data.length < 5) {
    console.log(
      `[Historical] Insufficient data for ${upperSymbol} (${data.length} points), attempting import...`
    );

    const importResult = await historicalDataService.smartImport(upperSymbol);

    if (importResult.success && importResult.recordsImported > 0) {
      // Nochmal laden
      data = await historicalDataService.getHistoricalData(
        upperSymbol,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
    }
  }

  // 3. Wenn immer noch keine Daten, Fallback auf API
  if (data.length === 0) {
    console.log(`[Historical] Falling back to API for ${upperSymbol}`);

    const apiResult = await stockDataService.getHistorical(
      upperSymbol,
      range as '1d' | '5d' | '1mo' | '3mo' | '1y' | '5y' | 'max'
    );

    if (apiResult.success && apiResult.data) {
      return NextResponse.json({
        data: apiResult.data,
        source: 'api',
        provider: apiResult.provider,
      });
    }

    return NextResponse.json(
      { error: 'No historical data available', symbol: upperSymbol },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data,
    source: 'database',
    recordCount: data.length,
    dateRange: {
      from: data[0]?.date,
      to: data[data.length - 1]?.date,
    },
  });
}
