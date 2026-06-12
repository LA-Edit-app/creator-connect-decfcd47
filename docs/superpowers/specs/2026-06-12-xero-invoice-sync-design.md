# Xero → Briefly Invoice Status Sync — Design

**Date:** 2026-06-12
**Status:** Approved (Eduardo), pending review by John
**Origin:** Agreement with the agency owner, relayed by John O'Flynn (2026-06-03): invoice ID is the 1:1 mapping field between the Briefly campaign tracker and Xero; when an invoice's status changes in Xero, the matching tracker row updates to the corresponding Briefly status.

## Goal

When an agency's invoice changes status in Xero (e.g. INV-001 → Paid), the Briefly campaign tracker row holding that invoice number reflects the mapped status within seconds, without anyone opening or refreshing the tracker.

## Status mapping

| Xero status | Briefly status | Stored value |
|---|---|---|
| DRAFT (saved, not sent) | Draft (not yet active) | `draft` |
| SUBMITTED (awaiting approval) | Pending review (awaiting approval) | `pending_review` |
| AUTHORISED (payment due) | Approved (sent to client) | `approved` |
| PAID (payment received) | Paid (campaign complete) | `paid` |
| VOIDED (cancelled) | Voided (cancelled) | `voided` |
| DELETED (removed from Xero) | Deleted | `deleted` |

The mapping lives in one shared module (`supabase/functions/_shared/xeroStatus.ts`) used by both sync paths. Unknown Xero statuses are ignored (logged, row untouched).

**Deletion is a soft mark.** A Xero DELETED event sets `invoice_status = 'deleted'`; it never deletes the tracker row. (John's diagram says "removed from tracker" — flag this difference to him; destructive deletion driven by an external system is not acceptable.)

**Match key:** Xero `InvoiceNumber` (the human-readable "INV-001"), matched against `campaigns.invoice_no`, scoped to the agency that owns the Xero connection. The Xero `InvoiceID` GUID is stored on first match (`xero_invoice_id`) so subsequent webhook events match exactly even if the invoice number is edited in Xero. ("Invoice ID" in John's message is interpreted as the invoice number per his INV001 example — confirm with him.)

## Architecture

One Briefly-owned Xero app; each agency authorises it against their own Xero organisation. Status updates arrive by webhook (push), with a scheduled poll as a safety net.

```
Agency settings ──"Connect Xero"──▶ Xero consent ──▶ /xero/callback
                                                          │
                                              xero-oauth-exchange (edge fn)
                                                          │ stores tokens
                                                  xero_connections (table)
                                                          ▲
Xero invoice event ──▶ xero-webhook (edge fn) ────────────┤ look up by tenant_id
                          │ verify HMAC, 200 fast         │
                          │ fetch invoice, map status     │
                          ▼                               │
                    campaigns.invoice_status              │
                          ▲                               │
pg_cron (hourly) ──▶ xero-sync-campaigns (edge fn) ───────┘ per-agency poll
```

### Components

**1. Xero app (manual, one-time setup)**
Created at developer.xero.com (free). OAuth redirect URIs: production URL + `http://localhost:8080/xero/callback` (dev). Scopes: `openid offline_access accounting.transactions.read accounting.contacts.read`. Secrets stored as Supabase function secrets: `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_WEBHOOK_KEY`.

**2. `xero_connections` table (new migration)**
- `id` uuid PK, `agency_id` FK → agencies (unique), `tenant_id` text (Xero org), `tenant_name` text, `refresh_token` text, `connected_by` FK → auth.users, `status` text (`active | revoked | error`), `last_synced_at`, `created_at`, `updated_at`.
- RLS: **no policies for client roles** — service role only. The UI learns connection status via a security-definer RPC (or thin view) exposing only `tenant_name`, `status`, `last_synced_at`.
- Refresh tokens rotate on every use: every edge function that refreshes a token must persist the new refresh token in the same operation before using the access token.

**3. Campaign columns (new migration)**
- `invoice_status` text, CHECK in (`draft`, `pending_review`, `approved`, `paid`, `voided`, `deleted`), nullable (null = never synced).
- `xero_invoice_id` text, nullable.
- `xero_synced_at` timestamptz, nullable.

**4. Agency settings UI**
"Connect Xero" button → Xero authorize URL (state param = agency id, CSRF-protected). Callback page posts the code to `xero-oauth-exchange`, which now **stores** the connection row keyed by agency (upsert) instead of returning tokens to the browser. The page shows success + org name. Existing developer-oriented output (printed `supabase secrets set` commands) is removed. Settings shows "Connected to <org>" with a Disconnect action (deletes the row; optionally revokes the Xero connection via API).

**5. `xero-webhook` edge function (new)**
- Verifies `x-xero-signature` (HMAC-SHA256, base64, of the raw body using `XERO_WEBHOOK_KEY`). Correct → 200, incorrect → 401, both with **empty body**, within 5 s. This also satisfies Xero's "intent to receive" handshake.
- Deployed with `--no-verify-jwt` (Xero cannot send a Supabase JWT).
- Response is returned immediately; event processing continues via `EdgeRuntime.waitUntil`.
- Per event (`eventCategory = INVOICE`): look up connection by `tenantId` (none → skip), refresh access token, fetch invoice by `resourceId` (the InvoiceID GUID), map status, update the campaign in that agency matched by `xero_invoice_id` first, else `invoice_no = InvoiceNumber`. No match → ignore. Also refreshes paid date / payment terms / VAT, same as the poll path.

**6. `xero-sync-campaigns` rework (fallback poll + manual sync)**
- Replaces env-secret credentials (`XERO_TENANT_ID`, `XERO_REFRESH_TOKEN`) with per-agency rows from `xero_connections`, iterating all active connections (or one agency when invoked from the UI).
- Now also writes `invoice_status`, `xero_invoice_id`, `xero_synced_at`.
- Batches lookups: one Xero call per ~50 invoice numbers using a combined `where` filter / `InvoiceNumbers` query parameter instead of one call per campaign.
- Scheduled hourly via `pg_cron` + `pg_net` (Supabase cron invoking the function with the service key). The existing tracker UI manual/auto sync keeps working unchanged from the caller's perspective.

**7. Tracker UI**
`invoice_status` rendered as a coloured badge in the campaign tracker (colour scheme per John's diagram: grey/blue/teal/green/amber/red). Read-only — Xero is the source of truth for this field.

## Error handling

- **Webhook signature failure** → 401, no processing (required by Xero's handshake).
- **Token refresh failure** (agency revoked access, token expired after 60 days unused) → mark connection `status = 'error'`; settings UI shows "Reconnect Xero"; poll skips errored connections.
- **Xero API failure mid-event** → event dropped; Xero retries undelivered events with backoff, and the hourly poll heals any final misses.
- **Concurrent webhook + poll updates** → both write the same derived state; last-writer-wins is acceptable.
- **Unknown invoice number** → ignored silently (most agency invoices won't be Briefly campaigns).

## Testing

**Sandbox:** Xero Demo Company org (free with any Xero developer login, sample data, resettable) connected through the real "Connect Xero" flow.

**Unit (Deno tests, run in CI):**
- Status mapping: every Xero status → expected Briefly value; unknown statuses rejected.
- Webhook signature verification against Xero's documented sample payload/key, plus a tampered-body case.

**End-to-end (manual script, against deployed functions):**
1. Connect Demo Company from agency settings; verify `xero_connections` row and settings UI state.
2. Register the deployed `xero-webhook` URL in the Xero app; confirm the intent-to-receive check passes.
3. Create invoice INV-E2E-1 in Demo Company; create a tracker campaign with that invoice number.
4. Walk the invoice through Xero: submit for approval → approve → apply payment → (second invoice) void. After each step, verify the tracker badge updates within ~1 minute without reloading data manually.
5. Disable the webhook temporarily, change a status, run the poll function → verify it heals.
6. Disconnect/reconnect the agency; verify error states.

**Local dev:** webhooks can't reach localhost; locally the manual sync button covers iteration, and `supabase functions serve` + the unit tests cover function logic. Webhook behaviour is tested against the deployed function.

## Out of scope (YAGNI)

- Writing anything back to Xero (Briefly → Xero direction).
- Syncing invoice line items, amounts, or contacts beyond what the tracker already shows.
- Per-agency webhook keys or multiple Xero orgs per agency.
- Token encryption at rest beyond Postgres + RLS denial (revisit if compliance requires).

## Open questions for John

1. Confirm "Invoice ID" means the human-readable invoice number (INV001), not Xero's internal GUID.
2. Confirm Deleted should mark the row, not remove it from the tracker.
3. Should a Briefly user be able to edit `invoice_status` manually, or is it strictly Xero-driven? (Design assumes read-only.)
