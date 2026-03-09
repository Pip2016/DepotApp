import { NextResponse } from 'next/server';
import { eodDataService } from '@/lib/services/eod-data-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, csv, autoDownload } = body;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol fehlt' }, { status: 400 });
    }

    let result;

    if (csv) {
      // Manueller CSV Import
      result = await eodDataService.importCSV(symbol, csv);
    } else if (autoDownload) {
      // Auto-Download von Yahoo/Stooq
      result = await eodDataService.downloadAndImport(symbol);
    } else {
      return NextResponse.json(
        { error: 'CSV oder autoDownload angeben' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        imported: 0,
        error: error instanceof Error ? error.message : 'Import fehlgeschlagen',
      },
      { status: 500 }
    );
  }
}
