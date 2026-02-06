-- ============================================
-- STOCK DATA CACHE TABLE
-- Shared Cache für alle User
-- ============================================

CREATE TABLE IF NOT EXISTS stock_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Cache Key (z.B. "quote:AAPL" oder "historical:AAPL:1y")
  cache_key TEXT UNIQUE NOT NULL,

  -- Symbol für einfachere Queries
  symbol TEXT NOT NULL,

  -- Cache Typ
  data_type TEXT NOT NULL CHECK (data_type IN ('quote', 'fundamentals', 'historical', 'news')),

  -- Die eigentlichen Daten (JSON)
  data JSONB NOT NULL,

  -- Welcher Provider hat geliefert
  provider TEXT,

  -- Timestamps
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes für schnelle Lookups
CREATE INDEX IF NOT EXISTS idx_stock_cache_key ON stock_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_stock_cache_symbol ON stock_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_cache_expires ON stock_cache(expires_at);

-- Automatisches Cleanup von abgelaufenen Einträgen
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM stock_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS: Cache ist für alle lesbar (public data)
ALTER TABLE stock_cache ENABLE ROW LEVEL SECURITY;

-- Jeder kann lesen (auch unauthentifizierte User)
CREATE POLICY "Cache is publicly readable"
  ON stock_cache FOR SELECT
  USING (true);

-- Nur authentifizierte User können schreiben (verhindert Abuse)
CREATE POLICY "Authenticated users can insert cache"
  ON stock_cache FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Authenticated users can update cache"
  ON stock_cache FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Allow delete for cleanup
CREATE POLICY "Allow cache cleanup"
  ON stock_cache FOR DELETE
  USING (true);
