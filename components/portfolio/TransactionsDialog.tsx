'use client';

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { sortEntries, type LedgerEntry, type LedgerType } from '@/lib/portfolio/ledger';
import { formatCurrency } from '@/lib/formatters/currency';
import type { Holding } from '@/hooks/usePortfolio';

interface TransactionsDialogProps {
  holding: Holding | null;
  entries: LedgerEntry[];
  onClose: () => void;
  onAdd: (entry: Omit<LedgerEntry, 'id'>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const LABELS: Record<LedgerType, string> = {
  buy: 'Kauf',
  sell: 'Verkauf',
  dividend: 'Dividende',
  transfer: 'Einbuchung',
  split: 'Split',
  spinoff: 'Abspaltung',
};

// "1.234,56" und "1234.56" erlauben
const parseNum = (v: string) => Number(v.includes(',') ? v.replace(/\./g, '').replace(',', '.') : v) || 0;
const formatQty = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 4 });
const today = () => new Date().toISOString().slice(0, 10);

const inputClass =
  'h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-ring';

// Buchungen einer Position ansehen, erfassen und löschen
export function TransactionsDialog({ holding, entries, onClose, onAdd, onDelete }: TransactionsDialogProps) {
  const [type, setType] = useState<'buy' | 'sell' | 'dividend' | 'transfer'>('buy');
  const [date, setDate] = useState(today());
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('');
  const [tax, setTax] = useState('');
  const [saving, setSaving] = useState(false);

  if (!holding) return null;
  const cur = holding.currency;
  const list = sortEntries(entries).reverse();

  const describe = (e: LedgerEntry) => {
    if (e.type === 'split') return `Verhältnis ${formatQty(e.ratio ?? 1)} neue je Aktie`;
    if (e.type === 'spinoff') return `Einstand × ${formatQty(e.ratio ?? 1)}`;
    if (e.type === 'dividend') return `${formatQty(e.quantity)} × ${formatCurrency(e.price, cur)} = ${formatCurrency(e.price * e.quantity, cur)}`;
    return `${formatQty(e.quantity)} × ${formatCurrency(e.price, cur)}`;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const q = parseNum(quantity);
    const p = parseNum(price);
    if (q <= 0 || p < 0) return;
    if (type === 'sell' && q > holding.quantity + 1e-9) {
      if (!confirm(`Im Bestand sind nur ${formatQty(holding.quantity)} Stück. Trotzdem buchen?`)) return;
    }
    setSaving(true);
    const ok = await onAdd({
      type,
      symbol: holding.symbol,
      name: holding.name,
      isin: holding.isin,
      wkn: holding.wkn,
      quantity: q,
      price: p,
      fees: parseNum(fees),
      tax: parseNum(tax),
      currency: cur,
      date,
    });
    setSaving(false);
    if (ok) {
      setQuantity('');
      setPrice('');
      setFees('');
      setTax('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-lg">
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">{holding.name}</h2>
            <p className="text-sm text-muted-foreground">
              {holding.symbol} · {formatQty(holding.quantity)} Stück · Einstand {formatCurrency(holding.avgCost, cur)} (FIFO)
            </p>
            <p className="text-sm text-muted-foreground">
              Realisiert {formatCurrency(holding.realizedPnl, cur)} · Dividenden netto {formatCurrency(holding.dividendsNet, cur)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="grid grid-cols-2 gap-3 border-b border-border p-5 sm:grid-cols-6">
          <label className="col-span-1 text-xs text-muted-foreground sm:col-span-1">
            Art
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={inputClass}>
              <option value="buy">Kauf</option>
              <option value="sell">Verkauf</option>
              <option value="dividend">Dividende</option>
              <option value="transfer">Einbuchung</option>
            </select>
          </label>
          <label className="col-span-1 text-xs text-muted-foreground sm:col-span-1">
            Datum
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
          </label>
          <label className="text-xs text-muted-foreground">
            Stück
            <input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="decimal" className={inputClass} required />
          </label>
          <label className="text-xs text-muted-foreground">
            {type === 'dividend' ? 'Brutto je Aktie' : type === 'transfer' ? 'Einstand je Aktie' : 'Kurs'}
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className={inputClass} required />
          </label>
          <label className="text-xs text-muted-foreground">
            Gebühren
            <input value={fees} onChange={(e) => setFees(e.target.value)} inputMode="decimal" className={inputClass} />
          </label>
          <label className="text-xs text-muted-foreground">
            Steuern
            <input value={tax} onChange={(e) => setTax(e.target.value)} inputMode="decimal" className={inputClass} />
          </label>
          <div className="col-span-2 flex justify-end sm:col-span-6">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {LABELS[type]} buchen
            </button>
          </div>
        </form>

        <ul className="flex-1 divide-y divide-border overflow-y-auto">
          {list.length === 0 && <li className="p-5 text-sm text-muted-foreground">Noch keine Buchungen.</li>}
          {list.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
              <div className="min-w-0">
                <span className="font-medium text-foreground">{LABELS[e.type]}</span>
                <span className="ml-2 text-muted-foreground">{new Date(e.date).toLocaleDateString('de-DE')}</span>
                <div className="truncate text-xs text-muted-foreground">
                  {describe(e)}
                  {e.fees ? ` · Gebühren ${formatCurrency(e.fees, cur)}` : ''}
                  {e.tax ? ` · Steuern ${formatCurrency(e.tax, cur)}` : ''}
                  {e.notes ? ` · ${e.notes}` : ''}
                </div>
              </div>
              <button
                onClick={() => confirm('Buchung löschen?') && onDelete(e.id)}
                className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Buchung löschen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
