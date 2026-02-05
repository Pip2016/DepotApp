import { NextRequest, NextResponse } from 'next/server';
import { getCompanyNews } from '@/lib/api/finnhub';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Finnhub API key not configured' }, { status: 500 });
  }

  const news = await getCompanyNews(symbol, apiKey);
  return NextResponse.json(news);
}
