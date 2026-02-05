'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters/currency';

interface PriceDisplayProps {
  value: number;
  currency?: string;
  showSign?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceDisplay({
  value,
  currency = 'EUR',
  showSign = false,
  className,
  size = 'md',
}: PriceDisplayProps) {
  const isPositive = value >= 0;
  const formatted = formatCurrency(Math.abs(value), currency);
  const sign = showSign ? (isPositive ? '+' : '-') : value < 0 ? '-' : '';

  return (
    <span
      className={cn(
        'font-medium tabular-nums',
        showSign && (isPositive ? 'text-positive' : 'text-negative'),
        size === 'sm' && 'text-sm',
        size === 'md' && 'text-base',
        size === 'lg' && 'text-2xl font-bold',
        className
      )}
    >
      {sign}{showSign ? formatted.replace('-', '') : formatted}
    </span>
  );
}
