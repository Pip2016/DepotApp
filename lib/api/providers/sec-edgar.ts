// SEC EDGAR (XBRL companyfacts): Jahreszahlen aus 10-K-Berichten US-gelisteter Firmen, ab ca. 2009.
// Kostenlos und offiziell. Die SEC verlangt einen User-Agent mit Kontakt-E-Mail
// (https://www.sec.gov/os/accessing-edgar-data), deshalb nur aktiv, wenn SEC_USER_AGENT gesetzt ist.

import type { RawAnnual } from './yahoo-fundamentals';

export interface SecAnnual extends RawAnnual {
  // Einreichungsdatum der Werte; spätere Splits müssen noch herausgerechnet werden
  filed: string;
}

interface Fact {
  start?: string;
  end: string;
  val: number;
  form: string;
  filed: string;
}

type Facts = Record<string, { units: Record<string, Fact[]> }>;

// Je Feld mehrere XBRL-Tags, weil Firmen über die Jahre unterschiedliche verwenden
const FLOW_TAGS: Partial<Record<keyof RawAnnual, string[]>> = {
  revenue: [
    'Revenues',
    'RevenueFromContractWithCustomerExcludingAssessedTax',
    'RevenueFromContractWithCustomerIncludingAssessedTax',
    'SalesRevenueNet',
  ],
  grossProfit: ['GrossProfit'],
  operatingIncome: ['OperatingIncomeLoss'],
  netIncome: ['NetIncomeLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic', 'ProfitLoss'],
  eps: ['EarningsPerShareDiluted', 'EarningsPerShareBasicAndDiluted', 'EarningsPerShareBasic'],
  shares: ['WeightedAverageNumberOfDilutedSharesOutstanding', 'WeightedAverageNumberOfShareOutstandingBasicAndDiluted'],
  operatingCashflow: [
    'NetCashProvidedByUsedInOperatingActivities',
    'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations',
  ],
  capex: ['PaymentsToAcquirePropertyPlantAndEquipment', 'PaymentsToAcquireProductiveAssets'],
  dividendsPaid: ['PaymentsOfDividendsCommonStock', 'PaymentsOfDividends'],
  dividendPerShare: ['CommonStockDividendsPerShareDeclared', 'CommonStockDividendsPerShareCashPaid'],
};

const INSTANT_TAGS: Partial<Record<keyof RawAnnual, string[]>> = {
  totalAssets: ['Assets'],
  totalEquity: ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],
  cash: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'],
};

const DEPRECIATION_TAGS = [
  'DepreciationDepletionAndAmortization',
  'DepreciationAndAmortization',
  'DepreciationAmortizationAndAccretionNet',
];
const DEBT_TAGS = {
  total: ['LongTermDebt', 'DebtLongtermAndShorttermCombinedAmount'],
  noncurrent: ['LongTermDebtNoncurrent'],
  current: ['LongTermDebtCurrent', 'DebtCurrent'],
  shortTerm: ['ShortTermBorrowings', 'CommercialPaper'],
};

// Ticker, deren SEC-Zuordnung auf eine neue Holding ohne Berichtshistorie zeigt
const CIK_OVERRIDES: Record<string, number> = {
  XOM: 34088, // Exxon Mobil Corp; der Ticker zeigt inzwischen auf ExxonMobil Holdings Corp
};

let tickerMap: Map<string, number> | null = null;

function userAgent(): string | null {
  return process.env.SEC_USER_AGENT || null;
}

export function isSecEnabled(): boolean {
  return !!userAgent();
}

async function secJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { 'User-Agent': userAgent()!, 'Accept-Encoding': 'gzip' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`SEC HTTP ${res.status}`);
  return res.json();
}

async function cikFor(ticker: string): Promise<number | null> {
  const override = CIK_OVERRIDES[ticker.toUpperCase()];
  if (override) return override;
  if (!tickerMap) {
    const data = (await secJson('https://www.sec.gov/files/company_tickers.json')) as Record<
      string,
      { cik_str: number; ticker: string }
    >;
    tickerMap = new Map(Object.values(data ?? {}).map((c) => [c.ticker.toUpperCase(), c.cik_str]));
  }
  return tickerMap.get(ticker.toUpperCase()) ?? null;
}

const days = (start: string, end: string) => (Date.parse(end) - Date.parse(start)) / 86_400_000;

// Werte aus 10-K je Geschäftsjahresende. Der erste Tag mit einem Wert gewinnt,
// innerhalb eines Tags die früheste Einreichung (Originalbericht).
function annualValues(facts: Facts, tags: string[], kind: 'flow' | 'instant'): Map<string, Fact> {
  const byEnd = new Map<string, Fact>();
  for (const tag of tags) {
    const fromTag = new Map<string, Fact>();
    for (const fact of Object.values(facts[tag]?.units ?? {}).flat()) {
      if (fact.form !== '10-K' && fact.form !== '10-K/A') continue;
      if (kind === 'flow') {
        if (!fact.start) continue;
        const d = days(fact.start, fact.end);
        if (d < 350 || d > 380) continue;
      } else if (fact.start) continue;
      const prev = fromTag.get(fact.end);
      if (!prev || fact.filed < prev.filed) fromTag.set(fact.end, fact);
    }
    for (const [end, fact] of fromTag) {
      if (!byEnd.has(end)) byEnd.set(end, fact);
    }
  }
  return byEnd;
}

export async function fetchSecAnnual(ticker: string): Promise<Map<number, SecAnnual>> {
  const byYear = new Map<number, SecAnnual>();
  if (!isSecEnabled()) return byYear;

  const cik = await cikFor(ticker);
  if (!cik) return byYear;

  const data = (await secJson(
    `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, '0')}.json`
  )) as { facts?: { 'us-gaap'?: Facts } } | null;
  const facts = data?.facts?.['us-gaap'];
  if (!facts) return byYear;

  // Geschäftsjahresenden kommen aus den Umsatz- bzw. Gewinnzeilen
  const anchor = annualValues(facts, [...FLOW_TAGS.revenue!, ...FLOW_TAGS.netIncome!], 'flow');
  for (const fact of anchor.values()) {
    const year = Number(fact.end.slice(0, 4));
    if (!byYear.has(year) || byYear.get(year)!.fiscalYearEnd < fact.end) {
      byYear.set(year, { fiscalYearEnd: fact.end, currency: 'USD', filed: fact.filed });
    }
  }

  const assign = (field: keyof RawAnnual, values: Map<string, Fact>) => {
    for (const row of byYear.values()) {
      const fact = values.get(row.fiscalYearEnd);
      if (!fact) continue;
      (row[field] as number) = fact.val;
      // Je-Aktie-Werte gelten zum Einreichungsdatum des EPS-Werts
      if (field === 'eps') row.filed = fact.filed;
    }
  };

  for (const [field, tags] of Object.entries(FLOW_TAGS)) {
    assign(field as keyof RawAnnual, annualValues(facts, tags!, 'flow'));
  }
  for (const [field, tags] of Object.entries(INSTANT_TAGS)) {
    assign(field as keyof RawAnnual, annualValues(facts, tags!, 'instant'));
  }

  const depreciation = annualValues(facts, DEPRECIATION_TAGS, 'flow');
  const debtTotal = annualValues(facts, DEBT_TAGS.total, 'instant');
  const debtNoncurrent = annualValues(facts, DEBT_TAGS.noncurrent, 'instant');
  const debtCurrent = annualValues(facts, DEBT_TAGS.current, 'instant');
  const debtShort = annualValues(facts, DEBT_TAGS.shortTerm, 'instant');

  for (const row of byYear.values()) {
    const end = row.fiscalYearEnd;
    const da = depreciation.get(end)?.val;
    if (row.operatingIncome != null && da != null) row.ebitda = row.operatingIncome + da;
    if (row.operatingCashflow != null && row.capex != null) row.freeCashflow = row.operatingCashflow - row.capex;

    const longTerm = debtTotal.get(end)?.val ??
      (debtNoncurrent.has(end) ? debtNoncurrent.get(end)!.val + (debtCurrent.get(end)?.val ?? 0) : undefined);
    if (longTerm != null) row.totalDebt = longTerm + (debtShort.get(end)?.val ?? 0);
  }

  return byYear;
}
