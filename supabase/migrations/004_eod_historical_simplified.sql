-- ============================================
-- EOD HISTORICAL DATA SYSTEM (Simplified)
-- Permanente Speicherung - wird NIE gelöscht
-- ============================================

-- ============================================
-- STOCK SYMBOLS (Welche Aktien tracken wir)
-- ============================================

CREATE TABLE IF NOT EXISTS stock_symbols (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  symbol TEXT UNIQUE NOT NULL,        -- z.B. 'AAPL', 'SAP.DE'
  name TEXT,                          -- z.B. 'Apple Inc.'
  currency TEXT DEFAULT 'USD',

  -- Für CSV Downloads
  yahoo_symbol TEXT,                  -- z.B. 'SAP.DE'
  stooq_symbol TEXT,                  -- z.B. 'sap.de'

  is_active BOOLEAN DEFAULT true,     -- Soll täglich updated werden?
  last_updated DATE,                  -- Letztes EOD Datum

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_symbols_active ON stock_symbols(is_active);
CREATE INDEX IF NOT EXISTS idx_symbols_symbol ON stock_symbols(symbol);

-- ============================================
-- RLS Policies für stock_symbols
-- ============================================

ALTER TABLE stock_symbols ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "symbols_read" ON stock_symbols;
CREATE POLICY "symbols_read" ON stock_symbols FOR SELECT USING (true);

DROP POLICY IF EXISTS "symbols_insert" ON stock_symbols;
CREATE POLICY "symbols_insert" ON stock_symbols FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "symbols_update" ON stock_symbols;
CREATE POLICY "symbols_update" ON stock_symbols FOR UPDATE USING (true);

-- ============================================
-- Update source CHECK constraint for stock_historical
-- Add 'api_daily' as valid source
-- ============================================

-- Drop old constraint if exists and recreate
ALTER TABLE stock_historical DROP CONSTRAINT IF EXISTS stock_historical_source_check;
ALTER TABLE stock_historical ADD CONSTRAINT stock_historical_source_check
  CHECK (source IN ('yahoo_csv', 'stooq_csv', 'finnhub_api', 'yahoo_api', 'manual', 'api_daily'));
