'use client';

import { useMemo, useState } from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useMultipleStockQuotes } from '@/hooks/useStockData';
import { PortfolioSummary } from '@/components/portfolio/PortfolioSummary';
import { PositionList } from '@/components/portfolio/PositionList';
import { AddPositionDialog } from '@/components/portfolio/AddPositionDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatPercent } from '@/lib/formatters/number';
import { cn } from '@/lib/utils';
import { Plus, ArrowUpDown } from 'lucide-react';
import { Position } from '@/types/portfolio';
import Link from 'next/link';

type SortField = 'name' | 'value' | 'gain' | 'dayChange';
type SortDirection = 'asc' | 'desc';

export default function PortfolioPage() {
  const { portfolio, addPosition, updatePosition, removePosition } = usePortfolio();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editPosition, setEditPosition] = useState<Position | undefined>();
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const symbols = useMemo(
    () => portfolio.positions.map((p) => p.symbol),
    [portfolio.positions]
  );

  const { quotes, isLoading } = useMultipleStockQuotes(symbols);

  const sortedPositions = useMemo(() => {
    return [...portfolio.positions].sort((a, b) => {
      const quoteA = quotes[a.symbol];
      const quoteB = quotes[b.symbol];
      const priceA = quoteA?.price ?? a.currentPrice ?? a.buyPrice;
      const priceB = quoteB?.price ?? b.currentPrice ?? b.buyPrice;

      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'value':
          comparison = priceA * a.quantity - priceB * b.quantity;
          break;
        case 'gain':
          const gainA = (priceA - a.buyPrice) * a.quantity;
          const gainB = (priceB - b.buyPrice) * b.quantity;
          comparison = gainA - gainB;
          break;
        case 'dayChange':
          comparison = (quoteA?.changePercent ?? 0) - (quoteB?.changePercent ?? 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [portfolio.positions, quotes, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleEdit = (position: Position) => {
    setEditPosition(position);
    setShowAddDialog(true);
  };

  const handleAdd = (position: Omit<Position, 'id'>) => {
    if (editPosition) {
      updatePosition(editPosition.id, position);
      setEditPosition(undefined);
    } else {
      addPosition(position);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Detaillierte Übersicht aller Positionen
          </p>
        </div>
        <button
          onClick={() => {
            setEditPosition(undefined);
            setShowAddDialog(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Position hinzufügen
        </button>
      </div>

      {/* Summary */}
      <PortfolioSummary positions={portfolio.positions} quotes={quotes} />

      {/* Table View */}
      <div className="card-shadow overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    Name
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Kurs
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort('dayChange')}
                    className="ml-auto flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    Tagesänderung
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Stück
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort('value')}
                    className="ml-auto flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    Wert
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort('gain')}
                    className="ml-auto flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    Gewinn/Verlust
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <LoadingSpinner text="Kurse werden geladen..." />
                  </td>
                </tr>
              ) : (
                sortedPositions.map((position) => {
                  const quote = quotes[position.symbol];
                  const currentPrice =
                    quote?.price ?? position.currentPrice ?? position.buyPrice;
                  const posValue = currentPrice * position.quantity;
                  const invested = position.buyPrice * position.quantity;
                  const gain = posValue - invested;
                  const gainPercent =
                    invested > 0 ? (gain / invested) * 100 : 0;
                  const dayChange = quote?.changePercent ?? 0;

                  return (
                    <tr
                      key={position.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/stock/${encodeURIComponent(position.symbol)}`}
                          className="hover:text-primary"
                        >
                          <div className="font-medium">{position.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {position.symbol}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(currentPrice, position.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            'tabular-nums font-medium',
                            dayChange >= 0
                              ? 'text-positive'
                              : 'text-negative'
                          )}
                        >
                          {formatPercent(dayChange)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {position.quantity}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {formatCurrency(posValue, position.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            'tabular-nums font-medium',
                            gain >= 0 ? 'text-positive' : 'text-negative'
                          )}
                        >
                          {gain >= 0 ? '+' : ''}
                          {formatCurrency(gain, position.currency)}
                        </span>
                        <div
                          className={cn(
                            'text-xs',
                            gain >= 0 ? 'text-positive' : 'text-negative'
                          )}
                        >
                          {formatPercent(gainPercent)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEdit(position)}
                            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => removePosition(position.id)}
                            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            Löschen
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Position Dialog */}
      <AddPositionDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditPosition(undefined);
        }}
        onAdd={handleAdd}
        editPosition={editPosition}
      />
    </div>
  );
}
