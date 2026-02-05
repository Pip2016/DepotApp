'use client';

import { useMemo, useState } from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useMultipleStockQuotes } from '@/hooks/useStockData';
import { PortfolioSummary } from '@/components/portfolio/PortfolioSummary';
import { PositionList } from '@/components/portfolio/PositionList';
import { AllocationChart } from '@/components/portfolio/AllocationChart';
import { PerformanceChart } from '@/components/portfolio/PerformanceChart';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AddPositionDialog } from '@/components/portfolio/AddPositionDialog';
import { Plus } from 'lucide-react';

export default function DashboardPage() {
  const { portfolio, addPosition, removePosition } = usePortfolio();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const symbols = useMemo(
    () => portfolio.positions.map((p) => p.symbol),
    [portfolio.positions]
  );

  const { quotes, isLoading } = useMultipleStockQuotes(symbols);

  // Generate mock performance data based on portfolio
  const performanceData = useMemo(() => {
    const days = 30;
    const totalInvested = portfolio.positions.reduce(
      (sum, pos) => sum + pos.buyPrice * pos.quantity,
      0
    );
    const currentTotal = portfolio.positions.reduce((sum, pos) => {
      const quote = quotes[pos.symbol];
      const price = quote?.price ?? pos.currentPrice ?? pos.buyPrice;
      return sum + price * pos.quantity;
    }, 0);

    const data = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const progress = (days - i) / days;
      const value = totalInvested + (currentTotal - totalInvested) * progress;
      const variation = value * (Math.sin(i * 0.5) * 0.01);
      data.push({
        date: date.toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
        }),
        value: Math.round((value + variation) * 100) / 100,
      });
    }
    return data;
  }, [portfolio.positions, quotes]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Übersicht deines Portfolios
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Position hinzufügen
        </button>
      </div>

      {/* Summary Cards */}
      <PortfolioSummary positions={portfolio.positions} quotes={quotes} />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PerformanceChart data={performanceData} />
        <AllocationChart positions={portfolio.positions} quotes={quotes} />
      </div>

      {/* Position List */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Positionen
        </h2>
        {isLoading ? (
          <LoadingSpinner text="Kurse werden geladen..." className="py-12" />
        ) : (
          <PositionList
            positions={portfolio.positions}
            quotes={quotes}
            onDelete={removePosition}
          />
        )}
      </div>

      {/* Add Position Dialog */}
      <AddPositionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={addPosition}
      />
    </div>
  );
}
