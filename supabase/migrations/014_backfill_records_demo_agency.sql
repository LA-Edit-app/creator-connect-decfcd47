-- ============================================================
-- Migration 014: Assign pre-existing records to a Demo Agency
-- Creators, campaigns, content_items, and tasks that were
-- created before multi-tenancy was introduced have NULL
-- agency_id. This migration creates a "Demo Agency" and
-- assigns all orphaned records to it.
-- ============================================================

DO $$
DECLARE
  demo_agency_id UUID;
BEGIN
  -- Create (or reuse) the Demo Agency
  INSERT INTO public.agencies (name, owner_id)
  VALUES ('Demo Agency', NULL)
  ON CONFLICT DO NOTHING
  RETURNING id INTO demo_agency_id;

  -- If it already existed (conflict), look it up
  IF demo_agency_id IS NULL THEN
    SELECT id INTO demo_agency_id
    FROM   public.agencies
    WHERE  name = 'Demo Agency'
    LIMIT  1;
  END IF;

  -- Assign all orphaned creators
  UPDATE public.creators
  SET    agency_id = demo_agency_id
  WHERE  agency_id IS NULL;

  -- Assign all orphaned campaigns
  UPDATE public.campaigns
  SET    agency_id = demo_agency_id
  WHERE  agency_id IS NULL;

  -- Assign all orphaned content_items
  UPDATE public.content_items
  SET    agency_id = demo_agency_id
  WHERE  agency_id IS NULL;

  -- Assign all orphaned tasks
  UPDATE public.tasks
  SET    agency_id = demo_agency_id
  WHERE  agency_id IS NULL;

END;
$$;
