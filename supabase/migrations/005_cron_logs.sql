-- Cron Job Logs
CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  job_name TEXT NOT NULL DEFAULT 'eod-update',
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),

  -- Statistiken
  symbols_total INT DEFAULT 0,
  symbols_success INT DEFAULT 0,
  symbols_failed INT DEFAULT 0,

  -- Details
  details JSONB, -- Array mit {symbol, success, message}
  error_message TEXT,

  -- Zeitstempel
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Abfragen
CREATE INDEX idx_cron_logs_created ON cron_logs(created_at DESC);

-- RLS
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cron_logs_read" ON cron_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "cron_logs_write" ON cron_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "cron_logs_update" ON cron_logs
  FOR UPDATE USING (true);
