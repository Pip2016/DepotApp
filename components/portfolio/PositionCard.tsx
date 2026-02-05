'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters/currency';
import { PercentChange } from '@/components/shared/PercentChange';
import { Position } from '@/types/portfolio';
import { StockQuote } from '@/types/stock';
import { Trash2, Edit2 } from 'lucide-react';

interface PositionCardProps {
  position: Position;
  quote?: StockQuote;
  onEdit?: (position: Position) => void;
  onDelete?: (id: string) => void;
}

export function PositionCard({ position, quote, onEdit, onDelete }: PositionCardProps) {
  const currentPrice = quote?.price ?? position.currentPrice ?? position.buyPrice;
  const positionValue = currentPrice * position.quantity;
  const investedValue = position.buyPrice * position.quantity;
  const gain = positionValue - investedValue;
  const gainPercent = investedValue > 0 ? (gain / investedValue) * 100 : 0;
  const dayChangePercent = quote?.changePercent ?? 0;

  return (
    <div className="card-shadow rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <Link
          href={`/stock/${encodeURIComponent(position.symbol)}`}
          className="flex-1"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
              {position.symbol.slice(0, 2)}
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">
                {position.name}
              </h3>
              <p className="text-xs text-muted-foreground">{position.symbol}</p>
            </div>
          </div>
        </Link>

        <div className="flex gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(position)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(position.id)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Kurs</p>
          <p className="font-medium">{formatCurrency(currentPrice, position.currency)}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Tagesänderung</p>
          <PercentChange value={dayChangePercent} size="sm" />
        </div>
        <div>
          <p className="text-muted-foreground">Positionswert</p>
          <p className="font-medium">{formatCurrency(positionValue, position.currency)}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Gewinn/Verlust</p>
          <p
            className={cn(
              'font-medium',
              gain >= 0 ? 'text-positive' : 'text-negative'
            )}
          >
            {gain >= 0 ? '+' : ''}{formatCurrency(gain, position.currency)} ({formatPercent(gainPercent).replace('.', ',')})
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span>{position.quantity} Stück × {formatCurrency(position.buyPrice, position.currency)}</span>
        <span>Investiert: {formatCurrency(investedValue, position.currency)}</span>
      </div>
    </div>
  );
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
