'use client';

import { TrendingUp, TrendingDown, Wallet, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatPercent } from '@/lib/formatters/number';
import { Position } from '@/types/portfolio';
import { StockQuote } from '@/types/stock';

interface PortfolioSummaryProps {
  positions: Position[];
  quotes: Record<string, StockQuote>;
}

export function PortfolioSummary({ positions, quotes }: PortfolioSummaryProps) {
  const totalValue = positions.reduce((sum, pos) => {
    const quote = quotes[pos.symbol];
    const price = quote?.price ?? pos.currentPrice ?? pos.buyPrice;
    return sum + price * pos.quantity;
  }, 0);

  const totalInvested = positions.reduce(
    (sum, pos) => sum + pos.buyPrice * pos.quantity,
    0
  );

  const totalGain = totalValue - totalInvested;
  const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  const todayChange = positions.reduce((sum, pos) => {
    const quote = quotes[pos.symbol];
    if (quote) {
      return sum + quote.change * pos.quantity;
    }
    return sum;
  }, 0);

  const todayChangePercent =
    totalValue - todayChange > 0
      ? (todayChange / (totalValue - todayChange)) * 100
      : 0;

  const cards = [
    {
      label: 'Gesamtwert',
      value: formatCurrency(totalValue),
      icon: Wallet,
      color: 'text-primary',
    },
    {
      label: 'Tagesänderung',
      value: formatCurrency(todayChange),
      subValue: formatPercent(todayChangePercent),
      icon: todayChange >= 0 ? TrendingUp : TrendingDown,
      color: todayChange >= 0 ? 'text-positive' : 'text-negative',
    },
    {
      label: 'Gesamtgewinn/-verlust',
      value: formatCurrency(totalGain),
      subValue: formatPercent(totalGainPercent),
      icon: totalGain >= 0 ? TrendingUp : TrendingDown,
      color: totalGain >= 0 ? 'text-positive' : 'text-negative',
    },
    {
      label: 'Positionen',
      value: String(positions.length),
      icon: BarChart3,
      color: 'text-secondary',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="card-shadow rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <card.icon className={cn('h-5 w-5', card.color)} />
          </div>
          <p className="mt-2 text-2xl font-bold text-card-foreground">
            {card.value}
          </p>
          {card.subValue && (
            <p className={cn('mt-1 text-sm font-medium', card.color)}>
              {card.subValue}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
