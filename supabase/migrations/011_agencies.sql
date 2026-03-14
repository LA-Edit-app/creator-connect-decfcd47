-- ============================================================
-- Migration 011: Create agencies table and link to profiles
-- This is the foundation for multi-tenancy / data isolation
-- ============================================================

-- 1. Create agencies table
CREATE TABLE IF NOT EXISTS public.agencies (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  owner_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Updated_at trigger for agencies
CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS on agencies (policies added after profiles.agency_id column exists)
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- 2. Add agency_id foreign key to profiles FIRST
--    (must exist before any policy references profiles.agency_id)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON public.profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_agencies_owner_id  ON public.agencies(owner_id);

-- 3. Now safe to create RLS policies that reference profiles.agency_id
-- Users can see their own agency (by their profile's agency_id)
CREATE POLICY "Users can view own agency" ON public.agencies
  FOR SELECT USING (
    id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  );

-- Agency owner can update their agency details
CREATE POLICY "Owner can update own agency" ON public.agencies
  FOR UPDATE USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 4. Helper function: returns current user's agency_id efficiently
--    STABLE + SECURITY DEFINER so RLS policies can call it safely
CREATE OR REPLACE FUNCTION public.current_agency_id()
RETURNS UUID AS $$
  SELECT agency_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5. Trigger: when a new profile row is INSERTed, auto-create an agency
--    and link it back before the row is committed.
--    This fires on first profile save (Settings page upsert for new users).
CREATE OR REPLACE FUNCTION public.handle_new_profile_agency()
RETURNS TRIGGER AS $$
DECLARE
  new_agency_id UUID;
BEGIN
  -- Only create an agency if the profile doesn't already have one
  IF NEW.agency_id IS NULL THEN
    INSERT INTO public.agencies (name, owner_id)
    VALUES (
      COALESCE(NULLIF(TRIM(NEW.agency_name), ''), 'My Agency'),
      NEW.id
    )
    RETURNING id INTO new_agency_id;

    NEW.agency_id := new_agency_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fire BEFORE INSERT so we can modify NEW.agency_id before the row is written
CREATE TRIGGER profiles_agency_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_agency();
