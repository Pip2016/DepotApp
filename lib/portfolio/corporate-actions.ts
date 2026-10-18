// Kapitalmaßnahmen (Splits, Zusammenlegungen, Abspaltungen) und ihre Einbuchung in eine Position.
// Yahoo meldet Splits zuverlässig, Abspaltungen aber nur als "Split" mit krummem Faktor und ohne
// die neue Aktie. Deshalb ergänzt eine Tabelle bekannter Abspaltungen Tochter und Verhältnis.

import type { Position } from '@/types/portfolio';

export interface CorporateAction {
  // Stabil je Maßnahme, damit eine eingebuchte Maßnahme nicht erneut vorgeschlagen wird
  id: string;
  symbol: string;
  date: string; // YYYY-MM-DD, erster Handelstag danach (ex-Tag)
  type: 'split' | 'spinoff' | 'unknown';
  // split: neue Aktien je alte Aktie (2 bei 2:1, 0,5 bei Zusammenlegung 1:2)
  factor?: number;
  // spinoff: Tochteraktien je Mutteraktie und Anteil des Einstands, der bei der Mutter bleibt
  child?: { symbol: string; name: string; isin?: string };
  ratio?: number;
  parentShare?: number;
  note?: string;
}

interface KnownSpinoff {
  parent: string;
  date: string;
  child: { symbol: string; name: string; isin?: string };
  ratio: number;
  // Aus den Schlusskursen am ersten Handelstag; fehlt der Wert, gilt Yahoos Kursfaktor
  parentShare?: number;
}

// Abspaltungen, die Yahoo nicht oder nur ohne Tochter meldet. parentShare = Wert der Mutter /
// (Wert der Mutter + Wert der zugeteilten Töchter) am ersten Handelstag.
const KNOWN_SPINOFFS: KnownSpinoff[] = [
  { parent: 'MMM', date: '2024-04-01', ratio: 1 / 4, child: { symbol: 'SOLV', name: 'Solventum', isin: 'US83444M1018' } },
  { parent: 'WDC', date: '2025-02-24', ratio: 1 / 3, child: { symbol: 'SNDK', name: 'Sandisk', isin: 'US80004C2008' } },
  { parent: 'LEN', date: '2025-02-07', ratio: 1 / 2, child: { symbol: 'MRP', name: 'Millrose Properties', isin: 'US6013231023' } },
  { parent: 'HON', date: '2025-10-30', ratio: 1 / 4, child: { symbol: 'SOLS', name: 'Solstice Advanced Materials' } },
  // Am selben Tag folgte die Zusammenlegung 1:2 (siehe KNOWN_SPLITS)
  { parent: 'HON', date: '2026-06-29', ratio: 1 / 2, parentShare: 0.509, child: { symbol: 'HONA', name: 'Honeywell Aerospace', isin: 'US43849R1059' } },
  { parent: 'PFE', date: '2020-11-17', ratio: 0.124079, child: { symbol: 'VTRS', name: 'Viatris', isin: 'US92556V1061' } },
  { parent: 'IBM', date: '2021-11-04', ratio: 1 / 5, child: { symbol: 'KD', name: 'Kyndryl', isin: 'US50155Q1004' } },
  { parent: 'O', date: '2021-11-15', ratio: 1 / 10, child: { symbol: 'ONL', name: 'Orion Office REIT', isin: 'US68629Y1038' } },
  { parent: 'MBG.DE', date: '2021-12-10', ratio: 1 / 2, parentShare: 0.73, child: { symbol: 'DTG.DE', name: 'Daimler Truck', isin: 'DE000DTR0CK8' } },
  { parent: 'SIE.DE', date: '2020-09-28', ratio: 1 / 2, parentShare: 0.92, child: { symbol: 'ENR.DE', name: 'Siemens Energy', isin: 'DE000ENER6Y0' } },
  { parent: 'CON.DE', date: '2025-09-18', ratio: 1 / 2, parentShare: 0.747, child: { symbol: 'AMV0.DE', name: 'Aumovio', isin: 'DE000AUM0V10' } },
  { parent: 'TKA.DE', date: '2025-10-20', ratio: 1 / 20, parentShare: 0.698, child: { symbol: 'TKMS.DE', name: 'TKMS', isin: 'DE000TKMS001' } },
  // Vor der Zusammenlegung 8:9 am Folgetag; das Verhältnis gilt je alter Unilever-Aktie
  { parent: 'ULVR.L', date: '2025-12-08', ratio: 1 / 5, parentShare: 0.95, child: { symbol: 'MICC.AS', name: 'The Magnum Ice Cream Company', isin: 'NL0015002MS2' } },
];

// Zusammenlegungen, die Yahoo mit einer Abspaltung zu einem Faktor verrechnet
const KNOWN_SPLITS: Array<{ symbol: string; date: string; factor: number }> = [
  { symbol: 'HON', date: '2026-06-29', factor: 1 / 2 },
];

// Echte Splits haben einfache Verhältnisse (2:1, 3:2, 1:25, 8:9); Abspaltungen krumme (1196:1000)
export function isSimpleRatio(numerator: number, denominator: number): boolean {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const n = Math.round(numerator);
  const d = Math.round(denominator);
  if (Math.abs(n - numerator) > 1e-9 || Math.abs(d - denominator) > 1e-9) return false;
  const g = gcd(n, d) || 1;
  return Math.min(n / g, d / g) === 1 || Math.max(n / g, d / g) <= 20;
}

const dayDiff = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

// Yahoo-Ereignisse und Tabelle zusammenführen. Ein krummer Yahoo-Faktor nahe einer bekannten
// Abspaltung ist dieselbe Maßnahme; sonst bleibt er als "unknown" zur manuellen Prüfung.
export function buildActions(
  symbol: string,
  since: string,
  yahooEvents: Array<{ date: string; numerator: number; denominator: number }>
): CorporateAction[] {
  const sym = symbol.toUpperCase();
  const spinoffs = KNOWN_SPINOFFS.filter((s) => s.parent === sym && s.date > since).map((s) => ({ ...s }));
  const splits = KNOWN_SPLITS.filter((s) => s.symbol === sym && s.date > since);
  const actions: CorporateAction[] = [];

  for (const e of yahooEvents) {
    if (e.date <= since) continue;
    const factor = e.numerator / e.denominator;
    const simple = isSimpleRatio(e.numerator, e.denominator);
    // Einfache Verhältnisse sind echte Splits, auch nahe einer Abspaltung (Unilever 8:9 einen Tag nach Magnum)
    const spinoff = simple ? undefined : spinoffs.find((s) => dayDiff(s.date, e.date) <= 20);
    if (spinoff) {
      if (spinoff.parentShare == null) spinoff.parentShare = 1 / factor;
      continue;
    }
    if (splits.some((s) => dayDiff(s.date, e.date) <= 5)) continue;
    actions.push(
      simple
        ? { id: `${sym}:${e.date}:split`, symbol: sym, date: e.date, type: 'split', factor }
        : {
            id: `${sym}:${e.date}:unknown`,
            symbol: sym,
            date: e.date,
            type: 'unknown',
            factor,
            // (n+1):n ist eine Stockdividende (Philips), sonst meist eine Abspaltung
            note:
              Math.abs(e.numerator - e.denominator - 1) < 1e-6
                ? `Stockdividende: 1 neue Aktie je ${e.denominator.toLocaleString('de-DE', { maximumFractionDigits: 2 })} Aktien (wenn statt Bardividende gewählt). Stückzahl mit der Abrechnung der Bank abgleichen.`
                : `Yahoo meldet eine Kursbereinigung um ${e.numerator}:${e.denominator}, vermutlich eine Abspaltung. Bitte die Abrechnung der Bank prüfen.`,
          }
    );
  }

  for (const s of splits) {
    actions.push({ id: `${sym}:${s.date}:split`, symbol: sym, date: s.date, type: 'split', factor: s.factor });
  }
  for (const s of spinoffs) {
    actions.push({
      id: `${sym}:${s.date}:spinoff:${s.child.symbol}`,
      symbol: sym,
      date: s.date,
      type: 'spinoff',
      child: s.child,
      ratio: s.ratio,
      parentShare: s.parentShare,
    });
  }

  // Abspaltung vor Split am selben Tag (Unilever, Honeywell: Zuteilung je alter Aktie)
  const order = { spinoff: 0, split: 1, unknown: 2 };
  return actions.sort((a, b) => a.date.localeCompare(b.date) || order[a.type] - order[b.type]);
}

export interface ActionResult {
  parent: Position;
  child?: Omit<Position, 'id'>;
  // Bruchteile (Tochter bzw. bei Zusammenlegung die Mutter), die die Bank in bar ausgleicht
  fractionalShares?: number;
}

// Bucht eine Maßnahme ein. Bei einer Abspaltung wird der Einstand steuerneutral nach dem
// Kursverhältnis am ersten Handelstag aufgeteilt (§ 20 Abs. 4a Satz 7 EStG); behandelt die Bank
// die Zuteilung als Sachausschüttung, weicht ihr Einstand davon ab.
export function applyAction(position: Position, action: CorporateAction): ActionResult {
  const applied = [...(position.appliedActions ?? []), action.id];

  if (action.type === 'split' && action.factor) {
    const exact = position.quantity * action.factor;
    // Bei Zusammenlegungen gleicht die Bank Bruchteile bar aus (Unilever 53 -> 47 statt 47,11)
    const quantity = Number.isInteger(position.quantity) ? Math.floor(exact + 1e-9) : exact;
    return {
      parent: { ...position, quantity, buyPrice: position.buyPrice / action.factor, appliedActions: applied },
      fractionalShares: exact - quantity > 1e-9 ? exact - quantity : undefined,
    };
  }

  if (action.type === 'spinoff' && action.child && action.ratio && action.parentShare != null) {
    const exact = position.quantity * action.ratio;
    const childQty = Math.floor(exact + 1e-9);
    const invested = position.quantity * position.buyPrice;
    const parent = { ...position, buyPrice: position.buyPrice * action.parentShare, appliedActions: applied };
    if (childQty === 0) return { parent, fractionalShares: exact };
    return {
      parent,
      child: {
        symbol: action.child.symbol,
        isin: action.child.isin,
        name: action.child.name,
        quantity: childQty,
        // Der Einstand der bar ausgeglichenen Bruchteile gilt als mitverkauft
        buyPrice: (invested * (1 - action.parentShare)) / exact,
        buyDate: action.date,
        currency: position.currency,
        appliedActions: [action.id],
      },
      fractionalShares: exact - childQty,
    };
  }

  // Unbekannte Maßnahme: nur als erledigt markieren
  return { parent: { ...position, appliedActions: applied } };
}
