/**
 * Financial Modeling Prep (FMP) Provider
 * Spezialisiert auf historische fundamentale Kennzahlen
 *
 * Free Tier: 250 API calls/Tag
 * Docs: https://site.financialmodelingprep.com/developer/docs
 */

import type {
  StockFundamentals,
  FMPIncomeStatement,
  FMPBalanceSheet,
  FMPCashflowStatement,
  FMPKeyMetrics,
  FMPRatios,
} from '@/types/fundamentals';

export interface FMPRateLimitError extends Error {
  isRateLimit: boolean;
  retryAfter?: number;
}

export class FMPProvider {
  name = 'FMP';
  private apiKey: string;
  private baseUrl = 'https://financialmodelingprep.com/api/v3';

  constructor() {
    this.apiKey = process.env.FMP_API_KEY || '';
  }

  private async fetchWithRateLimit<T>(endpoint: string): Promise<T> {
    if (!this.apiKey) {
      throw new Error('FMP API key not configured. Set FMP_API_KEY in .env');
    }

    const url = `${this.baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      // Rate Limit Check
      if (response.status === 429) {
        const error = new Error('FMP rate limit reached (250 calls/day)') as FMPRateLimitError;
        error.isRateLimit = true;
        error.retryAfter = 86400; // 24 Stunden
        throw error;
      }

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // FMP gibt bei Limit auch manchmal eine Error-Message zurück
      if (data['Error Message']?.includes('limit')) {
        const error = new Error('FMP rate limit reached') as FMPRateLimitError;
        error.isRateLimit = true;
        throw error;
      }

      return data;
    } catch (err) {
      // Re-throw rate limit errors
      if ((err as FMPRateLimitError).isRateLimit) {
        throw err;
      }
      throw new Error(`FMP fetch failed: ${(err as Error).message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await fetch(
        `${this.baseUrl}/quote/AAPL?apikey=${this.apiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Holt alle fundamentalen Daten für ein Symbol
   * Macht 4 API-Calls: Income Statement, Balance Sheet, Cashflow, Key Metrics
   */
  async getHistoricalFundamentals(
    symbol: string,
    years: number = 10
  ): Promise<StockFundamentals[]> {
    // Parallele API-Calls für bessere Performance
    const [incomeStatements, balanceSheets, cashflows, keyMetrics, ratios] =
      await Promise.all([
        this.fetchWithRateLimit<FMPIncomeStatement[]>(
          `/income-statement/${encodeURIComponent(symbol)}?limit=${years}`
        ),
        this.fetchWithRateLimit<FMPBalanceSheet[]>(
          `/balance-sheet-statement/${encodeURIComponent(symbol)}?limit=${years}`
        ),
        this.fetchWithRateLimit<FMPCashflowStatement[]>(
          `/cash-flow-statement/${encodeURIComponent(symbol)}?limit=${years}`
        ),
        this.fetchWithRateLimit<FMPKeyMetrics[]>(
          `/key-metrics/${encodeURIComponent(symbol)}?limit=${years}`
        ),
        this.fetchWithRateLimit<FMPRatios[]>(
          `/ratios/${encodeURIComponent(symbol)}?limit=${years}`
        ),
      ]);

    // Kombiniere alle Daten nach Jahr
    const fundamentalsByYear = new Map<number, StockFundamentals>();

    // Income Statement Daten
    for (const income of incomeStatements || []) {
      const year = parseInt(income.calendarYear);
      if (isNaN(year)) continue;

      const existing = fundamentalsByYear.get(year) || this.createEmpty(symbol, year);

      existing.currency = income.reportedCurrency || 'USD';
      existing.fiscalYearEnd = income.date;
      existing.revenue = income.revenue;
      existing.grossMarginPct = income.grossProfitRatio ? income.grossProfitRatio * 100 : undefined;
      existing.operatingMarginPct = income.operatingIncomeRatio ? income.operatingIncomeRatio * 100 : undefined;
      existing.netMarginPct = income.netIncomeRatio ? income.netIncomeRatio * 100 : undefined;
      existing.ebitda = income.ebitda;
      existing.ebitdaMarginPct = income.ebitdaratio ? income.ebitdaratio * 100 : undefined;
      existing.netIncome = income.netIncome;
      existing.eps = income.epsdiluted || income.eps;
      existing.sharesOutstanding = income.weightedAverageShsOutDil || income.weightedAverageShsOut;

      fundamentalsByYear.set(year, existing);
    }

    // Balance Sheet Daten
    for (const balance of balanceSheets || []) {
      const year = parseInt(balance.calendarYear);
      if (isNaN(year)) continue;

      const existing = fundamentalsByYear.get(year) || this.createEmpty(symbol, year);

      existing.totalAssets = balance.totalAssets;
      existing.totalEquity = balance.totalStockholdersEquity || balance.totalEquity;
      existing.totalDebt = balance.totalDebt;

      // Berechne Kennzahlen
      if (balance.totalAssets && balance.totalStockholdersEquity) {
        existing.equityRatioPct = (balance.totalStockholdersEquity / balance.totalAssets) * 100;
      }
      if (balance.totalDebt && balance.totalStockholdersEquity) {
        existing.debtRatioPct = (balance.totalDebt / balance.totalStockholdersEquity) * 100;
      }

      fundamentalsByYear.set(year, existing);
    }

    // Cashflow Daten
    for (const cf of cashflows || []) {
      const year = parseInt(cf.calendarYear);
      if (isNaN(year)) continue;

      const existing = fundamentalsByYear.get(year) || this.createEmpty(symbol, year);

      existing.operatingCashflow = cf.operatingCashFlow;
      existing.freeCashflow = cf.freeCashFlow;
      existing.dividendPerShare = cf.dividendsPaid
        ? Math.abs(cf.dividendsPaid) / (existing.sharesOutstanding || 1)
        : undefined;

      // Cashflow-Marge
      if (cf.operatingCashFlow && existing.revenue) {
        existing.cashflowMarginPct = (cf.operatingCashFlow / existing.revenue) * 100;
      }

      // Cashflow per Share
      if (cf.operatingCashFlow && existing.sharesOutstanding) {
        existing.cashflowPerShare = cf.operatingCashFlow / existing.sharesOutstanding;
      }

      fundamentalsByYear.set(year, existing);
    }

    // Key Metrics Daten
    for (const metrics of keyMetrics || []) {
      const year = parseInt(metrics.calendarYear);
      if (isNaN(year)) continue;

      const existing = fundamentalsByYear.get(year) || this.createEmpty(symbol, year);

      existing.peRatio = metrics.peRatio;
      existing.pbRatio = metrics.pbRatio;
      existing.bookValuePerShare = metrics.bookValuePerShare;
      existing.dividendYieldPct = metrics.dividendYield ? metrics.dividendYield * 100 : undefined;
      existing.payoutRatioPct = metrics.payoutRatio ? metrics.payoutRatio * 100 : undefined;
      existing.enterpriseValue = metrics.enterpriseValue;
      existing.evToEbitda = metrics.enterpriseValueOverEBITDA;
      existing.roePct = metrics.roe ? metrics.roe * 100 : undefined;
      existing.roicPct = metrics.roic ? metrics.roic * 100 : undefined;

      fundamentalsByYear.set(year, existing);
    }

    // Ratios Daten
    for (const ratio of ratios || []) {
      const year = parseInt(ratio.calendarYear);
      if (isNaN(year)) continue;

      const existing = fundamentalsByYear.get(year) || this.createEmpty(symbol, year);

      // Überschreibe nur wenn nicht bereits gesetzt
      if (!existing.roaPct && ratio.returnOnAssets) {
        existing.roaPct = ratio.returnOnAssets * 100;
      }
      if (!existing.roePct && ratio.returnOnEquity) {
        existing.roePct = ratio.returnOnEquity * 100;
      }
      if (!existing.pcfRatio && ratio.priceCashFlowRatio) {
        existing.pcfRatio = ratio.priceCashFlowRatio;
      }
      if (!existing.pegRatio && ratio.priceEarningsToGrowthRatio) {
        existing.pegRatio = ratio.priceEarningsToGrowthRatio;
      }

      fundamentalsByYear.set(year, existing);
    }

    // Berechne Wachstumsraten
    const sortedYears = Array.from(fundamentalsByYear.keys()).sort((a, b) => b - a);

    for (let i = 0; i < sortedYears.length - 1; i++) {
      const currentYear = sortedYears[i];
      const previousYear = sortedYears[i + 1];

      const current = fundamentalsByYear.get(currentYear)!;
      const previous = fundamentalsByYear.get(previousYear)!;

      // Revenue Growth
      if (current.revenue && previous.revenue && previous.revenue !== 0) {
        current.revenueGrowthPct = ((current.revenue - previous.revenue) / Math.abs(previous.revenue)) * 100;
      }

      // Earnings Growth
      if (current.netIncome && previous.netIncome && previous.netIncome !== 0) {
        current.earningsGrowthPct = ((current.netIncome - previous.netIncome) / Math.abs(previous.netIncome)) * 100;
      }
    }

    // Sortiere nach Jahr absteigend und gib zurück
    return Array.from(fundamentalsByYear.values()).sort(
      (a, b) => b.fiscalYear - a.fiscalYear
    );
  }

  private createEmpty(symbol: string, year: number): StockFundamentals {
    return {
      symbol,
      fiscalYear: year,
      isEstimate: false,
      currency: 'USD',
      dataSource: 'fmp',
    };
  }
}

// Singleton Export
export const fmpProvider = new FMPProvider();
