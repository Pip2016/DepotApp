// Baut Jahres-Fundamentals aus SEC EDGAR (US, ab ca. 2009) und Yahoo (alle Börsen, ca. 4 Jahre)
// und speichert sie dauerhaft in stock_fundamentals. Ältere Jahre bleiben beim Upsert erhalten,
// die Historie wächst also mit jedem Jahr weiter.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StockFundamentals } from '@/types/fundamentals';
import { fetchSecAnnual, isSecEnabled, type SecAnnual } from '@/lib/api/providers/sec-edgar';
import {
  fetchYahooAnnual,
  fetchYahooPrices,
  type PriceHistory,
  type RawAnnual,
  type YahooSession,
} from '@/lib/api/providers/yahoo-fundamentals';

const pct = (a?: number, b?: number) => (a != null && b ? (a / b) * 100 : undefined);
const div = (a?: number, b?: number) => (a != null && b ? a / b : undefined);
const positive = (x?: number) => (x != null && x > 0 ? x : undefined);

// US-Ticker bei Yahoo haben keinen Börsen-Suffix (KO, BRK-B); SAP.DE, ALV.DE usw. schon
const isUsTicker = (symbol: string) => !symbol.includes('.');

// London notiert in Pence
const quoteCurrency = (prices: PriceHistory) => (prices.currency === 'GBp' ? 'GBP' : prices.currency);

// Kurs in Berichtswährung; fx: Monatskurse Berichtswährung je Kurswährung (Novartis CHF -> USD)
function priceInCurrency(
  prices: PriceHistory,
  month: string,
  currency: string,
  fx: Map<string, number> | null
): number | undefined {
  const raw = prices.monthlyClose.get(month);
  if (raw == null) return undefined;
  const close = prices.currency === 'GBp' ? raw / 100 : raw;
  if (quoteCurrency(prices) === currency) return close;
  const rate = fx?.get(month);
  return rate != null ? close * rate : undefined;
}

// Monat, dessen Schlusskurs zum Geschäftsjahresende passt. 52/53-Wochen-Jahre enden oft in den
// ersten Tagen eines Monats (SanDisk 3. Juli); dann liegt der Vormonatsschluss näher als der des Monats.
function closingMonth(fiscalYearEnd: string): string {
  const [y, m, d] = fiscalYearEnd.split('-').map(Number);
  if (d > 7) return fiscalYearEnd.slice(0, 7);
  const prev = new Date(Date.UTC(y, m - 2, 1));
  return prev.toISOString().slice(0, 7);
}

// Splits nach dem Stichtag: Faktor, um alte Je-Aktie-Werte auf heutige Aktienzahl umzurechnen
function splitFactorAfter(prices: PriceHistory | null, date: string): number {
  if (!prices) return 1;
  const t = Date.parse(date);
  return prices.splits.filter((s) => s.date > t).reduce((f, s) => f * s.factor, 1);
}

function merge(sec: Map<number, SecAnnual>, yahoo: Map<number, RawAnnual>, prices: PriceHistory | null) {
  const years = new Set([...sec.keys(), ...yahoo.keys()]);
  const merged = new Map<number, RawAnnual & { source: string }>();

  for (const year of years) {
    const s = sec.get(year);
    const y = yahoo.get(year);
    let row: RawAnnual;

    if (s) {
      // SEC-Werte sind wie berichtet; Je-Aktie-Werte auf heutige Splits umrechnen
      const f = splitFactorAfter(prices, s.filed);
      row = {
        ...s,
        eps: s.eps != null ? s.eps / f : undefined,
        dividendPerShare: s.dividendPerShare != null ? s.dividendPerShare / f : undefined,
        shares: s.shares != null ? s.shares * f : undefined,
      };
      // Lücken mit Yahoo füllen, solange die Währung passt
      if (y && y.currency === row.currency) {
        for (const [k, v] of Object.entries(y) as Array<[keyof RawAnnual, unknown]>) {
          if (row[k] == null && v != null) (row[k] as unknown) = v;
        }
      }
    } else {
      row = { ...y! };
    }
    merged.set(year, { ...row, source: s && y ? 'sec+yahoo' : s ? 'sec' : 'yahoo' });
  }
  return merged;
}

// Yahoo beschriftet einzelne Jahre mit falscher Währung (Tomra 2022 "NOK", Werte aber in EUR).
// Passt der Umsatz ohne Umrechnung besser zum Nachbarjahr als mit, ist nur die Beschriftung falsch.
async function fixCurrencyLabels(merged: Map<number, RawAnnual>, session: YahooSession) {
  const counts = new Map<string, number>();
  for (const r of merged.values()) counts.set(r.currency, (counts.get(r.currency) ?? 0) + 1);
  if (counts.size < 2) return;
  const main = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  const years = [...merged.keys()].sort((a, b) => a - b);

  for (const year of years) {
    const row = merged.get(year)!;
    if (row.currency === main || !row.revenue) continue;
    const near = years
      .filter((y) => merged.get(y)!.currency === main && merged.get(y)!.revenue)
      .sort((a, b) => Math.abs(a - year) - Math.abs(b - year))[0];
    if (near == null) continue;
    const fx = await fetchYahooPrices(`${row.currency}${main}=X`, session).catch(() => null);
    const rate = fx?.monthlyClose.get(closingMonth(row.fiscalYearEnd));
    if (rate == null) continue;
    const ratio = row.revenue / merged.get(near)!.revenue!;
    if (Math.abs(Math.log(ratio)) < Math.abs(Math.log(ratio * rate))) row.currency = main;
  }
}

// symbol: Schlüssel in der Datenbank, fetchSymbol: Yahoo-Kürzel (meist gleich)
export async function buildFundamentals(
  symbol: string,
  session: YahooSession,
  fetchSymbol = symbol
): Promise<StockFundamentals[]> {
  const [sec, yahoo, prices] = await Promise.all([
    isUsTicker(fetchSymbol) && isSecEnabled() ? fetchSecAnnual(fetchSymbol) : Promise.resolve(new Map<number, SecAnnual>()),
    fetchYahooAnnual(fetchSymbol, session),
    fetchYahooPrices(fetchSymbol, session).catch(() => null),
  ]);

  const merged = merge(sec, yahoo, prices);
  await fixCurrencyLabels(merged, session);

  // Wechselkurse nur laden, wenn Kurs- und Berichtswährung auseinanderfallen
  const fx = new Map<string, Map<string, number> | null>();
  if (prices) {
    for (const currency of new Set([...merged.values()].map((r) => r.currency))) {
      if (currency === quoteCurrency(prices)) continue;
      const pair = `${quoteCurrency(prices)}${currency}=X`;
      fx.set(currency, await fetchYahooPrices(pair, session).then((p) => p.monthlyClose, () => null));
    }
  }
  const years = [...merged.keys()].sort((a, b) => a - b);
  const out: StockFundamentals[] = [];

  for (const [i, year] of years.entries()) {
    const r = merged.get(year)!;
    const prev = i > 0 && years[i - 1] === year - 1 ? merged.get(year - 1) : undefined;
    // Yahoo liefert für manche Titel keine Aktienzahl (Novartis); Gewinn / EPS kommt dem am nächsten
    if (r.shares == null && r.netIncome && r.eps && Math.abs(r.eps) >= 0.05) r.shares = Math.abs(r.netIncome / r.eps);

    const dps = r.dividendPerShare ?? div(r.dividendsPaid, r.shares);
    const bvps = div(r.totalEquity, r.shares);
    const cfps = div(r.operatingCashflow, r.shares);
    const price = prices ? priceInCurrency(prices, closingMonth(r.fiscalYearEnd), r.currency, fx.get(r.currency) ?? null) : undefined;
    const marketCap = price != null && r.shares ? price * r.shares : undefined;
    const enterpriseValue = marketCap != null && r.totalDebt != null ? marketCap + r.totalDebt - (r.cash ?? 0) : undefined;
    const earningsGrowthPct =
      prev?.netIncome && r.netIncome != null ? ((r.netIncome - prev.netIncome) / Math.abs(prev.netIncome)) * 100 : undefined;
    const peRatio = price != null ? div(price, positive(r.eps)) : undefined;

    out.push({
      symbol,
      fiscalYear: year,
      fiscalYearEnd: r.fiscalYearEnd,
      isEstimate: false,
      currency: r.currency,

      eps: r.eps,
      peRatio,
      earningsGrowthPct,
      pegRatio: peRatio != null && earningsGrowthPct != null && earningsGrowthPct > 0 ? peRatio / earningsGrowthPct : undefined,

      dividendPerShare: dps,
      dividendYieldPct: price != null ? pct(dps, price) : undefined,
      payoutRatioPct: pct(dps, positive(r.eps)),

      operatingCashflow: r.operatingCashflow,
      cashflowPerShare: cfps,
      pcfRatio: price != null ? div(price, positive(cfps)) : undefined,
      freeCashflow: r.freeCashflow ?? (r.operatingCashflow != null && r.capex != null ? r.operatingCashflow - r.capex : undefined),

      revenue: r.revenue,
      revenueGrowthPct: prev?.revenue && r.revenue != null ? ((r.revenue - prev.revenue) / Math.abs(prev.revenue)) * 100 : undefined,

      bookValuePerShare: bvps,
      pbRatio: price != null ? div(price, positive(bvps)) : undefined,

      totalAssets: r.totalAssets,
      totalEquity: r.totalEquity,
      totalDebt: r.totalDebt,
      equityRatioPct: pct(r.totalEquity, r.totalAssets),
      debtRatioPct: pct(r.totalDebt, positive(r.totalEquity)),
      accountingStandard: r.source.startsWith('sec') ? 'US-GAAP' : undefined,

      marketCap,
      enterpriseValue,
      marketCapToRevenue: div(marketCap, r.revenue),
      evToEbitda: div(enterpriseValue, positive(r.ebitda)),

      grossMarginPct: pct(r.grossProfit, r.revenue),
      operatingMarginPct: pct(r.operatingIncome, r.revenue),
      netMarginPct: pct(r.netIncome, r.revenue),
      cashflowMarginPct: pct(r.operatingCashflow, r.revenue),
      ebit: r.operatingIncome,
      ebitMarginPct: pct(r.operatingIncome, r.revenue),
      ebitda: r.ebitda,
      ebitdaMarginPct: pct(r.ebitda, r.revenue),
      roePct: pct(r.netIncome, positive(r.totalEquity)),
      roaPct: pct(r.netIncome, r.totalAssets),

      netIncome: r.netIncome,
      sharesOutstanding: r.shares != null ? Math.round(r.shares) : undefined,
      dataSource: r.source,
    });
  }
  return out;
}

// Begrenzung auf die Spaltenbreiten aus Migration 006, damit ein Ausreißer nicht den ganzen Upsert kippt
const fit = (x: number | undefined, intDigits: number, decimals: number) => {
  if (x == null || !Number.isFinite(x)) return null;
  return Math.abs(x) < 10 ** intDigits ? Number(x.toFixed(decimals)) : null;
};

export function toDbRow(f: StockFundamentals) {
  return {
    symbol: f.symbol,
    fiscal_year: f.fiscalYear,
    fiscal_year_end: f.fiscalYearEnd ?? null,
    is_estimate: f.isEstimate,
    currency: f.currency,
    eps: fit(f.eps, 8, 4),
    pe_ratio: fit(f.peRatio, 8, 2),
    earnings_growth_pct: fit(f.earningsGrowthPct, 6, 2),
    peg_ratio: fit(f.pegRatio, 6, 4),
    dividend_per_share: fit(f.dividendPerShare, 6, 4),
    dividend_yield_pct: fit(f.dividendYieldPct, 4, 4),
    payout_ratio_pct: fit(f.payoutRatioPct, 6, 2),
    operating_cashflow: fit(f.operatingCashflow, 16, 2),
    cashflow_per_share: fit(f.cashflowPerShare, 8, 4),
    pcf_ratio: fit(f.pcfRatio, 8, 2),
    free_cashflow: fit(f.freeCashflow, 16, 2),
    revenue: fit(f.revenue, 16, 2),
    revenue_growth_pct: fit(f.revenueGrowthPct, 6, 2),
    book_value_per_share: fit(f.bookValuePerShare, 8, 4),
    pb_ratio: fit(f.pbRatio, 8, 2),
    total_assets: fit(f.totalAssets, 16, 2),
    total_equity: fit(f.totalEquity, 16, 2),
    total_debt: fit(f.totalDebt, 16, 2),
    equity_ratio_pct: fit(f.equityRatioPct, 6, 2),
    debt_ratio_pct: fit(f.debtRatioPct, 6, 2),
    accounting_standard: f.accountingStandard ?? null,
    market_cap: fit(f.marketCap, 16, 2),
    enterprise_value: fit(f.enterpriseValue, 16, 2),
    market_cap_to_revenue: fit(f.marketCapToRevenue, 6, 4),
    ev_to_ebitda: fit(f.evToEbitda, 8, 2),
    gross_margin_pct: fit(f.grossMarginPct, 6, 2),
    operating_margin_pct: fit(f.operatingMarginPct, 6, 2),
    net_margin_pct: fit(f.netMarginPct, 6, 2),
    cashflow_margin_pct: fit(f.cashflowMarginPct, 6, 2),
    ebit: fit(f.ebit, 16, 2),
    ebit_margin_pct: fit(f.ebitMarginPct, 6, 2),
    ebitda: fit(f.ebitda, 16, 2),
    ebitda_margin_pct: fit(f.ebitdaMarginPct, 6, 2),
    roe_pct: fit(f.roePct, 6, 2),
    roa_pct: fit(f.roaPct, 6, 2),
    net_income: fit(f.netIncome, 16, 2),
    shares_outstanding: f.sharesOutstanding ?? null,
    data_source: f.dataSource ?? null,
  };
}

export async function importFundamentals(
  supabase: SupabaseClient,
  symbol: string,
  session: YahooSession,
  fetchSymbol = symbol
): Promise<{ years: number; first?: number; last?: number; source: string }> {
  const fundamentals = await buildFundamentals(symbol, session, fetchSymbol);
  if (fundamentals.length === 0) return { years: 0, source: '-' };

  const { error } = await supabase
    .from('stock_fundamentals')
    .upsert(fundamentals.map(toDbRow), { onConflict: 'symbol,fiscal_year' });
  if (error) throw new Error(`Supabase: ${error.message}`);

  const sources = [...new Set(fundamentals.map((f) => f.dataSource))].join('/');
  return {
    years: fundamentals.length,
    first: fundamentals[0].fiscalYear,
    last: fundamentals[fundamentals.length - 1].fiscalYear,
    source: sources,
  };
}
