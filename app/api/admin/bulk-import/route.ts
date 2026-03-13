import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { eodDataService } from '@/lib/services/eod-data-service';

export const maxDuration = 300; // 5 Minuten

export async function POST(request: Request) {
  const supabase = await createClient();

  // Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { symbols } = await request.json();

  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    return NextResponse.json(
      { error: 'Symbols array required' },
      { status: 400 }
    );
  }

  // Max 20 Symbole pro Request
  if (symbols.length > 20) {
    return NextResponse.json(
      { error: 'Max 20 symbols per request' },
      { status: 400 }
    );
  }

  const results: Array<{
    symbol: string;
    success: boolean;
    imported?: number;
    error?: string;
  }> = [];

  for (const symbol of symbols) {
    // 2 Sekunden Pause zwischen Requests
    await new Promise((r) => setTimeout(r, 2000));

    try {
      const result = await eodDataService.downloadAndImport(
        symbol.toUpperCase()
      );
      results.push({
        symbol: symbol.toUpperCase(),
        success: result.success,
        imported: result.imported,
        error: result.error,
      });
    } catch (error) {
      results.push({
        symbol: symbol.toUpperCase(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const success = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    total: symbols.length,
    success,
    failed,
    results,
  });
}
