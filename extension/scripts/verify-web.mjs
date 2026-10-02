/**
 * Unit checks for the web demo's pure helpers (docs/try/web-helpers.js).
 * Run: node scripts/verify-web.mjs
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compactCite,
  describeProxyError,
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

test("describeProxyError: unreachable sites get plain wording and no link", () => {
  const dead = describeProxyError("unreachable", "https://this-domain-does-not-exist-c3nsor.com/");
  assert.equal(
    dead.message,
    "We couldn’t reach this-domain-does-not-exist-c3nsor.com. Check the spelling, or try the site’s full address."
  );
  assert.equal(dead.siteUrl, null);

  const slow = describeProxyError("timeout", "https://www.slow.example/privacy");
  assert.equal(slow.message, "slow.example took too long to respond. Try again, or paste the policy text below.");
  assert.equal(slow.siteUrl, null);

  for (const code of ["invalid_url", "blocked_host", undefined, null, "something_new"]) {
    assert.equal(describeProxyError(code, "https://example.com/").siteUrl, null, String(code));
  }
});

test("describeProxyError: reachable-site errors link to the site homepage", () => {
  const blocked = describeProxyError("blocked", "https://www.instagram.com/accounts/");
  assert.equal(
    blocked.message,
    "instagram.com didn’t let us read its pages. Open the site’s privacy policy and paste its text below."
  );
  assert.equal(blocked.siteUrl, "https://www.instagram.com/");
  for (const code of ["not_found", "upstream_error", "too_large", "not_html", "bad_redirect"]) {
    assert.equal(describeProxyError(code, "https://example.com/a/b").siteUrl, "https://example.com/", code);
  }
});

test("describeProxyError never shows raw HTTP status codes", () => {
  const codes = ["unreachable", "timeout", "blocked", "not_found", "upstream_error", "too_large", "not_html", "bad_redirect", "invalid_url", "blocked_host", undefined];
  for (const code of codes) {
    const { message } = describeProxyError(code, "https://example.com/");
    assert.doesNotMatch(message, /HTTP|\b[1-5]\d\d\b/, String(code));
    assert.ok(message.length > 10);
  }
  assert.match(describeProxyError("unreachable", "not a url").message, /^We couldn’t reach That site/);
});

test("small helpers", () => {
  assert.equal(hostOf("https://www.discover.com/privacy-statement/"), "discover.com");
  assert.equal(looksLikeHtml("<html><body><p>Hi</p></body></html>"), true);
  assert.equal(looksLikeHtml("We collect your email address."), false);
  assert.equal(compactCite("a".repeat(200)).length, 140);
});
