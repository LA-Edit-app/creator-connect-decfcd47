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
