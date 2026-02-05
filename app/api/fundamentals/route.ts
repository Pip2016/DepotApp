import { NextRequest, NextResponse } from 'next/server';
import { stockDataService } from '@/lib/api/stock-data-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter required' },
      { status: 400 }
    );
  }

  const result = await stockDataService.getFundamentals(symbol.toUpperCase());

  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Fundamentaldaten konnten nicht geladen werden',
        userMessage:
          'Die Unternehmensdaten sind momentan nicht verfügbar. Bitte versuche es später erneut.',
        details: result.errors,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ...result.data,
    _meta: {
      provider: result.provider,
      fetchedAt: new Date().toISOString(),
    },
  });
}
