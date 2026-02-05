import { NextRequest, NextResponse } from 'next/server';
import { getStockChart, searchStock } from '@/lib/api/yahoo-finance';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const query = searchParams.get('q');
  const interval = searchParams.get('interval') || '1d';
  const range = searchParams.get('range') || '1mo';

  if (query) {
    const results = await searchStock(query);
    return NextResponse.json(results);
  }

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  const data = await getStockChart(symbol, interval, range);

  if (!data.quote) {
    return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
