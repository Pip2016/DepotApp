'use client';

import { Position } from '@/types/portfolio';
import { StockQuote } from '@/types/stock';
import { PositionCard } from './PositionCard';

interface PositionListProps {
  positions: Position[];
  quotes: Record<string, StockQuote>;
  onEdit?: (position: Position) => void;
  onDelete?: (id: string) => void;
}

export function PositionList({ positions, quotes, onEdit, onDelete }: PositionListProps) {
  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12">
        <p className="text-lg font-medium text-muted-foreground">
          Keine Positionen vorhanden
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Füge deine erste Position hinzu oder importiere ein CSV.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {positions.map((position) => (
        <PositionCard
          key={position.id}
          position={position}
          quote={quotes[position.symbol]}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
