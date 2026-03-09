import { NextResponse } from 'next/server';
import { eodDataService } from '@/lib/services/eod-data-service';

export const maxDuration = 300; // 5 Minuten max

export async function GET(request: Request) {
  // Auth für Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Erlaube lokales Testen
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  console.log('[Cron] Starte tägliches EOD Update...');
  const start = Date.now();

  const result = await eodDataService.updateAllActiveSymbols();

  const duration = Date.now() - start;
  console.log(
    `[Cron] Fertig in ${duration}ms: ${result.success}/${result.total} erfolgreich`
  );

  return NextResponse.json({
    ...result,
    duration: `${duration}ms`,
  });
}
