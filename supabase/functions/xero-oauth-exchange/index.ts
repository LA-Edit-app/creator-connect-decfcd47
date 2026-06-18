import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const clientId = Deno.env.get("XERO_CLIENT_ID")!;
    const clientSecret = Deno.env.get("XERO_CLIENT_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is an authenticated Briefly user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code, redirectUri, agencyId } = await req.json();
    if (!code || !redirectUri || !agencyId) {
      return new Response(JSON.stringify({ error: "Missing code, redirectUri, or agencyId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Verify user is owner or admin of the given agency
    const { data: membership, error: memberError } = await admin
      .from("agency_members")
      .select("role")
      .eq("agency_id", agencyId)
      .eq("user_id", user.id)
      .in("role", ["owner", "admin"])
      .maybeSingle();

    if (memberError || !membership) {
      return new Response(JSON.stringify({ error: "Forbidden: not an admin of this agency" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Exchange code for tokens
    const auth = btoa(`${clientId}:${clientSecret}`);
    const tokenRes = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    });
    if (!tokenRes.ok) {
      let errorCode = `HTTP ${tokenRes.status}`;
      try {
        const errBody = await tokenRes.json();
        if (errBody.error) errorCode = errBody.error as string;
      } catch {
        // ignore parse errors
      }
      return new Response(JSON.stringify({ error: `Token exchange failed: ${errorCode}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tokens = await tokenRes.json();

    // Fetch connected Xero tenant
    const connectionsRes = await fetch("https://api.xero.com/connections", {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json" },
    });
    const connections = connectionsRes.ok ? await connectionsRes.json() : [];
    const tenant = connections[0];
    if (!tenant) {
      return new Response(JSON.stringify({ error: "No Xero organisation found on this account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert connection (one per agency)
    const { error: upsertError } = await admin.from("xero_connections").upsert({
      agency_id: agencyId,
      tenant_id: tenant.tenantId ?? tenant.id,
      tenant_name: tenant.tenantName ?? tenant.name,
      refresh_token: tokens.refresh_token,
      connected_by: user.id,
      status: "active",
    }, { onConflict: "agency_id" });

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({ success: true, tenantName: tenant.tenantName ?? tenant.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
