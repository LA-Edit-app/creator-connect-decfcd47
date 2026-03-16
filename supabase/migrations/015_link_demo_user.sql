-- ============================================================
-- Migration 015: Link demo auth user to Demo Agency
-- The auth user eda1e373-1e5a-4689-bbda-188ea63ce7ae was
-- created for demo@email.com. The profile trigger auto-created
-- a blank "My Agency" for them. This migration:
--   1. Deletes the auto-created empty agency
--   2. Links the demo user's profile to the Demo Agency
--   3. Sets the demo user as the Demo Agency owner
-- ============================================================

DO $$
DECLARE
  demo_user_id    UUID := 'eda1e373-1e5a-4689-bbda-188ea63ce7ae';
  demo_agency_id  UUID;
  auto_agency_id  UUID;
BEGIN
  -- Get the Demo Agency id
  SELECT id INTO demo_agency_id
  FROM   public.agencies
  WHERE  name = 'Demo Agency'
  LIMIT  1;

  -- Get the auto-created agency that the trigger made for the demo user
  SELECT agency_id INTO auto_agency_id
  FROM   public.profiles
  WHERE  id = demo_user_id;

  -- Point the demo user's profile at the Demo Agency
  UPDATE public.profiles
  SET    agency_id  = demo_agency_id,
         first_name = 'Demo',
         last_name  = 'User'
  WHERE  id = demo_user_id;

  -- Remove the now-unused auto-created agency (if different from Demo Agency)
  IF auto_agency_id IS NOT NULL AND auto_agency_id <> demo_agency_id THEN
    DELETE FROM public.agencies WHERE id = auto_agency_id;
  END IF;

  -- Make the demo user the owner of the Demo Agency
  UPDATE public.agencies
  SET    owner_id = demo_user_id
  WHERE  id = demo_agency_id;

END;
$$;
