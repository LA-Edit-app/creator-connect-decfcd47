import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  refreshAccessToken,
  fetchInvoiceById,
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

      // Helper: build the campaign update object from a matched Xero invoice
      const buildUpdates = (invoice: XeroInvoice, campaign: typeof campaigns[number]): Record<string, unknown> => {
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
        if (brieflyStatus !== null) updates.invoice_status = brieflyStatus;
        return updates;
      };

      // Process in batches of BATCH_SIZE
      for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
        const batch = campaigns.slice(i, i + BATCH_SIZE);

        // Split: campaigns with a stored Xero GUID use fetchInvoiceById (1:1, handles
        // void-and-repeat where the same invoice number appears on multiple bills).
        // Campaigns without a GUID use the batched number lookup.
        const byGuid = batch.filter((c) => c.xero_invoice_id);
        const byNumber = batch.filter((c) => !c.xero_invoice_id);

        // Fetch by GUID in parallel (each is one Xero API call but always unambiguous)
        const guidResults = await Promise.all(
          byGuid.map(async (c) => ({
            campaign: c,
            invoice: await fetchInvoiceById(accessToken, conn.tenant_id, c.xero_invoice_id!),
          }))
        );

        for (const { campaign, invoice } of guidResults) {
          if (!invoice) { totalSkipped += 1; continue; }
          const { error: updateError } = await admin
            .from("campaigns")
            .update(buildUpdates(invoice, campaign))
            .eq("id", campaign.id);
          if (updateError) { totalSkipped += 1; } else { totalSynced += 1; }
        }

        // Fetch by invoice number (batched, 1 Xero API call for all)
        if (byNumber.length > 0) {
          const invoiceNumbers = byNumber
            .map((c) => (c.invoice_no ?? "").trim())
            .filter(Boolean);
          const invoices = await fetchInvoicesByNumbers(accessToken, conn.tenant_id, invoiceNumbers);

          for (const campaign of byNumber) {
            const invoiceNo = (campaign.invoice_no ?? "").trim();
            const matching = invoices.filter((inv) => inv.InvoiceNumber === invoiceNo);

            if (matching.length !== 1) {
              // 0 = not in Xero yet; 2+ = ambiguous (same number on multiple bills)
              totalSkipped += 1;
              continue;
            }

            const { error: updateError } = await admin
              .from("campaigns")
              .update(buildUpdates(matching[0], campaign))
              .eq("id", campaign.id);
            if (updateError) { totalSkipped += 1; } else { totalSynced += 1; }
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
