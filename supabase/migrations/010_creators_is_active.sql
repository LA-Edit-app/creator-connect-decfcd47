ALTER TABLE public.creators
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_creators_is_active ON public.creators(is_active);