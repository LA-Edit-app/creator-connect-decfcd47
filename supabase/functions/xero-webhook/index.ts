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
