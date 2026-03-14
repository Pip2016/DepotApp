// Fundamentale Kennzahlen Typen

export interface StockFundamentals {
  symbol: string;
  fiscalYear: number;
  fiscalYearEnd?: string;
  isEstimate: boolean;
  currency: string;

  // Gewinn
  eps?: number;
  peRatio?: number;
  earningsGrowthPct?: number;
  pegRatio?: number;

  // Dividende
  dividendPerShare?: number;
  dividendYieldPct?: number;
  payoutRatioPct?: number;

  // Cashflow
  operatingCashflow?: number;
  cashflowPerShare?: number;
  pcfRatio?: number;
  freeCashflow?: number;

  // Umsatz
  revenue?: number;
  revenueGrowthPct?: number;
  revenuePerEmployee?: number;
  employeeCount?: number;

  // Buchwert
  bookValuePerShare?: number;
  pbRatio?: number;

  // Bilanz
  totalAssets?: number;
  totalEquity?: number;
  totalDebt?: number;
  equityRatioPct?: number;
  debtRatioPct?: number;
  dynamicDebtRatioPct?: number;
  accountingStandard?: string;

  // Marktkapitalisierung
  marketCap?: number;
  enterpriseValue?: number;
  marketCapToRevenue?: number;
  marketCapToEmployee?: number;
  evToEbitda?: number;

  // Rentabilität
  grossMarginPct?: number;
  operatingMarginPct?: number;
  netMarginPct?: number;
  cashflowMarginPct?: number;
  ebit?: number;
  ebitMarginPct?: number;
  ebitda?: number;
  ebitdaMarginPct?: number;
  roePct?: number;
  roaPct?: number;
  roicPct?: number;

  // Net Income
  netIncome?: number;

  // Shares
  sharesOutstanding?: number;

  // Meta
  dataSource?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Gruppierte Ansicht für UI
export interface FundamentalsCategory {
  name: string;
  nameEn: string;
  metrics: FundamentalsMetric[];
}

export interface FundamentalsMetric {
  key: keyof StockFundamentals;
  label: string;
  labelEn: string;
  tooltip?: string;
  format: 'number' | 'currency' | 'percent' | 'ratio' | 'integer';
  decimals?: number;
  colorCode?: boolean; // Grün für positiv, rot für negativ
}

// API Response
export interface FundamentalsResponse {
  symbol: string;
  currency: string;
  years: StockFundamentals[];
  cached: boolean;
  limitReached?: boolean;
  error?: string;
}

// FMP API Response Types
export interface FMPIncomeStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  calendarYear: string;
  period: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossProfitRatio: number;
  operatingExpenses: number;
  operatingIncome: number;
  operatingIncomeRatio: number;
  ebitda: number;
  ebitdaratio: number;
  netIncome: number;
  netIncomeRatio: number;
  eps: number;
  epsdiluted: number;
  weightedAverageShsOut: number;
  weightedAverageShsOutDil: number;
}

export interface FMPBalanceSheet {
  date: string;
  symbol: string;
  reportedCurrency: string;
  calendarYear: string;
  totalAssets: number;
  totalCurrentAssets: number;
  totalNonCurrentAssets: number;
  totalLiabilities: number;
  totalCurrentLiabilities: number;
  totalNonCurrentLiabilities: number;
  totalEquity: number;
  totalStockholdersEquity: number;
  totalDebt: number;
  netDebt: number;
  cashAndCashEquivalents: number;
  shortTermInvestments: number;
}

export interface FMPCashflowStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  calendarYear: string;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
  dividendsPaid: number;
}

export interface FMPKeyMetrics {
  date: string;
  symbol: string;
  calendarYear: string;
  revenuePerShare: number;
  netIncomePerShare: number;
  operatingCashFlowPerShare: number;
  freeCashFlowPerShare: number;
  cashPerShare: number;
  bookValuePerShare: number;
  peRatio: number;
  priceToSalesRatio: number;
  pbRatio: number;
  evToSales: number;
  enterpriseValueOverEBITDA: number;
  evToOperatingCashFlow: number;
  evToFreeCashFlow: number;
  earningsYield: number;
  freeCashFlowYield: number;
  debtToEquity: number;
  debtToAssets: number;
  enterpriseValue: number;
  payoutRatio: number;
  dividendYield: number;
  roe: number;
  roic: number;
  returnOnTangibleAssets: number;
}

export interface FMPRatios {
  date: string;
  symbol: string;
  calendarYear: string;
  grossProfitMargin: number;
  operatingProfitMargin: number;
  netProfitMargin: number;
  returnOnAssets: number;
  returnOnEquity: number;
  returnOnCapitalEmployed: number;
  debtRatio: number;
  debtEquityRatio: number;
  cashFlowToDebtRatio: number;
  priceEarningsRatio: number;
  priceToBookRatio: number;
  priceToSalesRatio: number;
  priceEarningsToGrowthRatio: number;
  priceCashFlowRatio: number;
  dividendYield: number;
  payoutRatio: number;
}

// Kategorie-Definitionen für UI
export const FUNDAMENTALS_CATEGORIES: FundamentalsCategory[] = [
  {
    name: 'Gewinn',
    nameEn: 'Earnings',
    metrics: [
      { key: 'eps', label: 'Gewinn pro Aktie', labelEn: 'EPS', format: 'currency', decimals: 2 },
      { key: 'peRatio', label: 'KGV', labelEn: 'P/E Ratio', format: 'ratio', decimals: 2, tooltip: 'Kurs-Gewinn-Verhältnis' },
      { key: 'earningsGrowthPct', label: 'Gewinnwachstum', labelEn: 'Earnings Growth', format: 'percent', colorCode: true },
      { key: 'pegRatio', label: 'PEG', labelEn: 'PEG Ratio', format: 'ratio', decimals: 2, tooltip: 'Price/Earnings to Growth' },
    ],
  },
  {
    name: 'Dividende',
    nameEn: 'Dividend',
    metrics: [
      { key: 'dividendPerShare', label: 'Dividende je Aktie', labelEn: 'Dividend/Share', format: 'currency', decimals: 2 },
      { key: 'dividendYieldPct', label: 'Dividendenrendite', labelEn: 'Dividend Yield', format: 'percent', decimals: 2 },
      { key: 'payoutRatioPct', label: 'Ausschüttungsquote', labelEn: 'Payout Ratio', format: 'percent', decimals: 1 },
    ],
  },
  {
    name: 'Cashflow',
    nameEn: 'Cashflow',
    metrics: [
      { key: 'cashflowPerShare', label: 'Cashflow je Aktie', labelEn: 'Cashflow/Share', format: 'currency', decimals: 2 },
      { key: 'pcfRatio', label: 'Kurs-Cashflow-Verhältnis', labelEn: 'P/CF Ratio', format: 'ratio', decimals: 2, tooltip: 'KCV' },
      { key: 'freeCashflow', label: 'Free Cashflow', labelEn: 'Free Cashflow', format: 'currency', decimals: 0 },
    ],
  },
  {
    name: 'Umsatz',
    nameEn: 'Revenue',
    metrics: [
      { key: 'revenue', label: 'Umsatz', labelEn: 'Revenue', format: 'currency', decimals: 0 },
      { key: 'revenueGrowthPct', label: 'Umsatzwachstum', labelEn: 'Revenue Growth', format: 'percent', colorCode: true },
      { key: 'revenuePerEmployee', label: 'Umsatz je Mitarbeiter', labelEn: 'Revenue/Employee', format: 'currency', decimals: 0 },
    ],
  },
  {
    name: 'Buchwert',
    nameEn: 'Book Value',
    metrics: [
      { key: 'bookValuePerShare', label: 'Buchwert je Aktie', labelEn: 'Book Value/Share', format: 'currency', decimals: 2 },
      { key: 'pbRatio', label: 'Kurs-Buch-Verhältnis', labelEn: 'P/B Ratio', format: 'ratio', decimals: 2, tooltip: 'KBV' },
    ],
  },
  {
    name: 'Bilanz',
    nameEn: 'Balance Sheet',
    metrics: [
      { key: 'totalAssets', label: 'Bilanzsumme', labelEn: 'Total Assets', format: 'currency', decimals: 0 },
      { key: 'equityRatioPct', label: 'Eigenkapitalquote', labelEn: 'Equity Ratio', format: 'percent', decimals: 2 },
      { key: 'debtRatioPct', label: 'Verschuldungsgrad', labelEn: 'Debt Ratio', format: 'percent', decimals: 2 },
    ],
  },
  {
    name: 'Marktkapitalisierung',
    nameEn: 'Market Cap',
    metrics: [
      { key: 'marketCap', label: 'Marktkapitalisierung', labelEn: 'Market Cap', format: 'currency', decimals: 0 },
      { key: 'marketCapToRevenue', label: 'MK/Umsatz', labelEn: 'MC/Revenue', format: 'ratio', decimals: 2 },
      { key: 'evToEbitda', label: 'EV/EBITDA', labelEn: 'EV/EBITDA', format: 'ratio', decimals: 2 },
    ],
  },
  {
    name: 'Rentabilität',
    nameEn: 'Profitability',
    metrics: [
      { key: 'grossMarginPct', label: 'Bruttomarge', labelEn: 'Gross Margin', format: 'percent', decimals: 2 },
      { key: 'operatingMarginPct', label: 'Operative Marge', labelEn: 'Operating Margin', format: 'percent', decimals: 2 },
      { key: 'netMarginPct', label: 'Nettomarge', labelEn: 'Net Margin', format: 'percent', decimals: 2 },
      { key: 'ebitdaMarginPct', label: 'EBITDA-Marge', labelEn: 'EBITDA Margin', format: 'percent', decimals: 2 },
      { key: 'roePct', label: 'Eigenkapitalrendite', labelEn: 'ROE', format: 'percent', decimals: 2, tooltip: 'Return on Equity' },
      { key: 'roaPct', label: 'Gesamtkapitalrendite', labelEn: 'ROA', format: 'percent', decimals: 2, tooltip: 'Return on Assets' },
    ],
  },
];
