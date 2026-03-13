-- Seed starter tasks for dashboard
INSERT INTO public.tasks (title, completed)
SELECT 'Review campaign briefs', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.tasks WHERE title = 'Review campaign briefs'
);

INSERT INTO public.tasks (title, completed)
SELECT 'Send creator contracts', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.tasks WHERE title = 'Send creator contracts'
);

INSERT INTO public.tasks (title, completed)
SELECT 'Update analytics report', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.tasks WHERE title = 'Update analytics report'
);

INSERT INTO public.tasks (title, completed)
SELECT 'Schedule content review meeting', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.tasks WHERE title = 'Schedule content review meeting'
);

INSERT INTO public.tasks (title, completed)
SELECT 'Approve influencer posts', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.tasks WHERE title = 'Approve influencer posts'
);
