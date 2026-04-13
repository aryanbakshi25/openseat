-- Stores periodic occupancy readings from Occuspace for trend analysis.
-- Sampled every 30 minutes via /api/cron/sample-occupancy.

CREATE TABLE IF NOT EXISTS occupancy_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_slug text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  occupancy_percent integer NOT NULL,
  count integer,
  day_of_week smallint NOT NULL,  -- 0 = Sunday, 6 = Saturday
  hour_of_day smallint NOT NULL   -- 0–23
);

CREATE INDEX IF NOT EXISTS idx_snapshots_slug_time
  ON occupancy_snapshots(library_slug, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_snapshots_analysis
  ON occupancy_snapshots(library_slug, day_of_week, hour_of_day);
