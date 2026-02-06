'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PerformanceBadge } from './PerformanceBadge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { PerformanceData } from '@/lib/api/stock-data-service';

interface PerformanceTimeframesProps {
  performance: PerformanceData;
  showBadge?: boolean;
  layout?: 'horizontal' | 'vertical' | 'grid';
  defaultTimeframe?: Timeframe;
}

type Timeframe = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y';

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: '1D', label: 'Heute' },
  { key: '1W', label: '1 Woche' },
  { key: '1M', label: '1 Monat' },
  { key: '3M', label: '3 Monate' },
  { key: 'YTD', label: 'YTD' },
  { key: '1Y', label: '1 Jahr' },
];

function getPerformanceForTimeframe(
  performance: PerformanceData,
  timeframe: Timeframe
) {
  switch (timeframe) {
    case '1D':
      return {
        change: performance.change1D,
        percent: performance.changePercent1D,
      };
    case '1W':
      return {
        change: performance.change1W,
        percent: performance.changePercent1W,
      };
    case '1M':
      return {
        change: performance.change1M,
        percent: performance.changePercent1M,
      };
    case '3M':
      return {
        change: performance.change3M,
        percent: performance.changePercent3M,
      };
    case 'YTD':
      return {
        change: performance.changeYTD,
        percent: performance.changePercentYTD,
      };
    case '1Y':
      return {
        change: performance.change1Y,
        percent: performance.changePercent1Y,
      };
  }
}

export function PerformanceTimeframes({
  performance,
  showBadge = true,
  layout = 'horizontal',
  defaultTimeframe = '1M',
}: PerformanceTimeframesProps) {
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<Timeframe>(defaultTimeframe);

  const selectedPerf = getPerformanceForTimeframe(performance, selectedTimeframe);
  const isPositive = selectedPerf.percent >= 0;

  return (
    <div className="space-y-3">
      {/* Timeframe Selector */}
      <div
        className={cn(
          'flex gap-1',
          layout === 'horizontal' && 'flex-wrap',
          layout === 'vertical' && 'flex-col',
          layout === 'grid' && 'grid grid-cols-3 gap-2'
        )}
      >
        {TIMEFRAMES.map(({ key, label }) => {
          const perf = getPerformanceForTimeframe(performance, key);
          const isSelected = selectedTimeframe === key;
          const isUp = perf.percent >= 0;

          return (
            <button
              key={key}
              onClick={() => setSelectedTimeframe(key)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                'border hover:border-primary/50',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-muted border-border'
              )}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {isSelected ? label : key}
                </span>
                <span
                  className={cn(
                    'font-semibold',
                    !isSelected &&
                      (isUp
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400')
                  )}
                >
                  {isUp ? '+' : ''}
                  {perf.percent.toFixed(1)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Timeframe Details */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2 rounded-full',
              isPositive
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground">
              {TIMEFRAMES.find((t) => t.key === selectedTimeframe)?.label}
            </p>
            <p
              className={cn(
                'text-2xl font-bold',
                isPositive
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {isPositive ? '+' : ''}
              {selectedPerf.percent.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm text-muted-foreground">Änderung</p>
          <p
            className={cn(
              'text-lg font-semibold',
              isPositive
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            )}
          >
            {isPositive ? '+' : ''}
            {selectedPerf.change.toFixed(2)} €
          </p>
        </div>

        {showBadge && (
          <PerformanceBadge performancePercent={selectedPerf.percent} size="lg" />
        )}
      </div>
    </div>
  );
}
