'use client';

import { Info } from 'lucide-react';
import type { StockFundamentals, FundamentalsMetric } from '@/types/fundamentals';
import { formatFundamentalValue, getValueColor } from '@/hooks/useFundamentals';

interface FundamentalsTableProps {
  title: string;
  metrics: FundamentalsMetric[];
  data: StockFundamentals[];
  currency: string;
}

export function FundamentalsTable({
  title,
  metrics,
  data,
  currency,
}: FundamentalsTableProps) {
  // Sortiere Jahre absteigend
  const sortedData = [...data].sort((a, b) => b.fiscalYear - a.fiscalYear);

  // Zeige maximal 10 Jahre
  const displayYears = sortedData.slice(0, 10);

  if (displayYears.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="bg-muted/50 px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-2 text-left font-medium text-muted-foreground sticky left-0 bg-muted/30 min-w-[180px]">
                Kennzahl
              </th>
              {displayYears.map((year) => (
                <th
                  key={year.fiscalYear}
                  className="px-3 py-2 text-right font-medium text-muted-foreground min-w-[80px]"
                >
                  {year.isEstimate ? `${year.fiscalYear}e` : year.fiscalYear}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.key} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2 font-medium sticky left-0 bg-card">
                  <div className="flex items-center gap-1">
                    <span>{metric.label}</span>
                    {metric.tooltip && (
                      <span title={metric.tooltip}>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </span>
                    )}
                  </div>
                </td>
                {displayYears.map((year) => {
                  const value = year[metric.key] as number | undefined;
                  const formattedValue = formatFundamentalValue(
                    value,
                    metric.format,
                    metric.decimals ?? 2,
                    currency
                  );
                  const colorClass = metric.colorCode ? getValueColor(value) : '';

                  return (
                    <td
                      key={year.fiscalYear}
                      className={`px-3 py-2 text-right tabular-nums ${colorClass}`}
                    >
                      {formattedValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
