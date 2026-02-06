'use client';

import { cn } from '@/lib/utils';
import { PerformanceBadge } from './PerformanceBadge';
import type { PerformanceData } from '@/lib/api/stock-data-service';
import { Skeleton } from '@/components/ui/skeleton';

interface PerformanceOverviewProps {
  performance: PerformanceData | null;
  isLoading?: boolean;
  showBadge?: boolean;
  compact?: boolean;
}

export function PerformanceOverview({
  performance,
  isLoading = false,
  showBadge = true,
  compact = false,
}: PerformanceOverviewProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    );
  }

  if (!performance) {
    return <p className="text-sm text-muted-foreground">Keine Daten</p>;
  }

  const timeframes = compact
    ? [
        { label: '1M', value: performance.changePercent1M },
        { label: '1Y', value: performance.changePercent1Y },
      ]
    : [
        { label: '1W', value: performance.changePercent1W },
        { label: '1M', value: performance.changePercent1M },
        { label: 'YTD', value: performance.changePercentYTD },
        { label: '1Y', value: performance.changePercent1Y },
      ];

  // Für Badge: Nutze 1-Jahres Performance
  const yearlyPerformance = performance.changePercent1Y;

  return (
    <div className="space-y-2">
      {showBadge && (
        <PerformanceBadge performancePercent={yearlyPerformance} size="sm" />
      )}

      <div className="flex flex-wrap gap-3">
        {timeframes.map(({ label, value }) => {
          const isPositive = value >= 0;
          return (
            <div key={label} className="text-center">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p
                className={cn(
                  'text-sm font-semibold',
                  isPositive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {isPositive ? '+' : ''}
                {value.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
