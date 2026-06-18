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
