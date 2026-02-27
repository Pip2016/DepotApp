import { NextResponse } from 'next/server';
import { eodDataService } from '@/lib/services/eod-data-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();
  const { searchParams } = new URL(request.url);
  const days = searchParams.get('days');

  // Aus Datenbank laden
  let data = await eodDataService.getHistorical(
    upperSymbol,
    days ? parseInt(days) : undefined
  );

  // Falls keine Daten: Auto-Import versuchen
  if (data.length === 0) {
    console.log(`[EOD] Keine Daten für ${upperSymbol}, starte Auto-Import...`);

    const importResult = await eodDataService.downloadAndImport(upperSymbol);

    if (importResult.success) {
      data = await eodDataService.getHistorical(
        upperSymbol,
        days ? parseInt(days) : undefined
      );
    } else {
      return NextResponse.json(
        { error: 'Keine Daten verfügbar', details: importResult.error },
        { status: 404 }
      );
    }
  }

  return NextResponse.json({
    symbol: upperSymbol,
    count: data.length,
    data,
  });
}
