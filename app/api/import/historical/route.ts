import { NextResponse } from 'next/server';
import { historicalDataService } from '@/lib/services/historical-data-service';
import { stockMetadataService } from '@/lib/services/stock-metadata-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, csvContent, source, name } = body;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    const upperSymbol = symbol.toUpperCase();

    // Ensure metadata exists
    await stockMetadataService.ensureMetadataExists(upperSymbol, {
      name: name || upperSymbol,
    });

    let result;

    if (csvContent) {
      // Manueller CSV Upload
      result = await historicalDataService.importFromCSV(
        upperSymbol,
        csvContent,
        source || 'manual'
      );
    } else {
      // Auto-Import
      result = await historicalDataService.smartImport(upperSymbol);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Import] Error:', error);
    return NextResponse.json(
      {
        error: 'Import failed',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
