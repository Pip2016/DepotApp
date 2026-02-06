'use client';

import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Rocket,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceBadgeProps {
  performancePercent: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
}

interface BadgeConfig {
  label: string;
  icon: React.ReactNode;
  className: string;
}

function getBadgeConfig(percent: number, size: 'sm' | 'md' | 'lg'): BadgeConfig {
  const iconSize =
    size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';

  if (percent > 20) {
    return {
      label: 'Top Performer',
      icon: <Rocket className={iconSize} />,
      className:
        'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    };
  }

  if (percent > 10) {
    return {
      label: 'Stark',
      icon: <TrendingUp className={iconSize} />,
      className:
        'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    };
  }

  if (percent > 0) {
    return {
      label: 'Stabil',
      icon: <TrendingUp className={iconSize} />,
      className:
        'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    };
  }

  if (percent > -10) {
    return {
      label: 'Schwach',
      icon: <TrendingDown className={iconSize} />,
      className:
        'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    };
  }

  return {
    label: 'Underperformer',
    icon: <AlertTriangle className={iconSize} />,
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  };
}

export function PerformanceBadge({
  performancePercent,
  size = 'md',
  showIcon = true,
  showText = true,
}: PerformanceBadgeProps) {
  const config = getBadgeConfig(performancePercent, size);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium gap-1 border',
        config.className,
        sizeClasses[size]
      )}
    >
      {showIcon && config.icon}
      {showText && <span>{config.label}</span>}
    </Badge>
  );
}
