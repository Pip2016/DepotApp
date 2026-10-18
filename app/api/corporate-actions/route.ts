import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { buildActions } from '@/lib/portfolio/corporate-actions';

const yahooFinance = new YahooFinance();

// Kapitalmaßnahmen eines Titels nach einem Stichtag (Kaufdatum der Position)
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');
  const since = request.nextUrl.searchParams.get('since');
  if (!symbol || !since || !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    return NextResponse.json({ error: 'symbol und since (YYYY-MM-DD) erforderlich' }, { status: 400 });
  }

  try {
    const chart = await yahooFinance.chart(symbol, {
      period1: since,
      interval: '1mo',
      events: 'split',
    });
    const events = (chart.events?.splits ?? []).map((s) => ({
      date: new Date(s.date).toISOString().slice(0, 10),
      numerator: s.numerator,
      denominator: s.denominator,
    }));
    return NextResponse.json({ actions: buildActions(symbol, since, events) });
  } catch (error) {
    // Ohne Yahoo bleiben die bekannten Abspaltungen
    console.error(`corporate-actions ${symbol}:`, error);
    return NextResponse.json({ actions: buildActions(symbol, since, []), partial: true });
  }
}
