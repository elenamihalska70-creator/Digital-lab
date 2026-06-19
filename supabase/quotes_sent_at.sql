alter table public.quotes
  add column if not exists sent_at timestamptz;
