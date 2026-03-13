-- Add explicit completion status to campaigns
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS completion_status TEXT;

-- Normalize existing data from boolean complete
UPDATE public.campaigns
SET completion_status = CASE
  WHEN complete = true THEN 'complete'
  ELSE null
END
WHERE completion_status IS NULL;

-- Constrain allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaigns_completion_status_check'
  ) THEN
    ALTER TABLE public.campaigns
    ADD CONSTRAINT campaigns_completion_status_check
    CHECK (completion_status IN ('complete', 'awaiting_details') OR completion_status IS NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_campaigns_completion_status ON public.campaigns(completion_status);
