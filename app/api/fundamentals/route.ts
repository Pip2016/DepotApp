import { NextRequest, NextResponse } from 'next/server';
import { getFundamentals } from '@/lib/api/yahoo-finance';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  const data = await getFundamentals(symbol);

  if (!data) {
    return NextResponse.json({ error: 'Fundamentals not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
