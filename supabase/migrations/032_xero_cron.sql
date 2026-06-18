-- Migration 032: Enable pg_cron and pg_net, then schedule hourly Xero sync

-- Enable extensions (requires superuser; Supabase grants this to the migration role)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule hourly Xero invoice status sync (all agencies)
-- Runs at 7 minutes past each hour to avoid :00 thundering herd
SELECT cron.schedule(
  'xero-invoice-sync-hourly',
  '7 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://khabdorhychqjwhysbvg.supabase.co/functions/v1/xero-sync-campaigns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
