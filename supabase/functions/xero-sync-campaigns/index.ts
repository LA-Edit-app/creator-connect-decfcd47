import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type XeroInvoice = {
  InvoiceID: string;
  InvoiceNumber?: string;
  DueDateString?: string;
  TotalTax?: number;
  AmountDue?: number;
  Status?: string;
  Payments?: Array<{ Date?: string }>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const toIsoDate = (value?: string | null) => {
  if (!value) return null;

  if (value.startsWith("/Date(")) {
    const match = value.match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);
    if (!match) return null;
    const date = new Date(Number(match[1]));
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const getAccessToken = async () => {
  const directToken = Deno.env.get("XERO_ACCESS_TOKEN");
  if (directToken) {
    return { accessToken: directToken, refreshTokenRotated: false };
  }

  const clientId = Deno.env.get("XERO_CLIENT_ID");
  const clientSecret = Deno.env.get("XERO_CLIENT_SECRET");
  const refreshToken = Deno.env.get("XERO_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Xero credentials. Set either XERO_ACCESS_TOKEN or XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REFRESH_TOKEN."
    );
  }

  const authHeader = btoa(`${clientId}:${clientSecret}`);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const tokenResponse = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authHeader}`,
    },
    body,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to refresh Xero token: ${errorText}`);
  }

  const tokenPayload = await tokenResponse.json();
  return {
    accessToken: tokenPayload.access_token as string,
    refreshTokenRotated: Boolean(tokenPayload.refresh_token && tokenPayload.refresh_token !== refreshToken),
  };
};

const fetchInvoiceByNumber = async (
  accessToken: string,
  tenantId: string,
  invoiceNumber: string
): Promise<XeroInvoice | null> => {
  const where = encodeURIComponent(`InvoiceNumber==\"${invoiceNumber.replace(/"/g, '\\"')}\"`);
  const response = await fetch(`https://api.xero.com/api.xro/2.0/Invoices?where=${where}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-Tenant-Id": tenantId,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const invoices = (payload?.Invoices ?? []) as XeroInvoice[];
  return invoices[0] ?? null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const tenantId = Deno.env.get("XERO_TENANT_ID");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    if (!tenantId) {
      throw new Error("Missing XERO_TENANT_ID secret");
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { creatorId } = await req.json().catch(() => ({ creatorId: null }));

    const admin = createClient(supabaseUrl, serviceRoleKey);

    let campaignQuery = admin
      .from("campaigns")
      .select("id, invoice_no, paid_date, payment_terms, includes_vat")
      .not("invoice_no", "is", null)
      .neq("invoice_no", "")
      .order("updated_at", { ascending: false });

    if (creatorId) {
      campaignQuery = campaignQuery.eq("creator_id", creatorId);
    }

    const { data: campaigns, error: campaignError } = await campaignQuery;

    if (campaignError) throw campaignError;

    if (!campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({ synced: 0, skipped: 0, message: "No campaigns with invoice numbers found." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { accessToken, refreshTokenRotated } = await getAccessToken();

    let synced = 0;
    let skipped = 0;

    for (const campaign of campaigns) {
      const invoiceNo = (campaign.invoice_no ?? "").trim();
      if (!invoiceNo) {
        skipped += 1;
        continue;
      }

      const invoice = await fetchInvoiceByNumber(accessToken, tenantId, invoiceNo);
      if (!invoice) {
        skipped += 1;
        continue;
      }

      const paymentDates = (invoice.Payments ?? [])
        .map((payment) => toIsoDate(payment.Date))
        .filter((value): value is string => Boolean(value))
        .sort();

      const paidDate = paymentDates.length > 0 ? paymentDates[paymentDates.length - 1] : campaign.paid_date;

      const updates = {
        invoice_no: invoice.InvoiceNumber ?? campaign.invoice_no,
        payment_terms: invoice.DueDateString ? `Due ${invoice.DueDateString}` : campaign.payment_terms,
        includes_vat:
          typeof invoice.TotalTax === "number" ? (invoice.TotalTax > 0 ? "VAT" : "NO VAT") : campaign.includes_vat,
        paid_date: (invoice.AmountDue ?? 0) <= 0 ? paidDate : campaign.paid_date,
      };

      const { error: updateError } = await admin.from("campaigns").update(updates).eq("id", campaign.id);
      if (updateError) {
        skipped += 1;
        continue;
      }

      synced += 1;
    }

    return new Response(
      JSON.stringify({
        synced,
        skipped,
        refreshTokenRotated,
        warning: refreshTokenRotated
          ? "Xero refresh token rotated. Update XERO_REFRESH_TOKEN secret to avoid future auth failures."
          : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
