# Xero Invoice Status Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync ACCPAY bill statuses from each agency's Xero account into the Briefly campaign tracker in near-real-time, using OAuth per agency, webhooks for push updates, and an hourly poll as fallback.

**Architecture:** Each agency connects their Xero org via OAuth; tokens are stored in a `xero_connections` table (service-role only). Xero pushes invoice events to a `xero-webhook` edge function that verifies the HMAC signature and writes `invoice_status` to the matched campaign. An hourly cron job via `xero-sync-campaigns` (reworked) heals anything the webhook misses. The tracker renders the status as a read-only coloured badge.

**Tech Stack:** Supabase Edge Functions (Deno), Supabase Postgres, React + TanStack Query, Xero API v2, shadcn/ui Badge, pg_cron + pg_net

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `supabase/migrations/028_xero_connections.sql` | `xero_connections` table + RPC for UI |
| Create | `supabase/migrations/029_campaign_xero_fields.sql` | `invoice_status`, `xero_invoice_id`, `xero_synced_at` on campaigns |
| Create | `supabase/functions/_shared/xeroStatus.ts` | Status mapping + Xero API helpers |
| Create | `supabase/functions/_shared/xeroStatus.test.ts` | Deno unit tests |
| Modify | `supabase/functions/xero-oauth-exchange/index.ts` | Store connection in DB instead of returning tokens |
| Modify | `supabase/functions/xero-sync-campaigns/index.ts` | Per-agency connections, ACCPAY filter, write invoice_status |
| Create | `supabase/functions/xero-webhook/index.ts` | HMAC verification + invoice event processing |
| Create | `src/hooks/useXeroConnection.tsx` | React hook for connection status + connect/disconnect |
| Modify | `src/pages/XeroCallback.tsx` | Show success/error screen instead of dev commands |
| Modify | `src/pages/AgencySettings.tsx` | Add "Connect Xero" section |
| Modify | `src/integrations/supabase/types.ts` | Add new DB columns to Campaign types |
| Modify | `src/pages/CampaignTracker.tsx` | Render `invoice_status` badge column |

---

## Task 1: Database migrations

**Files:**
- Create: `supabase/migrations/028_xero_connections.sql`
- Create: `supabase/migrations/029_campaign_xero_fields.sql`

- [ ] **Step 1: Write migration 028 — xero_connections table**

Create `supabase/migrations/028_xero_connections.sql`:

```sql
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
```

- [ ] **Step 2: Write migration 029 — campaign Xero fields**

Create `supabase/migrations/029_campaign_xero_fields.sql`:

```sql
-- Migration 029: Add Xero invoice sync fields to campaigns

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS invoice_status TEXT
    CHECK (invoice_status IN ('draft', 'pending_review', 'approved', 'paid', 'voided', 'deleted')),
  ADD COLUMN IF NOT EXISTS xero_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS xero_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_campaigns_xero_invoice_id
  ON public.campaigns(xero_invoice_id) WHERE xero_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_invoice_no
  ON public.campaigns(invoice_no) WHERE invoice_no IS NOT NULL;
```

- [ ] **Step 3: Apply migrations to remote project**

```bash
supabase db push
```

Expected: both migrations applied without errors. Verify in Supabase dashboard that `xero_connections` table exists and `campaigns` has the three new columns.

- [ ] **Step 4: Regenerate Supabase types**

```bash
supabase gen types typescript --project-id khabdorhychqjwhysbvg > src/integrations/supabase/types.ts
```

Expected: `src/integrations/supabase/types.ts` now includes `xero_connections` Row/Insert/Update and the three new fields on `campaigns.Row`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/028_xero_connections.sql supabase/migrations/029_campaign_xero_fields.sql src/integrations/supabase/types.ts
git commit -m "feat: add xero_connections table and campaign invoice_status columns"
```

---

## Task 2: Shared Xero module + unit tests

**Files:**
- Create: `supabase/functions/_shared/xeroStatus.ts`
- Create: `supabase/functions/_shared/xeroStatus.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `supabase/functions/_shared/xeroStatus.test.ts`:

```typescript
import { assertEquals, assertStrictEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapXeroStatus, refreshAccessToken, fetchInvoiceById, fetchInvoicesByNumbers } from "./xeroStatus.ts";

Deno.test("mapXeroStatus: maps all six known statuses", () => {
  assertEquals(mapXeroStatus("DRAFT"), "draft");
  assertEquals(mapXeroStatus("SUBMITTED"), "pending_review");
  assertEquals(mapXeroStatus("AUTHORISED"), "approved");
  assertEquals(mapXeroStatus("PAID"), "paid");
  assertEquals(mapXeroStatus("VOIDED"), "voided");
  assertEquals(mapXeroStatus("DELETED"), "deleted");
});

Deno.test("mapXeroStatus: returns null for unknown status", () => {
  assertStrictEquals(mapXeroStatus("BILLED"), null);
  assertStrictEquals(mapXeroStatus(""), null);
  assertStrictEquals(mapXeroStatus("paid"), null); // case-sensitive
});

Deno.test("verifyXeroSignature: accepts valid HMAC-SHA256", async () => {
  // Xero sample values from their docs
  const { verifyXeroSignature } = await import("./xeroStatus.ts");
  const body = '{"events":[]}';
  const key = "testkey";
  // Compute expected sig
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(body));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  assertEquals(await verifyXeroSignature(body, b64, key), true);
});

Deno.test("verifyXeroSignature: rejects tampered body", async () => {
  const { verifyXeroSignature } = await import("./xeroStatus.ts");
  const body = '{"events":[]}';
  const tamperedBody = '{"events":[],"extra":1}';
  const key = "testkey";
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(body));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  assertEquals(await verifyXeroSignature(tamperedBody, b64, key), false);
});
```

- [ ] **Step 2: Run tests to confirm they fail (module not found)**

```bash
cd supabase/functions/_shared && deno test xeroStatus.test.ts 2>&1 | head -20
```

Expected: error like `Cannot resolve module './xeroStatus.ts'`

- [ ] **Step 3: Implement the shared module**

Create `supabase/functions/_shared/xeroStatus.ts`:

```typescript
export type XeroStatus = "DRAFT" | "SUBMITTED" | "AUTHORISED" | "PAID" | "VOIDED" | "DELETED";
export type BrieflyInvoiceStatus = "draft" | "pending_review" | "approved" | "paid" | "voided" | "deleted";

export type XeroInvoice = {
  InvoiceID: string;
  InvoiceNumber?: string;
  Status?: string;
  DueDateString?: string;
  TotalTax?: number;
  AmountDue?: number;
  Payments?: Array<{ Date?: string }>;
};

export type XeroConnection = {
  agency_id: string;
  tenant_id: string;
  refresh_token: string;
};

const STATUS_MAP: Record<XeroStatus, BrieflyInvoiceStatus> = {
  DRAFT: "draft",
  SUBMITTED: "pending_review",
  AUTHORISED: "approved",
  PAID: "paid",
  VOIDED: "voided",
  DELETED: "deleted",
};

export function mapXeroStatus(xeroStatus: string): BrieflyInvoiceStatus | null {
  return STATUS_MAP[xeroStatus as XeroStatus] ?? null;
}

export async function verifyXeroSignature(body: string, signature: string, webhookKey: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(webhookKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
  return crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(body));
}

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ accessToken: string; newRefreshToken: string }> {
  const auth = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Xero token refresh failed: ${text}`);
  }
  const payload = await res.json();
  return {
    accessToken: payload.access_token as string,
    newRefreshToken: (payload.refresh_token ?? refreshToken) as string,
  };
}

export async function fetchInvoiceById(
  accessToken: string,
  tenantId: string,
  invoiceId: string
): Promise<XeroInvoice | null> {
  const res = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${invoiceId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-Tenant-Id": tenantId,
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const payload = await res.json();
  return (payload?.Invoices?.[0] as XeroInvoice) ?? null;
}

// Fetch up to 50 ACCPAY invoices by InvoiceNumber in one API call
export async function fetchInvoicesByNumbers(
  accessToken: string,
  tenantId: string,
  invoiceNumbers: string[]
): Promise<XeroInvoice[]> {
  if (invoiceNumbers.length === 0) return [];
  const where = encodeURIComponent(
    `Type=="ACCPAY"&&InvoiceNumber=="${invoiceNumbers.map((n) => n.replace(/"/g, '\\"')).join('" OR InvoiceNumber=="')}"`
  );
  const res = await fetch(`https://api.xero.com/api.xro/2.0/Invoices?where=${where}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-Tenant-Id": tenantId,
      Accept: "application/json",
    },
  });
  if (!res.ok) return [];
  const payload = await res.json();
  return (payload?.Invoices ?? []) as XeroInvoice[];
}

export function toIsoDate(value?: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("/Date(")) {
    const match = value.match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);
    if (!match) return null;
    const d = new Date(Number(match[1]));
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
cd supabase/functions/_shared && deno test xeroStatus.test.ts --allow-net
```

Expected:
```
running 4 tests from ./xeroStatus.test.ts
mapXeroStatus: maps all six known statuses ... ok
mapXeroStatus: returns null for unknown status ... ok
verifyXeroSignature: accepts valid HMAC-SHA256 ... ok
verifyXeroSignature: rejects tampered body ... ok
ok | 4 passed | 0 failed
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/xeroStatus.ts supabase/functions/_shared/xeroStatus.test.ts
git commit -m "feat: add shared Xero status mapping and API helpers with tests"
```

---

## Task 3: Rework xero-oauth-exchange

Stores the connection in `xero_connections` instead of returning tokens to the browser. Accepts the user's JWT (Supabase auth) and verifies they are an admin/owner of the given agency before storing.

**Files:**
- Modify: `supabase/functions/xero-oauth-exchange/index.ts`

- [ ] **Step 1: Replace the function body**

Overwrite `supabase/functions/xero-oauth-exchange/index.ts`:

```typescript
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
      const text = await tokenRes.text();
      return new Response(JSON.stringify({ error: `Token exchange failed: ${text}` }), {
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
```

- [ ] **Step 2: Deploy**

```bash
supabase functions deploy xero-oauth-exchange
```

Expected: `Deployed Functions on project khabdorhychqjwhysbvg: xero-oauth-exchange`

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/xero-oauth-exchange/index.ts
git commit -m "feat: rework xero-oauth-exchange to store connection in DB"
```

---

## Task 4: useXeroConnection hook + XeroCallback page

**Files:**
- Create: `src/hooks/useXeroConnection.tsx`
- Modify: `src/pages/XeroCallback.tsx`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useXeroConnection.tsx`:

```typescript
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
    const scope = "openid offline_access accounting.invoices.read accounting.contacts.read";
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
```

- [ ] **Step 2: Add VITE_XERO_CLIENT_ID to .env.local**

Add to `.env.local`:
```
VITE_XERO_CLIENT_ID="9B2761987E334A9FA3B88AECF07CB81D"
```

- [ ] **Step 3: Rewrite XeroCallback page**

Replace `src/pages/XeroCallback.tsx` with:

```typescript
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const XeroCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [tenantName, setTenantName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const agencyId = params.get("state");
    const redirectUri = `${window.location.origin}/xero/callback`;

    if (!code || !agencyId) {
      setErrorMessage("Missing authorisation code or state parameter.");
      setStatus("error");
      return;
    }

    const exchange = async () => {
      const { data, error } = await supabase.functions.invoke<{ success: boolean; tenantName: string; error?: string }>(
        "xero-oauth-exchange",
        { body: { code, redirectUri, agencyId } }
      );
      if (error || data?.error) {
        setErrorMessage(error?.message ?? data?.error ?? "Connection failed");
        setStatus("error");
        return;
      }
      setTenantName(data?.tenantName ?? "");
      setStatus("success");
    };

    void exchange();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Connecting to Xero...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <XCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-xl font-semibold">Connection failed</h1>
          <p className="text-muted-foreground">{errorMessage}</p>
          <Button onClick={() => navigate("/settings/agency")}>Back to settings</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <h1 className="text-xl font-semibold">Connected to Xero</h1>
        <p className="text-muted-foreground">
          Successfully connected to <strong>{tenantName}</strong>. Invoice statuses will now sync automatically.
        </p>
        <Button onClick={() => navigate("/settings/agency")}>Go to settings</Button>
      </div>
    </div>
  );
};

export default XeroCallback;
```

- [ ] **Step 4: Verify the app builds**

```bash
npm run build 2>&1 | tail -10
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useXeroConnection.tsx src/pages/XeroCallback.tsx .env.local
git commit -m "feat: add useXeroConnection hook and simplify XeroCallback UI"
```

---

## Task 5: Agency settings — Connect Xero section

**Files:**
- Modify: `src/pages/AgencySettings.tsx`

- [ ] **Step 1: Add the Xero connection section to AgencySettings**

In `src/pages/AgencySettings.tsx`, add the imports at the top of the import block:

```typescript
import { Link2, Link2Off } from "lucide-react";
import { useXeroConnection, useConnectXero, useDisconnectXero } from "@/hooks/useXeroConnection";
```

Then add a `XeroSection` component just before the main `AgencySettings` export (above the `return`):

```typescript
const XeroSection = () => {
  const { data: connection, isLoading } = useXeroConnection();
  const { buildXeroAuthUrl } = useConnectXero();
  const disconnect = useDisconnectXero();

  if (isLoading) return <Skeleton className="h-20 w-full" />;

  if (connection?.status === "active") {
    return (
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <Link2 className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-medium text-sm">Connected to Xero</p>
            <p className="text-xs text-muted-foreground">{connection.tenant_name}</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">Disconnect</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect Xero?</AlertDialogTitle>
              <AlertDialogDescription>
                Invoice status sync will stop. Campaign data already synced is kept.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => disconnect.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (connection?.status === "error") {
    return (
      <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
        <div className="flex items-center gap-3">
          <Link2Off className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-sm">Xero connection error</p>
            <p className="text-xs text-muted-foreground">Re-connect to resume sync</p>
          </div>
        </div>
        <Button size="sm" asChild>
          <a href={buildXeroAuthUrl() ?? "#"}>Reconnect Xero</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <Link2Off className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-medium text-sm">Connect Xero</p>
          <p className="text-xs text-muted-foreground">Sync invoice statuses from your Xero account</p>
        </div>
      </div>
      <Button size="sm" asChild>
        <a href={buildXeroAuthUrl() ?? "#"}>Connect Xero</a>
      </Button>
    </div>
  );
};
```

Then inside the JSX return of `AgencySettings`, add a new section after the Members section:

```tsx
<div className="space-y-4">
  <div>
    <h2 className="text-lg font-semibold">Integrations</h2>
    <p className="text-sm text-muted-foreground">Connect external tools to Briefly</p>
  </div>
  <XeroSection />
</div>
```

- [ ] **Step 2: Verify in browser**

With the dev server running at http://localhost:8083, navigate to agency settings. The Xero section should render with a "Connect Xero" button.

- [ ] **Step 3: Commit**

```bash
git add src/pages/AgencySettings.tsx
git commit -m "feat: add Connect Xero section to agency settings"
```

---

## Task 6: Rework xero-sync-campaigns (per-agency, ACCPAY, invoice_status)

**Files:**
- Modify: `supabase/functions/xero-sync-campaigns/index.ts`

- [ ] **Step 1: Replace the function body**

Overwrite `supabase/functions/xero-sync-campaigns/index.ts`:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  refreshAccessToken,
  fetchInvoicesByNumbers,
  mapXeroStatus,
  toIsoDate,
  type XeroInvoice,
} from "../_shared/xeroStatus.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 50;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("XERO_CLIENT_ID")!;
    const clientSecret = Deno.env.get("XERO_CLIENT_SECRET")!;

    // Verify caller (UI manual sync or cron with service key)
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Accept optional agencyId filter (from UI, scoped to one agency)
    const body = await req.json().catch(() => ({}));
    const agencyIdFilter = body.agencyId as string | undefined;

    // Fetch all active Xero connections (or just the one)
    let connectionQuery = admin
      .from("xero_connections")
      .select("agency_id, tenant_id, refresh_token")
      .eq("status", "active");

    if (agencyIdFilter) {
      connectionQuery = connectionQuery.eq("agency_id", agencyIdFilter);
    } else if (user) {
      // UI caller without agencyId: scope to their agency only
      const { data: profile } = await admin
        .from("profiles")
        .select("agency_id")
        .eq("id", user.id)
        .single();
      if (profile?.agency_id) {
        connectionQuery = connectionQuery.eq("agency_id", profile.agency_id);
      }
    }
    // Cron callers (no user, no agencyId) get all connections

    const { data: connections, error: connError } = await connectionQuery;
    if (connError) throw connError;
    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ synced: 0, skipped: 0, message: "No active Xero connections found." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSynced = 0;
    let totalSkipped = 0;

    for (const conn of connections) {
      // Fetch campaigns with invoice numbers for this agency
      const { data: campaigns, error: campError } = await admin
        .from("campaigns")
        .select("id, invoice_no, xero_invoice_id, paid_date, payment_terms, includes_vat")
        .eq("agency_id", conn.agency_id)
        .not("invoice_no", "is", null)
        .neq("invoice_no", "");

      if (campError || !campaigns || campaigns.length === 0) {
        totalSkipped += campaigns?.length ?? 0;
        continue;
      }

      // Refresh token and persist the new one immediately
      let accessToken: string;
      try {
        const { accessToken: at, newRefreshToken } = await refreshAccessToken(
          clientId,
          clientSecret,
          conn.refresh_token
        );
        accessToken = at;
        await admin
          .from("xero_connections")
          .update({ refresh_token: newRefreshToken, updated_at: new Date().toISOString() })
          .eq("agency_id", conn.agency_id);
      } catch {
        await admin
          .from("xero_connections")
          .update({ status: "error", updated_at: new Date().toISOString() })
          .eq("agency_id", conn.agency_id);
        totalSkipped += campaigns.length;
        continue;
      }

      // Process in batches of BATCH_SIZE
      for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
        const batch = campaigns.slice(i, i + BATCH_SIZE);
        const invoiceNumbers = batch
          .map((c) => (c.invoice_no ?? "").trim())
          .filter(Boolean);

        const invoices = await fetchInvoicesByNumbers(accessToken, conn.tenant_id, invoiceNumbers);
        const invoiceMap = new Map<string, XeroInvoice>(
          invoices.map((inv) => [inv.InvoiceNumber ?? "", inv])
        );

        for (const campaign of batch) {
          const invoiceNo = (campaign.invoice_no ?? "").trim();
          const matching = invoices.filter((inv) => inv.InvoiceNumber === invoiceNo);

          if (matching.length !== 1) {
            // 0 = not in Xero, 2+ = ambiguous number — skip both
            totalSkipped += 1;
            continue;
          }

          const invoice = matching[0];
          const brieflyStatus = mapXeroStatus(invoice.Status ?? "");
          const paymentDates = (invoice.Payments ?? [])
            .map((p) => toIsoDate(p.Date))
            .filter((d): d is string => Boolean(d))
            .sort();

          const updates: Record<string, unknown> = {
            xero_invoice_id: invoice.InvoiceID,
            xero_synced_at: new Date().toISOString(),
            invoice_no: invoice.InvoiceNumber ?? campaign.invoice_no,
            payment_terms: invoice.DueDateString ? `Due ${invoice.DueDateString}` : campaign.payment_terms,
            includes_vat: typeof invoice.TotalTax === "number"
              ? invoice.TotalTax > 0 ? "VAT" : "NO VAT"
              : campaign.includes_vat,
            paid_date: (invoice.AmountDue ?? 0) <= 0 && paymentDates.length > 0
              ? paymentDates[paymentDates.length - 1]
              : campaign.paid_date,
          };

          if (brieflyStatus !== null) {
            updates.invoice_status = brieflyStatus;
          }

          const { error: updateError } = await admin
            .from("campaigns")
            .update(updates)
            .eq("id", campaign.id);

          if (updateError) {
            totalSkipped += 1;
          } else {
            totalSynced += 1;
          }
        }
      }

      await admin
        .from("xero_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("agency_id", conn.agency_id);
    }

    return new Response(
      JSON.stringify({ synced: totalSynced, skipped: totalSkipped }),
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
```

- [ ] **Step 2: Deploy**

```bash
supabase functions deploy xero-sync-campaigns
```

Expected: deployed successfully.

- [ ] **Step 3: Smoke test via curl (use a valid user JWT from the browser)**

Open browser devtools on the running app → Application → Local Storage → find `supabase.auth.token` → copy the `access_token` value. Then:

```bash
ACCESS_TOKEN="<paste here>"
curl -s -X POST \
  "https://khabdorhychqjwhysbvg.supabase.co/functions/v1/xero-sync-campaigns" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool
```

Expected: `{"synced": N, "skipped": M}` (not an error). Exact numbers depend on existing campaigns with `invoice_no`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/xero-sync-campaigns/index.ts
git commit -m "feat: rework xero-sync-campaigns for per-agency connections and invoice_status"
```

---

## Task 7: xero-webhook edge function

**Files:**
- Create: `supabase/functions/xero-webhook/index.ts`

- [ ] **Step 1: Create the function**

Create `supabase/functions/xero-webhook/index.ts`:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  verifyXeroSignature,
  refreshAccessToken,
  fetchInvoiceById,
  mapXeroStatus,
  toIsoDate,
} from "../_shared/xeroStatus.ts";

type XeroWebhookEvent = {
  eventCategory: string;
  eventType: string;
  resourceId: string; // Xero InvoiceID GUID
  tenantId: string;
};

type XeroWebhookPayload = {
  events: XeroWebhookEvent[];
};

Deno.serve(async (req) => {
  // Must respond within 5 seconds. Signature check is synchronous.
  const rawBody = await req.text();
  const signature = req.headers.get("x-xero-signature") ?? "";
  const webhookKey = Deno.env.get("XERO_WEBHOOK_KEY") ?? "";

  // Always verify — this also satisfies the "intent to receive" handshake
  // (Xero sends a deliberately wrong signature; returning 401 proves we check it)
  const valid = await verifyXeroSignature(rawBody, signature, webhookKey);
  if (!valid) {
    return new Response(null, { status: 401 });
  }

  // Acknowledge immediately; process in background
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientId = Deno.env.get("XERO_CLIENT_ID")!;
  const clientSecret = Deno.env.get("XERO_CLIENT_SECRET")!;

  const process = async () => {
    let payload: XeroWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return;
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    for (const event of payload.events) {
      if (event.eventCategory !== "INVOICE") continue;

      // Look up connection by tenantId
      const { data: conn } = await admin
        .from("xero_connections")
        .select("agency_id, refresh_token")
        .eq("tenant_id", event.tenantId)
        .eq("status", "active")
        .maybeSingle();

      if (!conn) continue; // Not a connected tenant — ignore

      let accessToken: string;
      try {
        const { accessToken: at, newRefreshToken } = await refreshAccessToken(
          clientId, clientSecret, conn.refresh_token
        );
        accessToken = at;
        await admin
          .from("xero_connections")
          .update({ refresh_token: newRefreshToken, updated_at: new Date().toISOString() })
          .eq("agency_id", conn.agency_id);
      } catch {
        await admin
          .from("xero_connections")
          .update({ status: "error", updated_at: new Date().toISOString() })
          .eq("agency_id", conn.agency_id);
        continue;
      }

      const invoice = await fetchInvoiceById(accessToken, event.tenantId, event.resourceId);
      if (!invoice) continue;

      const brieflyStatus = mapXeroStatus(invoice.Status ?? "");
      if (brieflyStatus === null) continue; // Unknown status — ignore

      const paymentDates = (invoice.Payments ?? [])
        .map((p) => toIsoDate(p.Date))
        .filter((d): d is string => Boolean(d))
        .sort();

      const updates: Record<string, unknown> = {
        invoice_status: brieflyStatus,
        xero_invoice_id: invoice.InvoiceID,
        xero_synced_at: new Date().toISOString(),
      };
      if ((invoice.AmountDue ?? 0) <= 0 && paymentDates.length > 0) {
        updates.paid_date = paymentDates[paymentDates.length - 1];
      }
      if (invoice.DueDateString) {
        updates.payment_terms = `Due ${invoice.DueDateString}`;
      }
      if (typeof invoice.TotalTax === "number") {
        updates.includes_vat = invoice.TotalTax > 0 ? "VAT" : "NO VAT";
      }

      // Match by xero_invoice_id first (exact GUID), fallback to invoice_no
      const { data: byCampaignId } = await admin
        .from("campaigns")
        .select("id")
        .eq("agency_id", conn.agency_id)
        .eq("xero_invoice_id", invoice.InvoiceID)
        .maybeSingle();

      if (byCampaignId) {
        await admin.from("campaigns").update(updates).eq("id", byCampaignId.id);
        continue;
      }

      if (invoice.InvoiceNumber) {
        const { data: byNumber } = await admin
          .from("campaigns")
          .select("id")
          .eq("agency_id", conn.agency_id)
          .eq("invoice_no", invoice.InvoiceNumber)
          .maybeSingle();
        if (byNumber) {
          await admin.from("campaigns").update(updates).eq("id", byNumber.id);
        }
      }
    }
  };

  // @ts-ignore — Deno Deploy / Edge Runtime global
  EdgeRuntime.waitUntil(process());

  return new Response(null, { status: 200 });
});
```

- [ ] **Step 2: Set the XERO_WEBHOOK_KEY secret**

Get the webhook key from the Xero developer portal (app → Webhooks → copy the webhook key), then:

```bash
supabase secrets set XERO_WEBHOOK_KEY="<paste-key-here>"
```

- [ ] **Step 3: Deploy with --no-verify-jwt**

```bash
supabase functions deploy xero-webhook --no-verify-jwt
```

Expected: deployed successfully.

- [ ] **Step 4: Register the webhook URL in Xero**

In the [Xero developer portal](https://developer.xero.com/myapps) → your app → Webhooks:
- URL: `https://khabdorhychqjwhysbvg.supabase.co/functions/v1/xero-webhook`
- Subscribe to: **Invoices**
- Save — Xero immediately fires a validation request with an incorrect signature. Your function returns 401. Xero shows "✓ Verified".

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/xero-webhook/index.ts
git commit -m "feat: add xero-webhook edge function with HMAC verification"
```

---

## Task 8: Tracker UI — invoice_status badge

**Files:**
- Modify: `src/pages/CampaignTracker.tsx`

- [ ] **Step 1: Add the status badge helper near getStatusStyle (around line 483)**

In `src/pages/CampaignTracker.tsx`, add after the `getStatusStyle` function:

```typescript
const INVOICE_STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_review: "bg-blue-100 text-blue-800",
  approved: "bg-teal-100 text-teal-800",
  paid: "bg-green-100 text-green-800",
  voided: "bg-amber-100 text-amber-800",
  deleted: "bg-red-100 text-red-800",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  approved: "Approved",
  paid: "Paid",
  voided: "Voided",
  deleted: "Deleted",
};

const InvoiceStatusBadge = ({ status }: { status: string | null | undefined }) => {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <Badge className={`text-xs font-medium ${INVOICE_STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>
      {INVOICE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
};
```

- [ ] **Step 2: Update the campaign row data mapping to include invoice_status**

Find where campaign data is mapped to row data (around line 138, where `complete`, `invoiceNo`, `paid` etc are set). Add:

```typescript
invoiceStatus: campaign.invoice_status ?? null,
```

- [ ] **Step 3: Render the badge in the table**

Find the table column where "Invoice No" is rendered (search for `invoiceNo` in the JSX). Add an adjacent column (or a cell below the invoice number) for the badge:

```tsx
{/* Invoice status badge — rendered below the invoice number cell */}
<InvoiceStatusBadge status={row.invoiceStatus} />
```

The exact placement depends on the table structure — add it wherever the Invoice No column is rendered. The badge is read-only; no `onChange`.

- [ ] **Step 4: Check in browser**

Navigate to the campaign tracker at http://localhost:8083. Campaigns that have been synced will show a coloured badge. Campaigns without `invoice_status` show "—".

- [ ] **Step 5: Commit**

```bash
git add src/pages/CampaignTracker.tsx
git commit -m "feat: render invoice_status badge in campaign tracker"
```

---

## Task 9: Hourly cron schedule

- [ ] **Step 1: Enable pg_cron and pg_net in the Supabase dashboard**

In the [Supabase dashboard](https://supabase.com/dashboard/project/khabdorhychqjwhysbvg) → Extensions, enable:
- `pg_cron`
- `pg_net`

- [ ] **Step 2: Create the cron job**

Run this in the [Supabase SQL editor](https://supabase.com/dashboard/project/khabdorhychqjwhysbvg/sql):

```sql
-- Hourly Xero invoice status sync (all agencies)
SELECT cron.schedule(
  'xero-invoice-sync-hourly',
  '7 * * * *',  -- 7 minutes past each hour (avoids :00 thundering herd)
  $$
  SELECT net.http_post(
    url := 'https://khabdorhychqjwhysbvg.supabase.co/functions/v1/xero-sync-campaigns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Then set the service role key as a Postgres setting (run once in SQL editor):

```sql
ALTER DATABASE postgres SET app.service_role_key = '<your-service-role-key>';
```

Get the service role key from: Supabase dashboard → Settings → API → `service_role` key.

- [ ] **Step 3: Verify the job is registered**

```sql
SELECT jobid, schedule, command FROM cron.job WHERE jobname = 'xero-invoice-sync-hourly';
```

Expected: one row with the schedule `7 * * * *`.

---

## End-to-end smoke test

After all tasks are complete:

1. Log in to Briefly at http://localhost:8083, navigate to Agency Settings → confirm "Connect Xero" section appears.
2. Click "Connect Xero" → Xero consent → redirects back to `/xero/callback` → success screen shows org name → redirected to settings → shows "Connected to \<org\>".
3. In the campaign tracker, set `invoice_no` on any campaign to `INV-001` (which we created earlier in the Demo Org as AUTHORISED).
4. Click "Sync Xero" — the badge on that campaign should update to **Approved** (teal).
5. In the [Xero Demo Org](https://go.xero.com), apply payment to INV-001 → webhook fires → within 30 seconds, refresh the tracker → badge updates to **Paid** (green) without clicking sync.
6. Check `xero_connections.last_synced_at` in the Supabase dashboard to confirm it updated.
