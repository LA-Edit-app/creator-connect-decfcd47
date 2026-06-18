-- Migration 028: Xero connections table (one per agency)
-- RLS is enabled but NO client-role policies are created.
-- UI reads status via get_xero_connection_status() security-definer RPC only.

CREATE TABLE IF NOT EXISTS public.xero_connections (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id      UUID        NOT NULL UNIQUE REFERENCES public.agencies(id) ON DELETE CASCADE,
  tenant_id      TEXT        NOT NULL,
  tenant_name    TEXT        NOT NULL,
  refresh_token  TEXT        NOT NULL,
  connected_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  status         TEXT        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'revoked', 'error')),
  last_synced_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.xero_connections ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_xero_connections_updated_at
  BEFORE UPDATE ON public.xero_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Security-definer RPC: lets authenticated users read their agency's
-- connection status without direct table access.
CREATE OR REPLACE FUNCTION public.get_xero_connection_status()
RETURNS TABLE(tenant_name TEXT, status TEXT, last_synced_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT xc.tenant_name, xc.status, xc.last_synced_at
  FROM public.xero_connections xc
  JOIN public.profiles p ON p.agency_id = xc.agency_id
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;
