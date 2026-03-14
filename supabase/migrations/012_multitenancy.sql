-- ============================================================
-- Migration 012: Multi-tenancy — add agency_id + created_by
--   to all entity tables and replace open RLS with agency-
--   scoped policies.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add agency_id + created_by columns to entity tables
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS agency_id   UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by  UUID REFERENCES auth.users(id)      ON DELETE SET NULL;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS agency_id   UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by  UUID REFERENCES auth.users(id)      ON DELETE SET NULL;

ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS agency_id   UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by  UUID REFERENCES auth.users(id)      ON DELETE SET NULL;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS agency_id   UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by  UUID REFERENCES auth.users(id)      ON DELETE SET NULL;

-- ────────────────────────────────────────────────────────────
-- 2. Indexes for query performance
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_creators_agency_id       ON public.creators(agency_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_agency_id      ON public.campaigns(agency_id);
CREATE INDEX IF NOT EXISTS idx_content_items_agency_id  ON public.content_items(agency_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agency_id          ON public.tasks(agency_id);

-- ────────────────────────────────────────────────────────────
-- 3. Trigger function: auto-populate agency_id + created_by
--    on INSERT if the caller didn't pass them explicitly.
--    Acts as a safety net — explicit values always win.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_entity_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.agency_id IS NULL THEN
    NEW.agency_id := public.current_agency_id();
  END IF;
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER creators_set_agency
  BEFORE INSERT ON public.creators
  FOR EACH ROW EXECUTE FUNCTION public.handle_entity_insert();

CREATE TRIGGER campaigns_set_agency
  BEFORE INSERT ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_entity_insert();

CREATE TRIGGER content_items_set_agency
  BEFORE INSERT ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_entity_insert();

CREATE TRIGGER tasks_set_agency
  BEFORE INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_entity_insert();

-- ────────────────────────────────────────────────────────────
-- 4. Replace wide-open RLS policies with agency-scoped ones
-- ────────────────────────────────────────────────────────────

-- ── creators ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow read access to all authenticated users"  ON public.creators;
DROP POLICY IF EXISTS "Allow insert for authenticated users"          ON public.creators;
DROP POLICY IF EXISTS "Allow update for authenticated users"          ON public.creators;
DROP POLICY IF EXISTS "Allow delete for authenticated users"          ON public.creators;
DROP POLICY IF EXISTS "Allow all operations for local dev"            ON public.creators;
DROP POLICY IF EXISTS "Allow all operations for authenticated users"  ON public.creators;

CREATE POLICY "Agency isolation on creators" ON public.creators
  FOR ALL
  USING     (agency_id = public.current_agency_id())
  WITH CHECK (agency_id = public.current_agency_id());

-- ── campaigns ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all operations for authenticated users"  ON public.campaigns;
DROP POLICY IF EXISTS "Allow all operations for local dev"            ON public.campaigns;
DROP POLICY IF EXISTS "Allow read access to all authenticated users"  ON public.campaigns;
DROP POLICY IF EXISTS "Allow insert for authenticated users"          ON public.campaigns;
DROP POLICY IF EXISTS "Allow update for authenticated users"          ON public.campaigns;
DROP POLICY IF EXISTS "Allow delete for authenticated users"          ON public.campaigns;

CREATE POLICY "Agency isolation on campaigns" ON public.campaigns
  FOR ALL
  USING     (agency_id = public.current_agency_id())
  WITH CHECK (agency_id = public.current_agency_id());

-- ── content_items ───────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all operations for authenticated users"  ON public.content_items;
DROP POLICY IF EXISTS "Allow all operations for local dev"            ON public.content_items;
DROP POLICY IF EXISTS "Allow read access to all authenticated users"  ON public.content_items;
DROP POLICY IF EXISTS "Allow insert for authenticated users"          ON public.content_items;
DROP POLICY IF EXISTS "Allow update for authenticated users"          ON public.content_items;
DROP POLICY IF EXISTS "Allow delete for authenticated users"          ON public.content_items;

CREATE POLICY "Agency isolation on content_items" ON public.content_items
  FOR ALL
  USING     (agency_id = public.current_agency_id())
  WITH CHECK (agency_id = public.current_agency_id());

-- ── tasks ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all operations for local dev"            ON public.tasks;
DROP POLICY IF EXISTS "Allow all operations for authenticated users"  ON public.tasks;
DROP POLICY IF EXISTS "Allow read access to all authenticated users"  ON public.tasks;
DROP POLICY IF EXISTS "Allow insert for authenticated users"          ON public.tasks;
DROP POLICY IF EXISTS "Allow update for authenticated users"          ON public.tasks;
DROP POLICY IF EXISTS "Allow delete for authenticated users"          ON public.tasks;

CREATE POLICY "Agency isolation on tasks" ON public.tasks
  FOR ALL
  USING     (agency_id = public.current_agency_id())
  WITH CHECK (agency_id = public.current_agency_id());

-- ── creator_platforms ───────────────────────────────────────
-- No direct agency_id here; derive isolation through parent creator.
DROP POLICY IF EXISTS "Allow all operations for authenticated users"  ON public.creator_platforms;
DROP POLICY IF EXISTS "Allow all operations for local dev"            ON public.creator_platforms;
DROP POLICY IF EXISTS "Allow read access to all authenticated users"  ON public.creator_platforms;
DROP POLICY IF EXISTS "Allow insert for authenticated users"          ON public.creator_platforms;
DROP POLICY IF EXISTS "Allow update for authenticated users"          ON public.creator_platforms;
DROP POLICY IF EXISTS "Allow delete for authenticated users"          ON public.creator_platforms;

CREATE POLICY "Agency isolation on creator_platforms" ON public.creator_platforms
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.creators c
      WHERE  c.id        = creator_id
      AND    c.agency_id = public.current_agency_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creators c
      WHERE  c.id        = creator_id
      AND    c.agency_id = public.current_agency_id()
    )
  );
