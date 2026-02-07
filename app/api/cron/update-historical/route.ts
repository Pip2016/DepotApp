import { NextResponse } from 'next/server';
import { historicalDataService } from '@/lib/services/historical-data-service';
import { createClient } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 Minuten max

export async function GET(request: Request) {
  // Vercel Cron Auth Check
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Für lokales Testen ohne Auth
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createClient();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 500 }
    );
  }

  console.log('[Cron] Starting daily historical data update...');

  const startTime = Date.now();

  try {
    // Log Cron Start
    const { data: cronRun } = await supabase
      .from('cron_job_runs')
      .insert({
        job_name: 'update-historical',
        status: 'started',
      })
      .select('id')
      .single();

    // Updates ausführen
    const results = await historicalDataService.updateAllSymbols();

    const duration = Date.now() - startTime;

    // Log Cron Complete
    if (cronRun?.id) {
      await supabase
        .from('cron_job_runs')
        .update({
          status: 'completed',
          symbols_processed: results.success,
          symbols_failed: results.failed,
          error_messages: results.results
            .filter((r) => !r.success)
            .map((r) => ({ symbol: r.symbol, error: r.error })),
          completed_at: new Date().toISOString(),
        })
        .eq('id', cronRun.id);
    }

    console.log(
      `[Cron] Completed in ${duration}ms: ${results.success} success, ${results.failed} failed`
    );

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      total: results.total,
      successCount: results.success,
      failedCount: results.failed,
      details: results.results.map((r) => ({
        symbol: r.symbol,
        success: r.success,
        imported: r.recordsImported,
        error: r.error,
      })),
    });
  } catch (error) {
    console.error('[Cron] Failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
