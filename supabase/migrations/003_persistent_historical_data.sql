-- ============================================
-- PERMANENTE HISTORISCHE DATEN
-- Diese Tabellen werden NIEMALS automatisch gelöscht!
-- ============================================

-- ============================================
-- STOCK METADATA
-- Stammdaten zu Aktien/ETFs
-- ============================================
CREATE TABLE IF NOT EXISTS stock_metadata (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Identifikation
  symbol TEXT UNIQUE NOT NULL,
  isin TEXT,
  wkn TEXT,

  -- Basis-Infos
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('stock', 'etf', 'fund', 'crypto', 'other')) DEFAULT 'stock',
  currency TEXT DEFAULT 'EUR',
  exchange TEXT,  -- z.B. 'XETRA', 'NYSE', 'NASDAQ'
  country TEXT,   -- z.B. 'DE', 'US'
  sector TEXT,
  industry TEXT,

  -- Data Source Info
  yahoo_symbol TEXT,   -- z.B. 'SAP.DE' für Yahoo
  stooq_symbol TEXT,   -- z.B. 'SAP.DE' für Stooq
  finnhub_symbol TEXT, -- z.B. 'SAP.DE' für Finnhub

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_updated TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_metadata_symbol ON stock_metadata(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_metadata_isin ON stock_metadata(isin);
CREATE INDEX IF NOT EXISTS idx_stock_metadata_active ON stock_metadata(is_active);

-- ============================================
-- STOCK HISTORICAL
-- Tägliche Kursdaten - PERMANENT!
-- ============================================
CREATE TABLE IF NOT EXISTS stock_historical (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  symbol TEXT NOT NULL,
  date DATE NOT NULL,

  -- OHLCV Daten
  open DECIMAL(18, 6),
  high DECIMAL(18, 6),
  low DECIMAL(18, 6),
  close DECIMAL(18, 6) NOT NULL,
  adjusted_close DECIMAL(18, 6), -- Bereinigt um Splits/Dividenden
  volume BIGINT,

  -- Quelle der Daten
  source TEXT CHECK (source IN ('yahoo_csv', 'stooq_csv', 'finnhub_api', 'yahoo_api', 'manual')) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ein Eintrag pro Symbol + Datum
  UNIQUE(symbol, date)
);

-- Wichtige Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_stock_historical_symbol ON stock_historical(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_historical_date ON stock_historical(date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_historical_symbol_date ON stock_historical(symbol, date DESC);

-- ============================================
-- STOCK FUNDAMENTALS (Permanent)
-- Unternehmensdaten - werden aktualisiert, nicht gelöscht
-- ============================================
CREATE TABLE IF NOT EXISTS stock_fundamentals_permanent (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  symbol TEXT UNIQUE NOT NULL,

  -- Bewertung
  market_cap BIGINT,
  pe_ratio DECIMAL(10, 2),
  forward_pe DECIMAL(10, 2),
  peg_ratio DECIMAL(10, 2),
  price_to_book DECIMAL(10, 2),
  price_to_sales DECIMAL(10, 2),

  -- Dividende
  dividend_yield DECIMAL(8, 4),
  dividend_rate DECIMAL(10, 2),
  payout_ratio DECIMAL(8, 4),
  ex_dividend_date DATE,

  -- Profitabilität
  profit_margin DECIMAL(8, 4),
  operating_margin DECIMAL(8, 4),
  return_on_equity DECIMAL(8, 4),
  return_on_assets DECIMAL(8, 4),

  -- Wachstum
  revenue_growth DECIMAL(8, 4),
  earnings_growth DECIMAL(8, 4),

  -- Sonstiges
  beta DECIMAL(6, 3),
  fifty_two_week_high DECIMAL(18, 6),
  fifty_two_week_low DECIMAL(18, 6),
  fifty_day_average DECIMAL(18, 6),
  two_hundred_day_average DECIMAL(18, 6),
  average_volume BIGINT,

  -- EPS
  eps_trailing DECIMAL(10, 2),
  eps_forward DECIMAL(10, 2),

  -- Meta
  source TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_fundamentals_permanent_symbol ON stock_fundamentals_permanent(symbol);

-- ============================================
-- DATA IMPORT LOG
-- Protokolliert alle Imports
-- ============================================
CREATE TABLE IF NOT EXISTS data_import_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  import_type TEXT CHECK (import_type IN ('csv_yahoo', 'csv_stooq', 'csv_manual', 'api_bulk', 'api_daily')) NOT NULL,

  -- Was wurde importiert
  symbols TEXT[], -- Array der importierten Symbole
  symbol_count INT,
  records_imported INT,
  records_skipped INT,
  records_failed INT,

  -- Zeitraum der Daten
  date_from DATE,
  date_to DATE,

  -- Status
  status TEXT CHECK (status IN ('started', 'completed', 'failed', 'partial')) DEFAULT 'started',
  error_message TEXT,

  -- Wer/Was hat importiert
  triggered_by TEXT, -- 'user', 'cron', 'system'
  user_id UUID,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- CRON JOB TRACKING
-- Für tägliche Updates
-- ============================================
CREATE TABLE IF NOT EXISTS cron_job_runs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  job_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('started', 'completed', 'failed')) DEFAULT 'started',

  symbols_processed INT DEFAULT 0,
  symbols_failed INT DEFAULT 0,
  error_messages JSONB,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Historical Data: Öffentlich lesbar
ALTER TABLE stock_historical ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Historical data is publicly readable" ON stock_historical;
CREATE POLICY "Historical data is publicly readable"
  ON stock_historical FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert historical data" ON stock_historical;
CREATE POLICY "Authenticated users can insert historical data"
  ON stock_historical FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update historical data" ON stock_historical;
CREATE POLICY "Authenticated users can update historical data"
  ON stock_historical FOR UPDATE USING (true);

-- Metadata: Öffentlich lesbar
ALTER TABLE stock_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Metadata is publicly readable" ON stock_metadata;
CREATE POLICY "Metadata is publicly readable"
  ON stock_metadata FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage metadata" ON stock_metadata;
CREATE POLICY "Authenticated users can manage metadata"
  ON stock_metadata FOR ALL USING (true);

-- Fundamentals: Öffentlich lesbar
ALTER TABLE stock_fundamentals_permanent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Fundamentals are publicly readable" ON stock_fundamentals_permanent;
CREATE POLICY "Fundamentals are publicly readable"
  ON stock_fundamentals_permanent FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage fundamentals" ON stock_fundamentals_permanent;
CREATE POLICY "Authenticated users can manage fundamentals"
  ON stock_fundamentals_permanent FOR ALL USING (true);

-- Import Log: Öffentlich lesbar
ALTER TABLE data_import_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Import logs are publicly readable" ON data_import_log;
CREATE POLICY "Import logs are publicly readable"
  ON data_import_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create import logs" ON data_import_log;
CREATE POLICY "Anyone can create import logs"
  ON data_import_log FOR INSERT WITH CHECK (true);

-- Cron Job Runs: Öffentlich lesbar
ALTER TABLE cron_job_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cron logs are publicly readable" ON cron_job_runs;
CREATE POLICY "Cron logs are publicly readable"
  ON cron_job_runs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create cron logs" ON cron_job_runs;
CREATE POLICY "Anyone can create cron logs"
  ON cron_job_runs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update cron logs" ON cron_job_runs;
CREATE POLICY "Anyone can update cron logs"
  ON cron_job_runs FOR UPDATE USING (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Funktion: Letztes Datum für ein Symbol
CREATE OR REPLACE FUNCTION get_last_historical_date(p_symbol TEXT)
RETURNS DATE AS $$
BEGIN
  RETURN (
    SELECT MAX(date)
    FROM stock_historical
    WHERE symbol = UPPER(p_symbol)
  );
END;
$$ LANGUAGE plpgsql;

-- Funktion: Fehlende Tage seit letztem Update
CREATE OR REPLACE FUNCTION get_missing_days(p_symbol TEXT)
RETURNS INT AS $$
DECLARE
  last_date DATE;
BEGIN
  last_date := get_last_historical_date(p_symbol);
  IF last_date IS NULL THEN
    RETURN 365; -- Kein Daten = 1 Jahr laden
  END IF;
  RETURN CURRENT_DATE - last_date;
END;
$$ LANGUAGE plpgsql;

-- Funktion: Alle Symbole die Updates brauchen
CREATE OR REPLACE FUNCTION get_symbols_needing_update(p_max_age_days INT DEFAULT 1)
RETURNS TABLE(symbol TEXT, last_date DATE, days_old INT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.symbol,
    get_last_historical_date(m.symbol) as last_date,
    get_missing_days(m.symbol) as days_old
  FROM stock_metadata m
  WHERE m.is_active = true
    AND get_missing_days(m.symbol) > p_max_age_days
  ORDER BY days_old DESC;
END;
$$ LANGUAGE plpgsql;
