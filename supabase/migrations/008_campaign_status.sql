-- Add explicit campaign status for tracker workflow
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS campaign_status TEXT;

UPDATE public.campaigns
SET campaign_status = CASE
  WHEN complete = TRUE OR completion_status = 'complete' THEN 'completed'
  WHEN live_date IS NOT NULL AND BTRIM(live_date) <> '' THEN 'active'
  ELSE 'pending'
END
WHERE campaign_status IS NULL;

ALTER TABLE public.campaigns
ALTER COLUMN campaign_status SET DEFAULT 'pending';

ALTER TABLE public.campaigns
ALTER COLUMN campaign_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaigns_campaign_status_check'
  ) THEN
    ALTER TABLE public.campaigns
    ADD CONSTRAINT campaigns_campaign_status_check
    CHECK (campaign_status IN ('pending', 'active', 'completed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_status
ON public.campaigns (campaign_status);
