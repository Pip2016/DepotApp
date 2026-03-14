-- Migration: Stock Fundamentals
-- Speichert historische fundamentale Kennzahlen für Aktien

CREATE TABLE IF NOT EXISTS stock_fundamentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fiscal_year_end DATE,
  is_estimate BOOLEAN DEFAULT FALSE,
  currency TEXT DEFAULT 'EUR',

  -- GEWINN
  eps DECIMAL(12,4),                      -- Gewinn pro Aktie (EPS)
  pe_ratio DECIMAL(10,2),                 -- KGV
  earnings_growth_pct DECIMAL(8,2),       -- Gewinnwachstum %
  peg_ratio DECIMAL(10,4),                -- PEG Ratio

  -- DIVIDENDE
  dividend_per_share DECIMAL(10,4),       -- Dividende je Aktie
  dividend_yield_pct DECIMAL(8,4),        -- Dividendenrendite %
  payout_ratio_pct DECIMAL(8,2),          -- Ausschüttungsquote %

  -- CASHFLOW
  operating_cashflow DECIMAL(18,2),       -- Operativer Cashflow
  cashflow_per_share DECIMAL(12,4),       -- Cashflow je Aktie
  pcf_ratio DECIMAL(10,2),                -- Kurs-Cashflow-Verhältnis (KCV)
  free_cashflow DECIMAL(18,2),            -- Free Cashflow

  -- UMSATZ
  revenue DECIMAL(18,2),                  -- Umsatz
  revenue_growth_pct DECIMAL(8,2),        -- Umsatzwachstum %
  revenue_per_employee DECIMAL(14,2),     -- Umsatz je Mitarbeiter
  employee_count INTEGER,                 -- Mitarbeiteranzahl

  -- BUCHWERT
  book_value_per_share DECIMAL(12,4),     -- Buchwert je Aktie
  pb_ratio DECIMAL(10,2),                 -- Kurs-Buch-Verhältnis (KBV)

  -- BILANZ
  total_assets DECIMAL(18,2),             -- Bilanzsumme
  total_equity DECIMAL(18,2),             -- Eigenkapital
  total_debt DECIMAL(18,2),               -- Gesamtverschuldung
  equity_ratio_pct DECIMAL(8,2),          -- Eigenkapitalquote %
  debt_ratio_pct DECIMAL(8,2),            -- Verschuldungsgrad %
  dynamic_debt_ratio_pct DECIMAL(10,2),   -- Dyn. Verschuldungsgrad %
  accounting_standard TEXT,               -- IFRS, US-GAAP, HGB

  -- MARKTKAPITALISIERUNG
  market_cap DECIMAL(18,2),               -- Marktkapitalisierung
  enterprise_value DECIMAL(18,2),         -- Enterprise Value
  market_cap_to_revenue DECIMAL(10,4),    -- MK/Umsatz
  market_cap_to_employee DECIMAL(14,2),   -- MK/Mitarbeiter
  ev_to_ebitda DECIMAL(10,2),             -- EV/EBITDA

  -- RENTABILITÄT
  gross_margin_pct DECIMAL(8,2),          -- Bruttomarge %
  operating_margin_pct DECIMAL(8,2),      -- Operative Marge %
  net_margin_pct DECIMAL(8,2),            -- Nettomarge %
  cashflow_margin_pct DECIMAL(8,2),       -- Cashflow-Marge %
  ebit DECIMAL(18,2),                     -- EBIT
  ebit_margin_pct DECIMAL(8,2),           -- EBIT-Marge %
  ebitda DECIMAL(18,2),                   -- EBITDA
  ebitda_margin_pct DECIMAL(8,2),         -- EBITDA-Marge %
  roe_pct DECIMAL(8,2),                   -- Eigenkapitalrendite (ROE) %
  roa_pct DECIMAL(8,2),                   -- Gesamtkapitalrendite (ROA) %
  roic_pct DECIMAL(8,2),                  -- Return on Invested Capital %

  -- NET INCOME
  net_income DECIMAL(18,2),               -- Nettogewinn

  -- SHARES
  shares_outstanding BIGINT,              -- Ausstehende Aktien

  -- META
  data_source TEXT,                       -- 'fmp', 'yahoo', 'finnhub', 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(symbol, fiscal_year)
);

-- Indexes für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_fundamentals_symbol ON stock_fundamentals(symbol);
CREATE INDEX IF NOT EXISTS idx_fundamentals_year ON stock_fundamentals(fiscal_year DESC);
CREATE INDEX IF NOT EXISTS idx_fundamentals_symbol_year ON stock_fundamentals(symbol, fiscal_year DESC);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_fundamentals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fundamentals_updated_at ON stock_fundamentals;
CREATE TRIGGER trigger_fundamentals_updated_at
  BEFORE UPDATE ON stock_fundamentals
  FOR EACH ROW
  EXECUTE FUNCTION update_fundamentals_updated_at();

-- RLS deaktiviert da öffentliche Daten
ALTER TABLE stock_fundamentals ENABLE ROW LEVEL SECURITY;

-- Policy für öffentlichen Lesezugriff
CREATE POLICY "Fundamentals sind öffentlich lesbar" ON stock_fundamentals
  FOR SELECT USING (true);

-- Policy für authentifizierte Benutzer zum Schreiben (Admin)
CREATE POLICY "Authentifizierte können Fundamentals schreiben" ON stock_fundamentals
  FOR ALL USING (auth.role() = 'authenticated');
