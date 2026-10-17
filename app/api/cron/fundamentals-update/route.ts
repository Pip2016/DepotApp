import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createYahooSession } from '@/lib/api/providers/yahoo-fundamentals';
import { isSecEnabled } from '@/lib/api/providers/sec-edgar';
import { importFundamentals } from '@/lib/services/fundamentals-import-service';

export const maxDuration = 300; // 5 Minuten max

// Jahreszahlen ändern sich selten: ein Titel wird höchstens alle 30 Tage neu geholt
const REFRESH_DAYS = 30;
const DEFAULT_BATCH = 15;
const MAX_BATCH = 40;

// Rollierender Import: je Aufruf ein Abschnitt aller aktiven Titel (?offset=N, ?batch=N),
// davon werden die ohne oder mit veralteten Fundamentals geholt. Die Antwort nennt nextOffset.
// ?symbols=KO,ALV.DE importiert gezielt diese Titel.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    // Erlaube lokales Testen
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY fehlt (Vercel → Settings → Environment Variables)' },
      { status: 500 }
    );
  }

  const params = new URL(request.url).searchParams;
  const batch = Math.min(Number(params.get('batch')) || DEFAULT_BATCH, MAX_BATCH);
  const startTime = Date.now();

  const { data: logEntry } = await supabase
    .from('cron_logs')
    .insert({ job_name: 'fundamentals-update', status: 'started', started_at: new Date().toISOString() })
    .select('id')
    .single();
  const logId = logEntry?.id;

  try {
    const { data: symbolRows, error: symbolError } = await supabase
      .from('stock_symbols')
      .select('symbol, yahoo_symbol')
      .eq('is_active', true);
    if (symbolError) throw new Error(symbolError.message);

    const yahooSymbol = new Map((symbolRows ?? []).map((r) => [r.symbol as string, (r.yahoo_symbol as string) || r.symbol]));

    let todo: string[];
    let nextOffset: number | null = null;
    if (params.get('symbols')) {
      todo = params.get('symbols')!.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else {
      // Feste Reihenfolge, je Aufruf ein Abschnitt; so blockieren dauerhaft fehlschlagende Titel nichts
      const all = [...yahooSymbol.keys()].sort();
      const offset = Math.max(Number(params.get('offset')) || 0, 0);
      const slice = all.slice(offset, offset + batch);
      nextOffset = offset + batch < all.length ? offset + batch : null;

      // Letzter eigener Import je Titel (FMP-Zeilen aus dem Seitenaufruf zählen nicht)
      const lastImport = new Map<string, number>();
      if (slice.length > 0) {
        const { data, error } = await supabase
          .from('stock_fundamentals')
          .select('symbol, updated_at')
          .in('symbol', slice)
          .neq('data_source', 'fmp');
        if (error) throw new Error(error.message);
        for (const row of data ?? []) {
          const t = Date.parse(row.updated_at as string);
          lastImport.set(row.symbol as string, Math.max(lastImport.get(row.symbol as string) ?? 0, t));
        }
      }
      const cutoff = Date.now() - REFRESH_DAYS * 86_400_000;
      todo = slice.filter((s) => (lastImport.get(s) ?? 0) < cutoff);
    }

    const session = todo.length > 0 ? await createYahooSession() : null;
    const details: Array<{ symbol: string; success: boolean; message: string }> = [];

    for (const symbol of todo) {
      try {
        const result = await importFundamentals(supabase, symbol, session!, yahooSymbol.get(symbol) ?? symbol);
        details.push({
          symbol,
          success: result.years > 0,
          message: result.years > 0 ? `${result.years} Jahre ${result.first}–${result.last} (${result.source})` : 'keine Daten',
        });
      } catch (error) {
        details.push({ symbol, success: false, message: error instanceof Error ? error.message : String(error) });
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    const success = details.filter((d) => d.success).length;
    const duration = Date.now() - startTime;
    const result = {
      total: yahooSymbol.size,
      processed: todo.length,
      success,
      failed: todo.length - success,
      nextOffset,
      secEnabled: isSecEnabled(),
      details,
      duration: `${duration}ms`,
    };

    if (logId) {
      await supabase
        .from('cron_logs')
        .update({
          status: 'completed',
          symbols_total: todo.length,
          symbols_success: success,
          symbols_failed: todo.length - success,
          details,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq('id', logId);
    }

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (logId) {
      await supabase
        .from('cron_logs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        })
        .eq('id', logId);
    }
    console.error('[Cron Fundamentals] Fehler:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
