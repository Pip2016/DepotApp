'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Position } from '@/types/portfolio';
import { StockQuote } from '@/types/stock';
import { formatCurrency } from '@/lib/formatters/currency';

interface AllocationChartProps {
  positions: Position[];
  quotes: Record<string, StockQuote>;
}

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--primary)',
  'var(--secondary)',
  'var(--accent)',
];

export function AllocationChart({ positions, quotes }: AllocationChartProps) {
  const data = positions.map((pos) => {
    const quote = quotes[pos.symbol];
    const price = quote?.price ?? pos.currentPrice ?? pos.buyPrice;
    return {
      name: pos.name,
      symbol: pos.symbol,
      value: price * pos.quantity,
    };
  });

  const totalValue = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0) return null;

  return (
    <div className="card-shadow rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-lg font-semibold text-card-foreground">
        Verteilung
      </h3>
      <div className="flex flex-col items-center gap-4 md:flex-row">
        <div className="h-64 w-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '14px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {data.map((item, index) => {
            const percent = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
            return (
              <div key={item.symbol} className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.symbol}</span>
                    <span className="text-sm text-muted-foreground">
                      {percent.toFixed(1).replace('.', ',')}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.value)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
