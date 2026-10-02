/**
 * Checks for the popup ↔ service worker message boundary (lib/messages.js).
 * Run: node --test scripts/verify-messages.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  MAX_CANDIDATES,
  MAX_LINK_TEXT,
  MAX_URL_LENGTH,
  isTrustedSender,
  safeHttpUrl,
  sanitizeDiscovery,
  validateMessage
} from "../lib/messages.js";

const ID = "abcdefghijklmnopabcdefghijklmnop";
const ORIGIN = `chrome-extension://${ID}/`;

test("isTrustedSender accepts only this extension's own pages", () => {
  assert.equal(isTrustedSender({ id: ID, url: `${ORIGIN}popup/popup.html` }, ID, ORIGIN), true);
  // content script injected into a web page: same extension id, but the page's URL
  assert.equal(isTrustedSender({ id: ID, url: "https://evil.example/", tab: { id: 3 } }, ID, ORIGIN), false);
  assert.equal(isTrustedSender({ id: "other-extension", url: `${ORIGIN}popup/popup.html` }, ID, ORIGIN), false);
  assert.equal(isTrustedSender({ id: ID }, ID, ORIGIN), false);
  assert.equal(isTrustedSender(undefined, ID, ORIGIN), false);
  assert.equal(isTrustedSender({ id: undefined, url: ORIGIN }, undefined, ORIGIN), false);
  assert.equal(isTrustedSender({ id: ID, url: `${ORIGIN}x` }, ID, ""), false);
});

test("validateMessage rejects non-objects and unknown types", () => {
  for (const bad of [null, undefined, "ANALYZE_TAB", 42, [], ["ANALYZE_TAB"]]) {
    assert.equal(validateMessage(bad).ok, false, String(bad));
  }
  for (const type of [undefined, "", "DELETE_ALL", "analyze_tab", { toString: () => "ANALYZE_TAB" }]) {
    const r = validateMessage({ type });
    assert.equal(r.ok, false);
    assert.equal(r.error, "Unknown message type.");
  }
});

test("validateMessage normalizes valid messages and drops extra fields", () => {
  assert.deepEqual(validateMessage({ type: "CLEAR_CACHE", extra: "<script>" }), {
    ok: true,
    message: { type: "CLEAR_CACHE" }
  });
  assert.deepEqual(validateMessage({ type: "ANALYZE_TAB", force: true, policyUrl: null }), {
    ok: true,
    message: { type: "ANALYZE_TAB", force: true, policyUrl: null }
  });
  assert.deepEqual(validateMessage({ type: "ANALYZE_TAB" }), {
    ok: true,
    message: { type: "ANALYZE_TAB", force: false, policyUrl: null }
  });
  const r = validateMessage({ type: "ANALYZE_TAB", force: false, policyUrl: "https://example.com/privacy#top" });
  assert.equal(r.ok, true);
  assert.equal(r.message.policyUrl, "https://example.com/privacy#top");
});

test("validateMessage rejects bad policyUrl values", () => {
  const bad = [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "chrome://settings",
    "https://user:pass@example.com/privacy",
    "not a url",
    `https://example.com/${"a".repeat(MAX_URL_LENGTH)}`,
    { href: "https://example.com" },
    ["https://example.com"],
    123
  ];
  for (const policyUrl of bad) {
    assert.equal(validateMessage({ type: "ANALYZE_TAB", policyUrl }).ok, false, String(policyUrl).slice(0, 40));
  }
  assert.equal(validateMessage({ type: "ANALYZE_TAB", force: "yes" }).ok, false);
});

test("safeHttpUrl", () => {
  assert.equal(safeHttpUrl("https://example.com"), "https://example.com/");
  assert.equal(safeHttpUrl("JAVASCRIPT:alert(1)"), null);
  assert.equal(safeHttpUrl(" javascript:alert(1)"), null);
  assert.equal(safeHttpUrl(null), null);
});

test("sanitizeDiscovery keeps only capped http(s) links and trusted origin/pageUrl", () => {
  const raw = {
    origin: "https://evil.example",
    pageUrl: "javascript:alert(1)",
    candidates: [
      { href: "javascript:alert(1)", text: "Privacy", score: 99 },
      { href: "https://example.com/privacy", text: "x".repeat(500), score: 12 },
      { href: "https://example.com/p2", text: { evil: true }, score: "9" },
      null,
      "https://example.com/str",
      ...Array.from({ length: 30 }, (_, i) => ({ href: `https://example.com/p${i + 3}`, text: "", score: 1 }))
    ],
    pageLinks: "not an array"
  };
  const out = sanitizeDiscovery(raw, { origin: "https://example.com", pageUrl: "https://example.com/" });
  assert.equal(out.origin, "https://example.com");
  assert.equal(out.pageUrl, "https://example.com/");
  assert.equal(out.candidates.length, MAX_CANDIDATES);
  assert.equal(out.candidates[0].href, "https://example.com/privacy");
  assert.equal(out.candidates[0].text.length, MAX_LINK_TEXT);
  assert.deepEqual(out.candidates[1], { href: "https://example.com/p2", text: "", score: 0 });
  assert.ok(out.candidates.every((c) => c.href.startsWith("https://")));
  assert.deepEqual(out.pageLinks, []);
  assert.deepEqual(sanitizeDiscovery(undefined, { origin: "o", pageUrl: "p" }), {
    candidates: [],
    pageLinks: [],
    origin: "o",
    pageUrl: "p"
  });
});

test("service worker checks the sender and validates every message", () => {
  const src = readFileSync(new URL("../background/service-worker.js", import.meta.url), "utf8");
  assert.match(src, /isTrustedSender\(sender, chrome\.runtime\.id, chrome\.runtime\.getURL\(""\)\)/);
  assert.match(src, /validateMessage\(raw\)/);
  assert.match(src, /sanitizeDiscovery\(injected\[0\]\.result/);
  assert.doesNotMatch(src, /onMessageExternal|onConnectExternal/);
});
