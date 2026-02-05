'use client';

import { FundamentalData as FundamentalDataType } from '@/types/stock';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatNumber, formatLargeNumber } from '@/lib/formatters/number';
import { Skeleton } from '@/components/ui/skeleton';

interface FundamentalDataProps {
  data: FundamentalDataType | null;
  isLoading: boolean;
  currency?: string;
}

export function FundamentalData({ data, isLoading, currency = 'EUR' }: FundamentalDataProps) {
  if (isLoading) {
    return (
      <div className="card-shadow rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-lg font-semibold">Fundamentaldaten</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card-shadow rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-lg font-semibold">Fundamentaldaten</h3>
        <p className="text-muted-foreground">Keine Fundamentaldaten verfügbar</p>
      </div>
    );
  }

  const items = [
    {
      label: 'Marktkapitalisierung',
      value: data.marketCap ? formatLargeNumber(data.marketCap) : '–',
    },
    {
      label: 'KGV (P/E)',
      value: data.peRatio ? formatNumber(data.peRatio) : '–',
    },
    {
      label: 'Forward KGV',
      value: data.forwardPE ? formatNumber(data.forwardPE) : '–',
    },
    {
      label: 'Dividendenrendite',
      value: data.dividendYield
        ? `${formatNumber(data.dividendYield * 100)}%`
        : '–',
    },
    {
      label: 'EPS',
      value: data.eps ? formatCurrency(data.eps, currency) : '–',
    },
    {
      label: 'Beta',
      value: data.beta ? formatNumber(data.beta) : '–',
    },
    {
      label: '52W Hoch',
      value: data.fiftyTwoWeekHigh
        ? formatCurrency(data.fiftyTwoWeekHigh, currency)
        : '–',
    },
    {
      label: '52W Tief',
      value: data.fiftyTwoWeekLow
        ? formatCurrency(data.fiftyTwoWeekLow, currency)
        : '–',
    },
    {
      label: 'Ø Volumen',
      value: data.averageVolume ? formatLargeNumber(data.averageVolume) : '–',
    },
    {
      label: 'Kurs-Buchwert',
      value: data.priceToBook ? formatNumber(data.priceToBook) : '–',
    },
  ];

  return (
    <div className="card-shadow rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-lg font-semibold text-card-foreground">
        Fundamentaldaten
      </h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-card-foreground">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
