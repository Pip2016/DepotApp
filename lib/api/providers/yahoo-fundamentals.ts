// Yahoo Finance: Jahresabschlüsse (ca. 4 Jahre) und Monatskurse für alle Börsen.
// Inoffizielle Schnittstelle, braucht Cookie + Crumb, keinen API-Key.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

export interface YahooSession {
  cookie: string;
  crumb: string;
}

export interface RawAnnual {
  fiscalYearEnd: string;
  currency: string;
  revenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  ebitda?: number;
  netIncome?: number;
  eps?: number;
  shares?: number;
  operatingCashflow?: number;
  capex?: number;
  freeCashflow?: number;
  dividendsPaid?: number;
  dividendPerShare?: number;
  totalAssets?: number;
  totalEquity?: number;
  totalDebt?: number;
  cash?: number;
}

export interface PriceHistory {
  currency: string;
  // 'YYYY-MM' -> Schlusskurs des Monats (splitbereinigt, nicht um Abspaltungen bereinigt)
  monthlyClose: Map<string, number>;
  // Echte Splits: Datum (ms) und Faktor (z. B. 3 bei 3:1)
  splits: Array<{ date: number; factor: number }>;
}

const TYPES: Record<string, keyof RawAnnual> = {
  annualTotalRevenue: 'revenue',
  annualGrossProfit: 'grossProfit',
  annualOperatingIncome: 'operatingIncome',
  annualEBITDA: 'ebitda',
  annualNetIncomeCommonStockholders: 'netIncome',
  annualDilutedEPS: 'eps',
  annualDilutedAverageShares: 'shares',
  annualOperatingCashFlow: 'operatingCashflow',
  annualCapitalExpenditure: 'capex',
  annualFreeCashFlow: 'freeCashflow',
  annualCashDividendsPaid: 'dividendsPaid',
  annualTotalAssets: 'totalAssets',
  annualStockholdersEquity: 'totalEquity',
  annualTotalDebt: 'totalDebt',
  annualCashAndCashEquivalents: 'cash',
};

export async function createYahooSession(): Promise<YahooSession> {
  const res = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'manual' });
  const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  if (!cookie) throw new Error('Yahoo: kein Cookie erhalten');

  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Cookie: cookie },
  });
  const crumb = await crumbRes.text();
  if (!crumbRes.ok || !crumb || crumb.includes('<')) {
    throw new Error(`Yahoo: kein Crumb (HTTP ${crumbRes.status})`);
  }
  return { cookie, crumb };
}

async function yahooJson(url: string, session: YahooSession): Promise<unknown> {
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}crumb=${encodeURIComponent(session.crumb)}`, {
    headers: { 'User-Agent': UA, Cookie: session.cookie },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}: ${text.slice(0, 120)}`);
  return JSON.parse(text);
}

interface TimeseriesEntry {
  asOfDate: string;
  currencyCode?: string;
  reportedValue?: { raw?: number };
}

export async function fetchYahooAnnual(symbol: string, session: YahooSession): Promise<Map<number, RawAnnual>> {
  const qs = new URLSearchParams({
    type: Object.keys(TYPES).join(','),
    period1: '0',
    period2: String(Math.floor(Date.now() / 1000)),
  });
  const data = (await yahooJson(
    `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?${qs}`,
    session
  )) as { timeseries?: { result?: Array<Record<string, unknown> & { meta: { type: string[] } }> } };

  const byYear = new Map<number, RawAnnual>();
  for (const series of data.timeseries?.result ?? []) {
    const type = series.meta.type[0];
    const field = TYPES[type];
    if (!field) continue;
    for (const entry of (series[type] as Array<TimeseriesEntry | null>) ?? []) {
      const value = entry?.reportedValue?.raw;
      if (!entry || value == null || !Number.isFinite(value)) continue;
      const year = Number(entry.asOfDate.slice(0, 4));
      const row = byYear.get(year) ?? { fiscalYearEnd: entry.asOfDate, currency: entry.currencyCode ?? 'USD' };
      (row[field] as number) = value;
      byYear.set(year, row);
    }
  }

  // Yahoo meldet Capex und Dividenden negativ
  for (const row of byYear.values()) {
    if (row.capex != null) row.capex = Math.abs(row.capex);
    if (row.dividendsPaid != null) row.dividendsPaid = Math.abs(row.dividendsPaid);
  }
  return byYear;
}

// Echte Splits haben einfache Verhältnisse (2:1, 3:2, 1:25); Abspaltungen krumme (1323:1000)
function isSimpleRatio(numerator: number, denominator: number): boolean {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const g = gcd(Math.round(numerator), Math.round(denominator)) || 1;
  const [p, q] = [Math.round(numerator) / g, Math.round(denominator) / g];
  return Math.min(p, q) === 1 || Math.max(p, q) <= 20;
}

export async function fetchYahooPrices(symbol: string, session: YahooSession): Promise<PriceHistory> {
  const data = (await yahooJson(
    // range=max liefert bei langer Historie Quartals- statt Monatswerte, period1=0 nicht
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=0&period2=${Math.floor(Date.now() / 1000)}&interval=1mo&events=split`,
    session
  )) as {
    chart?: {
      result?: Array<{
        meta: { currency: string; gmtoffset?: number };
        timestamp?: number[];
        indicators: { quote: Array<{ close: Array<number | null> }> };
        events?: { splits?: Record<string, { date: number; numerator: number; denominator: number }> };
      }>;
    };
  };

  const result = data.chart?.result?.[0];
  if (!result) throw new Error('Yahoo: keine Kursdaten');

  const events = Object.values(result.events?.splits ?? {})
    .filter((s) => s.numerator > 0 && s.denominator > 0)
    .map((s) => ({ date: s.date * 1000, factor: s.numerator / s.denominator, simple: isSimpleRatio(s.numerator, s.denominator) }));
  // Yahoo führt auch Abspaltungen als "Split" (3M/Solventum 1196:1000) und bereinigt die Kurse damit,
  // die Je-Aktie-Werte aber nicht. Solche Faktoren werden aus den Kursen wieder herausgerechnet.
  const spinoffs = events.filter((e) => !e.simple);
  const splits = events.filter((e) => e.simple).map(({ date, factor }) => ({ date, factor }));

  const monthlyClose = new Map<string, number>();
  const closes = result.indicators.quote[0]?.close ?? [];
  // Monatsbeginn liegt in Börsen-Ortszeit (für Europa ist das in UTC noch der Vormonat)
  const offset = result.meta.gmtoffset ?? 0;
  (result.timestamp ?? []).forEach((ts, i) => {
    const close = closes[i];
    if (close != null && Number.isFinite(close)) {
      const unadjust = spinoffs.filter((s) => s.date > ts * 1000).reduce((f, s) => f * s.factor, 1);
      monthlyClose.set(new Date((ts + offset) * 1000).toISOString().slice(0, 7), close * unadjust);
    }
  });

  return { currency: result.meta.currency, monthlyClose, splits };
}
