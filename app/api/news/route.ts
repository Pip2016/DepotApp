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
    // Return empty array instead of error - news is optional
    console.warn('[News] Finnhub API key not configured');
    return NextResponse.json([]);
  }

  // Try with original symbol first
  let news = await getCompanyNews(symbol, apiKey);

  // If no news and symbol has exchange suffix (e.g., ALV.DE), try base symbol
  if (news.length === 0 && symbol.includes('.')) {
    const baseSymbol = symbol.split('.')[0];
    news = await getCompanyNews(baseSymbol, apiKey);
  }

  return NextResponse.json(news);
}
