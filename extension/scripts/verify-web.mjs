/**
 * Unit checks for the web demo's pure helpers (docs/try/web-helpers.js).
 * Run: node scripts/verify-web.mjs
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compactCite,
  hostOf,
  isHttpUrl,
  looksLikeHtml,
  normalizeInputUrl,
  scorePolicyLink
} from "../../docs/try/web-helpers.js";

test("normalizeInputUrl accepts bare domains and full URLs", () => {
  assert.equal(normalizeInputUrl("duckduckgo.com"), "https://duckduckgo.com/");
  assert.equal(normalizeInputUrl("  https://www.mozilla.org/privacy/#top "), "https://www.mozilla.org/privacy/");
  assert.equal(normalizeInputUrl("http://example.com/privacy"), "http://example.com/privacy");
});

test("normalizeInputUrl rejects non-web input", () => {
  for (const bad of ["", "   ", "javascript:alert(1)", "data:text/html,hi", "ftp://example.com", "localhost", "not a url"]) {
    assert.equal(normalizeInputUrl(bad), null, bad);
  }
});

test("isHttpUrl only allows http(s)", () => {
  assert.equal(isHttpUrl("https://example.com"), true);
  assert.equal(isHttpUrl("javascript:alert(1)"), false);
  assert.equal(isHttpUrl("mailto:privacy@example.com"), false);
});

test("scorePolicyLink prefers same-site privacy policy links over cookie links", () => {
  const policy = scorePolicyLink("https://www.example.com/legal/privacy", "Privacy Policy", "example.com");
  const cookie = scorePolicyLink("https://www.example.com/cookies", "Cookie settings", "example.com");
  const offsite = scorePolicyLink("https://other.com/privacy", "Privacy Policy", "example.com");
  assert.ok(policy > offsite, "same-site should beat off-site");
  assert.ok(cookie <= 0, "cookie-only link should not be a candidate");
  assert.equal(scorePolicyLink("javascript:void(0)", "Privacy Policy", "example.com"), 0);
});

test("small helpers", () => {
  assert.equal(hostOf("https://www.discover.com/privacy-statement/"), "discover.com");
  assert.equal(looksLikeHtml("<html><body><p>Hi</p></body></html>"), true);
  assert.equal(looksLikeHtml("We collect your email address."), false);
  assert.equal(compactCite("a".repeat(200)).length, 140);
});
