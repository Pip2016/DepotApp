import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { eodDataService } from '@/lib/services/eod-data-service';

export const maxDuration = 300; // 5 Minuten max

export async function GET(request: Request) {
  // Auth für Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    // Erlaube lokales Testen
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createClient();
  const startTime = Date.now();

  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  // Log starten
  const { data: logEntry } = await supabase
    .from('cron_logs')
    .insert({
      job_name: 'eod-update',
      status: 'started',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  const logId = logEntry?.id;

  console.log('[Cron] Starte tägliches EOD Update...');

  try {
    const result = await eodDataService.updateAllActiveSymbols();

    const duration = Date.now() - startTime;
    console.log(
      `[Cron] Fertig in ${duration}ms: ${result.success}/${result.total} erfolgreich`
    );

    // Log abschließen
    if (logId) {
      await supabase
        .from('cron_logs')
        .update({
          status: 'completed',
          symbols_total: result.total,
          symbols_success: result.success,
          symbols_failed: result.failed,
          details: result.details,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq('id', logId);
    }

    return NextResponse.json({
      success: true,
      ...result,
      duration: `${duration}ms`,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // Fehler loggen
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

    console.error('[Cron] Fehler:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
