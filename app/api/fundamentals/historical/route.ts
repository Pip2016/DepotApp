import { NextRequest, NextResponse } from 'next/server';
import { fmpProvider, FMPRateLimitError } from '@/lib/api/providers/fmp';
import type { StockFundamentals, FundamentalsResponse } from '@/types/fundamentals';

// Cache TTL: 24 Stunden (historische Daten ändern sich selten)
const CACHE_TTL_HOURS = 24;

// Dynamischer Import für Supabase (optional)
async function getSupabaseClient() {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    return await createClient();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol')?.toUpperCase();
  const forceRefresh = searchParams.get('refresh') === 'true';
  const years = parseInt(searchParams.get('years') || '10');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter required' },
      { status: 400 }
    );
  }

  try {
    const supabase = await getSupabaseClient();

    // 1. Prüfe Cache (außer bei forceRefresh) - nur wenn Supabase verfügbar
    if (supabase && !forceRefresh) {
      try {
        const { data: cached } = await supabase
          .from('stock_fundamentals')
          .select('*')
          .eq('symbol', symbol)
          .order('fiscal_year', { ascending: false })
          .limit(years);

        if (cached && cached.length > 0) {
          const lastUpdated = new Date(cached[0].updated_at);
          const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);

          if (hoursSinceUpdate < CACHE_TTL_HOURS) {
            const response: FundamentalsResponse = {
              symbol,
              currency: cached[0].currency || 'USD',
              years: cached.map(mapDbToFundamentals),
              cached: true,
            };
            return NextResponse.json(response);
          }
        }
      } catch (cacheError) {
        console.warn('[Fundamentals] Cache read failed, fetching fresh data:', cacheError);
      }
    }

    // 2. Lade frische Daten von FMP
    const fundamentals = await fmpProvider.getHistoricalFundamentals(symbol, years);

    if (fundamentals.length === 0) {
      return NextResponse.json({
        symbol,
        currency: 'USD',
        years: [],
        cached: false,
        error: 'No fundamental data found for this symbol',
      } as FundamentalsResponse);
    }

    // 3. Speichere in Datenbank (upsert) - nur wenn Supabase verfügbar
    if (supabase) {
      try {
        for (const f of fundamentals) {
          await supabase.from('stock_fundamentals').upsert(
            {
              symbol: f.symbol,
              fiscal_year: f.fiscalYear,
              fiscal_year_end: f.fiscalYearEnd,
              is_estimate: f.isEstimate,
              currency: f.currency,
              eps: f.eps,
              pe_ratio: f.peRatio,
              earnings_growth_pct: f.earningsGrowthPct,
              peg_ratio: f.pegRatio,
              dividend_per_share: f.dividendPerShare,
              dividend_yield_pct: f.dividendYieldPct,
              payout_ratio_pct: f.payoutRatioPct,
              operating_cashflow: f.operatingCashflow,
              cashflow_per_share: f.cashflowPerShare,
              pcf_ratio: f.pcfRatio,
              free_cashflow: f.freeCashflow,
              revenue: f.revenue,
              revenue_growth_pct: f.revenueGrowthPct,
              revenue_per_employee: f.revenuePerEmployee,
              employee_count: f.employeeCount,
              book_value_per_share: f.bookValuePerShare,
              pb_ratio: f.pbRatio,
              total_assets: f.totalAssets,
              total_equity: f.totalEquity,
              total_debt: f.totalDebt,
              equity_ratio_pct: f.equityRatioPct,
              debt_ratio_pct: f.debtRatioPct,
              dynamic_debt_ratio_pct: f.dynamicDebtRatioPct,
              accounting_standard: f.accountingStandard,
              market_cap: f.marketCap,
              enterprise_value: f.enterpriseValue,
              market_cap_to_revenue: f.marketCapToRevenue,
              market_cap_to_employee: f.marketCapToEmployee,
              ev_to_ebitda: f.evToEbitda,
              gross_margin_pct: f.grossMarginPct,
              operating_margin_pct: f.operatingMarginPct,
              net_margin_pct: f.netMarginPct,
              cashflow_margin_pct: f.cashflowMarginPct,
              ebit: f.ebit,
              ebit_margin_pct: f.ebitMarginPct,
              ebitda: f.ebitda,
              ebitda_margin_pct: f.ebitdaMarginPct,
              roe_pct: f.roePct,
              roa_pct: f.roaPct,
              roic_pct: f.roicPct,
              net_income: f.netIncome,
              shares_outstanding: f.sharesOutstanding,
              data_source: 'fmp',
            },
            { onConflict: 'symbol,fiscal_year' }
          );
        }
      } catch (saveError) {
        console.warn('[Fundamentals] Cache save failed:', saveError);
      }
    }

    const response: FundamentalsResponse = {
      symbol,
      currency: fundamentals[0]?.currency || 'USD',
      years: fundamentals,
      cached: false,
    };

    return NextResponse.json(response);
  } catch (error) {
    // Rate Limit Error handling
    if ((error as FMPRateLimitError).isRateLimit) {
      // Versuche gecachte Daten zurückzugeben
      const supabase = await getSupabaseClient();
      if (supabase) {
        try {
          const { data: cached } = await supabase
            .from('stock_fundamentals')
            .select('*')
            .eq('symbol', symbol)
            .order('fiscal_year', { ascending: false })
            .limit(years);

          if (cached && cached.length > 0) {
            const response: FundamentalsResponse = {
              symbol,
              currency: cached[0].currency || 'USD',
              years: cached.map(mapDbToFundamentals),
              cached: true,
              limitReached: true,
              error: 'API rate limit reached. Showing cached data.',
            };
            return NextResponse.json(response);
          }
        } catch {
          // Cache read failed, continue with error response
        }
      }

      return NextResponse.json(
        {
          symbol,
          currency: 'USD',
          years: [],
          cached: false,
          limitReached: true,
          error: 'API rate limit reached (250 calls/day). No cached data available.',
        } as FundamentalsResponse,
        { status: 429 }
      );
    }

    console.error('[Fundamentals Historical] Error:', error);
    return NextResponse.json(
      {
        symbol,
        currency: 'USD',
        years: [],
        cached: false,
        error: (error as Error).message,
      } as FundamentalsResponse,
      { status: 500 }
    );
  }
}

// Helper: DB Row zu StockFundamentals Mapping
function mapDbToFundamentals(row: Record<string, unknown>): StockFundamentals {
  return {
    symbol: row.symbol as string,
    fiscalYear: row.fiscal_year as number,
    fiscalYearEnd: row.fiscal_year_end as string | undefined,
    isEstimate: row.is_estimate as boolean,
    currency: row.currency as string,
    eps: row.eps as number | undefined,
    peRatio: row.pe_ratio as number | undefined,
    earningsGrowthPct: row.earnings_growth_pct as number | undefined,
    pegRatio: row.peg_ratio as number | undefined,
    dividendPerShare: row.dividend_per_share as number | undefined,
    dividendYieldPct: row.dividend_yield_pct as number | undefined,
    payoutRatioPct: row.payout_ratio_pct as number | undefined,
    operatingCashflow: row.operating_cashflow as number | undefined,
    cashflowPerShare: row.cashflow_per_share as number | undefined,
    pcfRatio: row.pcf_ratio as number | undefined,
    freeCashflow: row.free_cashflow as number | undefined,
    revenue: row.revenue as number | undefined,
    revenueGrowthPct: row.revenue_growth_pct as number | undefined,
    revenuePerEmployee: row.revenue_per_employee as number | undefined,
    employeeCount: row.employee_count as number | undefined,
    bookValuePerShare: row.book_value_per_share as number | undefined,
    pbRatio: row.pb_ratio as number | undefined,
    totalAssets: row.total_assets as number | undefined,
    totalEquity: row.total_equity as number | undefined,
    totalDebt: row.total_debt as number | undefined,
    equityRatioPct: row.equity_ratio_pct as number | undefined,
    debtRatioPct: row.debt_ratio_pct as number | undefined,
    dynamicDebtRatioPct: row.dynamic_debt_ratio_pct as number | undefined,
    accountingStandard: row.accounting_standard as string | undefined,
    marketCap: row.market_cap as number | undefined,
    enterpriseValue: row.enterprise_value as number | undefined,
    marketCapToRevenue: row.market_cap_to_revenue as number | undefined,
    marketCapToEmployee: row.market_cap_to_employee as number | undefined,
    evToEbitda: row.ev_to_ebitda as number | undefined,
    grossMarginPct: row.gross_margin_pct as number | undefined,
    operatingMarginPct: row.operating_margin_pct as number | undefined,
    netMarginPct: row.net_margin_pct as number | undefined,
    cashflowMarginPct: row.cashflow_margin_pct as number | undefined,
    ebit: row.ebit as number | undefined,
    ebitMarginPct: row.ebit_margin_pct as number | undefined,
    ebitda: row.ebitda as number | undefined,
    ebitdaMarginPct: row.ebitda_margin_pct as number | undefined,
    roePct: row.roe_pct as number | undefined,
    roaPct: row.roa_pct as number | undefined,
    roicPct: row.roic_pct as number | undefined,
    netIncome: row.net_income as number | undefined,
    sharesOutstanding: row.shares_outstanding as number | undefined,
    dataSource: row.data_source as string | undefined,
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
  };
}
