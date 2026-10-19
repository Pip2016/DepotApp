-- Depot als Buchungshistorie: Bestände, Einstand (FIFO), realisierte Gewinne und Dividenden
-- werden aus den Buchungen in "activities" berechnet.
-- Im Supabase SQL Editor ausführen.

-- Abspaltung: senkt den Einstand der Mutter auf den Anteil "ratio" (Tochter kommt als 'transfer')
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'spinoff';

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS isin TEXT,
  ADD COLUMN IF NOT EXISTS wkn TEXT,
  -- Einbehaltene Steuern (Dividenden-Quellensteuer, Abgeltungsteuer beim Verkauf)
  ADD COLUMN IF NOT EXISTS tax NUMERIC NOT NULL DEFAULT 0,
  -- split: neue Aktien je alte Aktie; spinoff: Anteil des Einstands, der bei der Mutter bleibt
  ADD COLUMN IF NOT EXISTS ratio NUMERIC,
  -- Kennung der eingebuchten Kapitalmaßnahme, damit sie nicht erneut vorgeschlagen wird
  ADD COLUMN IF NOT EXISTS action_id TEXT;

-- Vorgeschlagene Kapitalmaßnahmen, die der Nutzer als bereits erledigt markiert hat
ALTER TABLE portfolios
  ADD COLUMN IF NOT EXISTS dismissed_actions TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_activities_portfolio_symbol ON activities(portfolio_id, symbol);
