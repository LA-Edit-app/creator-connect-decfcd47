-- Allow tasks to optionally relate to one creator OR one campaign
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS related_creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS related_campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_single_relation_check'
  ) THEN
    ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_single_relation_check
    CHECK (
      NOT (related_creator_id IS NOT NULL AND related_campaign_id IS NOT NULL)
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_related_creator_id
ON public.tasks (related_creator_id);

CREATE INDEX IF NOT EXISTS idx_tasks_related_campaign_id
ON public.tasks (related_campaign_id);
