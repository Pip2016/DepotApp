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
import { FundamentalsView } from '@/components/fundamentals';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BarChart3, TrendingUp, Newspaper } from 'lucide-react';
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

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Übersicht</span>
          </TabsTrigger>
          <TabsTrigger value="fundamentals" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Fundamentale Kennzahlen</span>
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-2">
            <Newspaper className="h-4 w-4" />
            <span className="hidden sm:inline">News</span>
          </TabsTrigger>
        </TabsList>

        {/* Übersicht Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
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

          {/* Quick Fundamentals */}
          <FundamentalData
            data={fundamentals}
            isLoading={isLoading}
            currency={quote?.currency}
          />
        </TabsContent>

        {/* Fundamentale Kennzahlen Tab */}
        <TabsContent value="fundamentals" className="mt-6">
          <FundamentalsView symbol={symbol} />
        </TabsContent>

        {/* News Tab */}
        <TabsContent value="news" className="mt-6">
          <StockNews news={news} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
