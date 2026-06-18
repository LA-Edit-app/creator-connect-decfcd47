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
