'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useStockData } from '@/hooks/useStockData';
import { StockHeader } from '@/components/stock/StockHeader';
import { StockChart } from '@/components/stock/StockChart';
import { FundamentalData } from '@/components/stock/FundamentalData';
import { StockNews } from '@/components/stock/StockNews';
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

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Dashboard
      </Link>

      {/* Stock Header */}
      <StockHeader quote={quote} isLoading={isLoading} />

      {/* Chart */}
      <StockChart
        data={history}
        currency={quote?.currency}
        isLoading={isLoading}
        onRangeChange={setRange}
        currentRange={range}
      />

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
