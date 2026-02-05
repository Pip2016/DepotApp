'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatPercent } from '@/lib/formatters/number';

interface PercentChangeProps {
  value: number;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PercentChange({
  value,
  showIcon = true,
  className,
  size = 'md',
}: PercentChangeProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium tabular-nums',
        isPositive && 'text-positive',
        isNegative && 'text-negative',
        isNeutral && 'text-muted-foreground',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-lg',
        className
      )}
    >
      {showIcon && <Icon className={cn(
        size === 'sm' && 'h-3 w-3',
        size === 'md' && 'h-4 w-4',
        size === 'lg' && 'h-5 w-5',
      )} />}
      {formatPercent(value)}
    </span>
  );
}
