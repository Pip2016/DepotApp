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
    // Return empty fundamentals instead of error - allows UI to show partial data
    console.warn(`[Fundamentals] No data available for ${symbol}:`, result.errors);
    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      marketCap: undefined,
      peRatio: undefined,
      forwardPE: undefined,
      dividendYield: undefined,
      fiftyTwoWeekHigh: 0,
      fiftyTwoWeekLow: 0,
      averageVolume: undefined,
      beta: undefined,
      eps: undefined,
      provider: 'none',
      _meta: {
        provider: 'unavailable',
        fetchedAt: new Date().toISOString(),
        errors: result.errors,
      },
    });
  }

  return NextResponse.json({
    ...result.data,
    _meta: {
      provider: result.provider,
      fetchedAt: new Date().toISOString(),
    },
  });
}
