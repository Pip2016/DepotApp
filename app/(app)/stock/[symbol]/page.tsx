'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useStockData } from '@/hooks/useStockData';
import { usePerformance } from '@/hooks/usePerformance';
import { StockHeader } from '@/components/stock/StockHeader';
import { StockChart } from '@/components/stock/StockChart';
import { FundamentalData } from '@/components/stock/FundamentalData';
import { StockNews } from '@/components/stock/StockNews';
import { PerformanceTimeframes } from '@/components/shared/PerformanceTimeframes';
import { AddToWatchlistButton } from '@/components/watchlist/AddToWatchlistButton';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StockDetailPage() {
  const params = useParams();
  const symbol = typeof params.symbol === 'string' ? decodeURIComponent(params.symbol) : '';
  const [range, setRange] = useState('1mo');

  const { quote, history, fundamentals, news, isLoading } = useStockData(
    symbol,
    range
  );

  const { performance, isLoading: performanceLoading } = usePerformance(symbol);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Dashboard
      </Link>

      {/* Stock Header */}
      <div className="flex items-start justify-between gap-4">
        <StockHeader quote={quote} isLoading={isLoading} />
        {symbol && <AddToWatchlistButton symbol={symbol} />}
      </div>

      {/* Chart */}
      <StockChart
        data={history}
        currency={quote?.currency}
        isLoading={isLoading}
        onRangeChange={setRange}
        currentRange={range}
      />

      {/* Performance Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Performance</h2>
        {performanceLoading ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : performance ? (
          <PerformanceTimeframes
            performance={performance}
            showBadge
            layout="horizontal"
            defaultTimeframe="1Y"
          />
        ) : (
          <p className="text-muted-foreground">
            Performance-Daten nicht verfügbar
          </p>
        )}
      </section>

      {/* Fundamentals */}
      <FundamentalData
        data={fundamentals}
        isLoading={isLoading}
        currency={quote?.currency}
      />

      {/* News */}
      <StockNews news={news} isLoading={isLoading} />
    </div>
  );
}
