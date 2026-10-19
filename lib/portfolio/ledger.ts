// Depot aus Buchungen: Bestand, Einstand nach FIFO (wie das Finanzamt), realisierte Gewinne,
// Dividenden. Splits und Abspaltungen wirken nur auf die Stücke, die am Stichtag im Depot lagen.

export type LedgerType = 'buy' | 'sell' | 'dividend' | 'split' | 'spinoff' | 'transfer';

export interface LedgerEntry {
  id: string;
  type: LedgerType;
  symbol: string;
  name?: string;
  isin?: string;
  wkn?: string;
  // buy/sell/transfer: Stück; dividend: Stück am Ex-Tag; split/spinoff: 1
  quantity: number;
  // buy/sell: Kurs je Stück; transfer: Einstand je Stück; dividend: Brutto je Stück
  price: number;
  fees: number;
  tax: number;
  // split: neue Aktien je alte Aktie; spinoff: Anteil des Einstands, der bei der Mutter bleibt
  ratio?: number;
  currency: string;
  date: string; // YYYY-MM-DD
  actionId?: string;
  notes?: string;
}

interface Lot {
  quantity: number;
  costPerShare: number;
  date: string;
}

export interface Holding {
  symbol: string;
  name: string;
  isin?: string;
  wkn?: string;
  currency: string;
  quantity: number;
  costBasis: number;
  avgCost: number;
  firstDate: string;
  realizedPnl: number;
  dividendsGross: number;
  dividendsNet: number;
  fees: number;
  taxes: number;
  actionIds: string[];
  lots: Lot[];
}

const EPS = 1e-9;

// Reihenfolge an einem Tag: Kapitalmaßnahmen zuerst (gelten für den Bestand am Vorabend),
// dann Einbuchungen und Käufe, zuletzt Verkäufe und Dividenden
const DAY_ORDER: Record<LedgerType, number> = { spinoff: 0, split: 1, transfer: 2, buy: 3, sell: 4, dividend: 5 };

export function sortEntries(entries: LedgerEntry[]): LedgerEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date) || DAY_ORDER[a.type] - DAY_ORDER[b.type]);
}

export function computeHoldings(entries: LedgerEntry[]): { holdings: Holding[]; warnings: string[] } {
  const bySymbol = new Map<string, Holding>();
  const warnings: string[] = [];

  for (const e of sortEntries(entries)) {
    let h = bySymbol.get(e.symbol);
    if (!h) {
      h = {
        symbol: e.symbol,
        name: e.name || e.symbol,
        currency: e.currency,
        quantity: 0,
        costBasis: 0,
        avgCost: 0,
        firstDate: e.date,
        realizedPnl: 0,
        dividendsGross: 0,
        dividendsNet: 0,
        fees: 0,
        taxes: 0,
        actionIds: [],
        lots: [],
      };
      bySymbol.set(e.symbol, h);
    }
    if (e.name) h.name = e.name;
    if (e.isin) h.isin = e.isin;
    if (e.wkn) h.wkn = e.wkn;
    if (e.actionId) h.actionIds.push(e.actionId);
    h.fees += e.fees;
    h.taxes += e.tax;

    switch (e.type) {
      case 'buy':
      case 'transfer':
        if (e.quantity > EPS) {
          // Kaufgebühren gehören zum Einstand
          h.lots.push({ quantity: e.quantity, costPerShare: (e.price * e.quantity + e.fees) / e.quantity, date: e.date });
        }
        break;

      case 'sell': {
        let remaining = e.quantity;
        let cost = 0;
        while (remaining > EPS && h.lots.length > 0) {
          const lot = h.lots[0];
          const take = Math.min(lot.quantity, remaining);
          cost += take * lot.costPerShare;
          lot.quantity -= take;
          remaining -= take;
          if (lot.quantity <= EPS) h.lots.shift();
        }
        if (remaining > EPS) warnings.push(`${e.symbol}: Verkauf am ${e.date} über ${remaining} Stück mehr als im Bestand`);
        const sold = e.quantity - remaining;
        h.realizedPnl += sold * e.price - e.fees - cost;
        break;
      }

      case 'dividend':
        h.dividendsGross += e.price * e.quantity;
        h.dividendsNet += e.price * e.quantity - e.tax;
        break;

      case 'split': {
        const r = e.ratio ?? 1;
        const before = h.lots.reduce((s, l) => s + l.quantity, 0);
        for (const lot of h.lots) {
          lot.quantity *= r;
          lot.costPerShare /= r;
        }
        // Bei Zusammenlegungen gleicht die Bank Bruchteile bar aus; ihr Einstand gilt als mitverkauft
        const exact = before * r;
        const kept = Number.isInteger(Math.round(before * 1e6) / 1e6) ? Math.floor(exact + EPS) : exact;
        let drop = exact - kept;
        for (let i = h.lots.length - 1; i >= 0 && drop > EPS; i--) {
          const take = Math.min(h.lots[i].quantity, drop);
          h.lots[i].quantity -= take;
          drop -= take;
          if (h.lots[i].quantity <= EPS) h.lots.splice(i, 1);
        }
        break;
      }

      case 'spinoff':
        for (const lot of h.lots) lot.costPerShare *= e.ratio ?? 1;
        break;
    }
  }

  for (const h of bySymbol.values()) {
    h.quantity = h.lots.reduce((s, l) => s + l.quantity, 0);
    h.costBasis = h.lots.reduce((s, l) => s + l.quantity * l.costPerShare, 0);
    h.avgCost = h.quantity > EPS ? h.costBasis / h.quantity : 0;
    h.firstDate = h.lots[0]?.date ?? h.firstDate;
  }
  return { holdings: [...bySymbol.values()], warnings };
}
