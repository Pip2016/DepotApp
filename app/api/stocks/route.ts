import { NextRequest, NextResponse } from 'next/server';
import { stockDataService } from '@/lib/api/stock-data-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '1mo';

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter required' },
      { status: 400 }
    );
  }

  const upperSymbol = symbol.toUpperCase();

  // Fetch quote and historical data
  const [quoteResult, historyResult] = await Promise.all([
    stockDataService.getQuote(upperSymbol),
    stockDataService.getHistorical(upperSymbol, range),
  ]);

  if (!quoteResult.success) {
    return NextResponse.json(
      {
        error: 'Kursdaten konnten nicht geladen werden',
        userMessage:
          'Die Börsendaten sind momentan nicht verfügbar. Bitte versuche es in einigen Minuten erneut.',
        details: quoteResult.errors,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    quote: quoteResult.data,
    history: historyResult.data || [],
    _meta: {
      quoteProvider: quoteResult.provider,
      historyProvider: historyResult.provider,
      fetchedAt: new Date().toISOString(),
    },
  });
}
