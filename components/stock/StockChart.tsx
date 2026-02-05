'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { HistoricalData } from '@/types/stock';
import { formatCurrency } from '@/lib/formatters/currency';
import { Skeleton } from '@/components/ui/skeleton';

interface StockChartProps {
  data: HistoricalData[];
  currency?: string;
  isLoading: boolean;
  onRangeChange: (range: string) => void;
  currentRange: string;
}

const ranges = [
  { label: '1T', value: '1d' },
  { label: '1W', value: '5d' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '1J', value: '1y' },
  { label: 'Max', value: 'max' },
];

export function StockChart({
  data,
  currency = 'EUR',
  isLoading,
  onRangeChange,
  currentRange,
}: StockChartProps) {
  const isPositive =
    data.length >= 2 && data[data.length - 1].close >= data[0].close;

  const chartColor = isPositive ? 'var(--positive)' : 'var(--negative)';

  return (
    <div className="card-shadow rounded-xl border border-border bg-card p-5">
      {/* Range Selector */}
      <div className="mb-4 flex gap-1">
        {ranges.map((range) => (
          <button
            key={range.value}
            onClick={() => onRangeChange(range.value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              currentRange === range.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : data.length === 0 ? (
        <div className="flex h-80 items-center justify-center text-muted-foreground">
          Keine Chartdaten verfügbar
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value, currency)}
                width={80}
              />
              <Tooltip
                formatter={(value) => [
                  formatCurrency(Number(value), currency),
                  'Kurs',
                ]}
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '14px',
                }}
                labelStyle={{ color: 'var(--muted-foreground)' }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#chartGradient)"
                dot={false}
                activeDot={{ r: 4, fill: chartColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
