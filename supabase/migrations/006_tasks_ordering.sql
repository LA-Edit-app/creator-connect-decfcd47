-- Add persistent ordering for tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Backfill sort_order for existing records by creation order
WITH ordered_tasks AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) - 1 AS position
  FROM public.tasks
)
UPDATE public.tasks t
SET sort_order = o.position
FROM ordered_tasks o
WHERE t.id = o.id;

CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON public.tasks(sort_order ASC);
