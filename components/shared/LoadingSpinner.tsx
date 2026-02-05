import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingSpinner({
  className,
  size = 'md',
  text,
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2
        className={cn(
          'animate-spin text-primary',
          size === 'sm' && 'h-4 w-4',
          size === 'md' && 'h-8 w-8',
          size === 'lg' && 'h-12 w-12'
        )}
      />
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );
}
