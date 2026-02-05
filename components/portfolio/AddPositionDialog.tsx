'use client';

import { useState } from 'react';
import { Position } from '@/types/portfolio';
import { X } from 'lucide-react';

interface AddPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (position: Omit<Position, 'id'>) => void;
  editPosition?: Position;
}

export function AddPositionDialog({
  open,
  onOpenChange,
  onAdd,
  editPosition,
}: AddPositionDialogProps) {
  const [symbol, setSymbol] = useState(editPosition?.symbol ?? '');
  const [name, setName] = useState(editPosition?.name ?? '');
  const [isin, setIsin] = useState(editPosition?.isin ?? '');
  const [quantity, setQuantity] = useState(
    editPosition?.quantity?.toString() ?? ''
  );
  const [buyPrice, setBuyPrice] = useState(
    editPosition?.buyPrice?.toString() ?? ''
  );
  const [buyDate, setBuyDate] = useState(
    editPosition?.buyDate ?? new Date().toISOString().split('T')[0]
  );
  const [currency, setCurrency] = useState<'EUR' | 'USD'>(
    editPosition?.currency ?? 'EUR'
  );

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!symbol || !name || !quantity || !buyPrice) return;

    onAdd({
      symbol: symbol.toUpperCase(),
      name,
      isin: isin || undefined,
      quantity: parseFloat(quantity),
      buyPrice: parseFloat(buyPrice.replace(',', '.')),
      buyDate,
      currency,
    });

    // Reset form
    setSymbol('');
    setName('');
    setIsin('');
    setQuantity('');
    setBuyPrice('');
    setBuyDate(new Date().toISOString().split('T')[0]);
    setCurrency('EUR');
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-card-foreground">
            {editPosition ? 'Position bearbeiten' : 'Neue Position'}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Symbol *
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="z.B. AAPL, SAP.DE"
                required
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Apple Inc."
                required
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              ISIN (optional)
            </label>
            <input
              type="text"
              value={isin}
              onChange={(e) => setIsin(e.target.value)}
              placeholder="z.B. US0378331005"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Anzahl *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="10"
                required
                min="0"
                step="any"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Kaufkurs *
              </label>
              <input
                type="text"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                placeholder="150,00"
                required
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Kaufdatum
              </label>
              <input
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Währung
              </label>
              <select
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value as 'EUR' | 'USD')
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-ring"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {editPosition ? 'Speichern' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
