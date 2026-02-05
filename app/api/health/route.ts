import { NextResponse } from 'next/server';
import { stockDataService } from '@/lib/api/stock-data-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health = await stockDataService.checkProviderHealth();
  const recentErrors = stockDataService.getRecentErrors();
  const providerInfo = stockDataService.getProviderInfo();

  const anyHealthy = Object.values(health).some((v) => v === true);
  const allHealthy = Object.values(health).every((v) => v === true);

  let status: 'operational' | 'degraded' | 'down';
  if (allHealthy) {
    status = 'operational';
  } else if (anyHealthy) {
    status = 'degraded';
  } else {
    status = 'down';
  }

  return NextResponse.json({
    status,
    providers: Object.entries(health).map(([name, available]) => ({
      name,
      available,
      priority: providerInfo.find((p) => p.name === name)?.priority,
      capabilities: providerInfo.find((p) => p.name === name)?.capabilities,
    })),
    recentErrors: recentErrors.slice(-5),
    timestamp: new Date().toISOString(),
  });
}
