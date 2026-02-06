import { NextResponse } from 'next/server';
import { stockDataService } from '@/lib/api/stock-data-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter required' },
      { status: 400 }
    );
  }

  const result = await stockDataService.getPerformanceData(symbol.toUpperCase());

  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Performance-Daten konnten nicht geladen werden',
        userMessage: 'Die historischen Daten sind momentan nicht verfügbar.',
        details: result.errors,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ...result.data,
    _meta: {
      provider: result.provider,
      fromCache: result.fromCache,
      fetchedAt: new Date().toISOString(),
    },
  });
}
