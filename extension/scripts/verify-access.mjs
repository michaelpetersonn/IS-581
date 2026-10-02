/**
 * Checks for narrow host access: same-origin policies are read in the tab,
 * other hosts need an optional permission, and the manifest never asks for every site at install.
 * Run: node --test scripts/verify-access.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createPolicyFetcher, isSameOrigin, originPattern } from "../lib/policy-access.js";
import { fetchPolicyHtml } from "../lib/fetch.js";

const PAGE = "https://www.example.com/shop";
const okResult = (url) => ({ ok: true, html: "<p>policy</p>", finalUrl: url });

function fakeDeps({ granted = [], inPage = okResult } = {}) {
  const calls = { inPage: [], direct: [], checked: [] };
  return {
    calls,
    deps: {
      pageUrl: PAGE,
      fetchInPage: async (url) => {
        calls.inPage.push(url);
        return inPage(url);
      },
      hasHostAccess: async (pattern) => {
        calls.checked.push(pattern);
        return granted.includes(pattern);
      },
      fetchDirect: async (url) => {
        calls.direct.push(url);
        return okResult(url);
      }
    }
  };
}

test("isSameOrigin compares scheme, host, and port", () => {
  assert.equal(isSameOrigin("https://www.example.com/privacy", PAGE), true);
  assert.equal(isSameOrigin("https://example.com/privacy", PAGE), false);
  assert.equal(isSameOrigin("http://www.example.com/privacy", PAGE), false);
  assert.equal(isSameOrigin("https://www.example.com:8443/privacy", PAGE), false);
  assert.equal(isSameOrigin("not a url", PAGE), false);
});

test("originPattern builds a host match pattern without the port", () => {
  assert.equal(originPattern("https://legal.example.org/privacy?x=1"), "https://legal.example.org/*");
  assert.equal(originPattern("http://example.org:8080/p"), "http://example.org/*");
});

test("same-origin policies are fetched inside the tab with no permission check", async () => {
  const { deps, calls } = fakeDeps();
  const result = await createPolicyFetcher(deps)("https://www.example.com/privacy");
  assert.equal(result.ok, true);
  assert.deepEqual(calls.inPage, ["https://www.example.com/privacy"]);
  assert.deepEqual(calls.direct, []);
  assert.deepEqual(calls.checked, []);
});

test("other hosts without permission ask for that one host and make no request", async () => {
  const { deps, calls } = fakeDeps();
  const result = await createPolicyFetcher(deps)("https://policies.example.org/privacy");
  assert.equal(result.ok, false);
  assert.equal(result.needsPermission, true);
  assert.equal(result.origin, "https://policies.example.org/*");
  assert.equal(result.host, "policies.example.org");
  assert.equal(result.url, "https://policies.example.org/privacy");
  assert.match(result.error, /policies\.example\.org/);
  assert.deepEqual(calls.inPage, []);
  assert.deepEqual(calls.direct, []);
});

test("other hosts the user already allowed are fetched directly", async () => {
  const { deps, calls } = fakeDeps({ granted: ["https://policies.example.org/*"] });
  const result = await createPolicyFetcher(deps)("https://policies.example.org/privacy");
  assert.equal(result.ok, true);
  assert.deepEqual(calls.direct, ["https://policies.example.org/privacy"]);
  assert.deepEqual(calls.inPage, []);
});

test("a failed in-tab fetch falls back to direct only when that host is allowed", async () => {
  const failing = () => ({ ok: false, error: "blocked" });

  const denied = fakeDeps({ inPage: failing });
  const r1 = await createPolicyFetcher(denied.deps)("https://www.example.com/privacy");
  assert.equal(r1.ok, false);
  assert.equal(r1.error, "blocked");
  assert.deepEqual(denied.calls.direct, []);

  const allowed = fakeDeps({ inPage: failing, granted: ["https://www.example.com/*"] });
  const r2 = await createPolicyFetcher(allowed.deps)("https://www.example.com/privacy");
  assert.equal(r2.ok, true);
  assert.deepEqual(allowed.calls.direct, ["https://www.example.com/privacy"]);
});

test("invalid URLs are rejected without fetching", async () => {
  const { deps, calls } = fakeDeps();
  const result = await createPolicyFetcher(deps)("nope");
  assert.equal(result.ok, false);
  assert.deepEqual([...calls.inPage, ...calls.direct], []);
});

test("fetchPolicyHtml still works when serialized for executeScript (no module-scope refs)", async () => {
  const injected = new Function(`return (${fetchPolicyHtml.toString()})`)();
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) =>
    new Response("<html><body>Privacy policy text</body></html>", {
      status: 200,
      headers: { "content-type": "text/html" }
    });
  try {
    const ok = await injected("https://www.example.com/privacy", { maxBytes: 10_000, timeoutMs: 1_000 });
    assert.equal(ok.ok, true);
    assert.match(ok.html, /Privacy policy text/);

    const tooBig = await injected("https://www.example.com/privacy", { maxBytes: 10, timeoutMs: 1_000 });
    assert.equal(tooBig.ok, false);
    assert.match(tooBig.error, /too large/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("manifest does not request access to every site at install", () => {
  const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
  const installHosts = [
    ...(manifest.host_permissions || []),
    ...(manifest.permissions || []).filter((p) => p.includes("://") || p === "<all_urls>"),
    ...(manifest.content_scripts || []).flatMap((c) => c.matches || [])
  ];
  assert.deepEqual(installHosts, []);
  assert.ok(manifest.permissions.includes("activeTab"));
  assert.deepEqual(manifest.optional_host_permissions, ["http://*/*", "https://*/*"]);
});
