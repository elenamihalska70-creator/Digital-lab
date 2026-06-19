ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS sent_at timestamptz;
