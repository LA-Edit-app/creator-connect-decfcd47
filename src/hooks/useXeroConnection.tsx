import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type XeroConnectionStatus = {
  tenant_name: string;
  status: "active" | "revoked" | "error";
  last_synced_at: string | null;
} | null;

export const useXeroConnection = () => {
  return useQuery<XeroConnectionStatus>({
    queryKey: ["xero-connection"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_xero_connection_status");
      if (error) throw error;
      return (data?.[0] as XeroConnectionStatus) ?? null;
    },
  });
};

export const useConnectXero = () => {
  const { data: agency } = useQuery({
    queryKey: ["current-agency"],
    queryFn: async () => {
      const { data } = await supabase.rpc("current_agency_id");
      return data as string | null;
    },
  });

  const buildXeroAuthUrl = () => {
    if (!agency) return null;
    const clientId = import.meta.env.VITE_XERO_CLIENT_ID as string;
    const redirectUri = `${window.location.origin}/xero/callback`;
    const scope =
      "openid offline_access accounting.invoices.read accounting.contacts.read";
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state: agency,
    });
    return `https://login.xero.com/identity/connect/authorize?${params}`;
  };

  return { buildXeroAuthUrl, agencyId: agency };
};

export const useDisconnectXero = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: agencyId } = await supabase.rpc("current_agency_id");
      if (!agencyId) throw new Error("No agency found");
      const { error } = await supabase
        .from("xero_connections")
        .delete()
        .eq("agency_id", agencyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["xero-connection"] });
    },
  });
};
