-- Migration 031: Security-definer RPC to disconnect Xero for the caller's agency.
-- Validates that the caller is an owner or admin of their agency before deleting.

CREATE OR REPLACE FUNCTION public.disconnect_xero()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id UUID;
BEGIN
  -- Look up the caller's agency and verify admin/owner role
  SELECT am.agency_id INTO v_agency_id
  FROM public.agency_members am
  WHERE am.user_id = auth.uid()
    AND am.role IN ('owner', 'admin')
  LIMIT 1;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Not authorised: no admin agency membership found';
  END IF;

  DELETE FROM public.xero_connections
  WHERE agency_id = v_agency_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.disconnect_xero() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.disconnect_xero() TO authenticated;
