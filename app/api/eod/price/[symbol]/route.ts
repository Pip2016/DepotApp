import { NextResponse } from 'next/server';
import { eodDataService } from '@/lib/services/eod-data-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const latest = await eodDataService.getLatestPrice(symbol);

  if (!latest) {
    return NextResponse.json({ error: 'Keine Daten' }, { status: 404 });
  }

  return NextResponse.json(latest);
}
