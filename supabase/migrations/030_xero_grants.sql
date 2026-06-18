-- Migration 030: Grant xero RPC execution rights to authenticated users
-- Migration 028 created get_xero_connection_status() but omitted the grant.

REVOKE EXECUTE ON FUNCTION public.get_xero_connection_status() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_xero_connection_status() TO authenticated;
