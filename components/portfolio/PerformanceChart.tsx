'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/formatters/currency';

interface PerformanceChartProps {
  data: Array<{ date: string; value: number }>;
  height?: number;
}

export function PerformanceChart({ data, height = 300 }: PerformanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="card-shadow rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-lg font-semibold text-card-foreground">
          Performance
        </h3>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Keine Daten verfügbar
        </div>
      </div>
    );
  }

  const startValue = data[0]?.value ?? 0;
  const endValue = data[data.length - 1]?.value ?? 0;
  const isPositive = endValue >= startValue;

  return (
    <div className="card-shadow rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-lg font-semibold text-card-foreground">
        Performance
      </h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value)}
              width={80}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), 'Wert']}
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '14px',
              }}
              labelStyle={{ color: 'var(--muted-foreground)' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={isPositive ? 'var(--positive)' : 'var(--negative)'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: isPositive ? 'var(--positive)' : 'var(--negative)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
