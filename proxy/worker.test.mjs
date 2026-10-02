/**
 * Unit tests for the policy proxy (no network; upstream fetch is mocked).
 * Run: node worker.test.mjs
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { handleRequest, upstreamStatusError, validateTargetUrl, MAX_BYTES } from "./worker.js";

const ORIGIN = "https://michael-peterson.com";
const env = { ALLOWED_ORIGINS: `${ORIGIN},http://localhost:8000` };

/**
 * @param {string} target
 * @param {{ origin?: string|null, method?: string }} [opts]
 */
function proxyRequest(target, opts = {}) {
  const headers = {};
  const origin = opts.origin === undefined ? ORIGIN : opts.origin;
  if (origin) headers.Origin = origin;
  return new Request(`https://proxy.example.workers.dev/?url=${encodeURIComponent(target)}`, {
    method: opts.method || "GET",
    headers
  });
}

/** @param {Record<string, Response | (() => Response)>} routes */
function mockFetch(routes) {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    const route = routes[url];
    if (!route) return new Response("not found", { status: 404 });
    return typeof route === "function" ? route() : route;
  };
  impl.calls = calls;
  return impl;
}

const html = (body) =>
  new Response(body, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });

test("returns page HTML as plain text with CORS + final URL", async () => {
  const fetchImpl = mockFetch({ "https://example.com/privacy": html("<h1>Privacy Policy</h1>") });
  const res = await handleRequest(proxyRequest("https://example.com/privacy"), env, fetchImpl);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "<h1>Privacy Policy</h1>");
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  assert.match(res.headers.get("Content-Type"), /^text\/plain/);
  assert.equal(res.headers.get("X-Final-Url"), "https://example.com/privacy");
});

test("rejects requests from other origins or with no origin", async () => {
  const fetchImpl = mockFetch({});
  const other = await handleRequest(
    proxyRequest("https://example.com/privacy", { origin: "https://evil.example" }),
    env,
    fetchImpl
  );
  assert.equal(other.status, 403);
  assert.equal(other.headers.get("Access-Control-Allow-Origin"), null);
  const none = await handleRequest(proxyRequest("https://example.com/privacy", { origin: null }), env, fetchImpl);
  assert.equal(none.status, 403);
  assert.equal(fetchImpl.calls.length, 0);
});

test("blocks internal, IP-literal, credentialed, and non-default-port targets", () => {
  for (const bad of [
    "http://localhost/privacy",
    "http://127.0.0.1/",
    "http://2130706433/",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/",
    "http://printer.local/",
    "http://intranet/",
    "https://user:pass@example.com/",
    "https://example.com:8443/privacy",
    "file:///etc/passwd",
    "javascript:alert(1)"
  ]) {
    assert.throws(() => validateTargetUrl(bad), undefined, bad);
  }
  assert.equal(validateTargetUrl("https://example.com/privacy#top").href, "https://example.com/privacy");
});

test("re-validates every redirect hop", async () => {
  const fetchImpl = mockFetch({
    "https://example.com/privacy": new Response(null, {
      status: 302,
      headers: { Location: "http://127.0.0.1/admin" }
    })
  });
  const res = await handleRequest(proxyRequest("https://example.com/privacy"), env, fetchImpl);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "bad_redirect");
  assert.deepEqual(fetchImpl.calls, ["https://example.com/privacy"]);
});

test("blocked targets return a machine-readable code", async () => {
  const fetchImpl = mockFetch({});
  const host = await handleRequest(proxyRequest("http://127.0.0.1/"), env, fetchImpl);
  assert.equal(host.status, 400);
  assert.equal((await host.json()).code, "blocked_host");
  const port = await handleRequest(proxyRequest("https://example.com:8443/"), env, fetchImpl);
  assert.equal(port.status, 400);
  assert.equal((await port.json()).code, "invalid_url");
  assert.equal(fetchImpl.calls.length, 0);
});

test("follows safe redirects and reports the final URL", async () => {
  const fetchImpl = mockFetch({
    "https://example.com/privacy": new Response(null, {
      status: 301,
      headers: { Location: "/legal/privacy-policy" }
    }),
    "https://example.com/legal/privacy-policy": html("policy")
  });
  const res = await handleRequest(proxyRequest("https://example.com/privacy"), env, fetchImpl);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("X-Final-Url"), "https://example.com/legal/privacy-policy");
});

test("rejects non-HTML content and oversized pages", async () => {
  const fetchImpl = mockFetch({
    "https://example.com/file.pdf": new Response("%PDF", {
      status: 200,
      headers: { "Content-Type": "application/pdf" }
    }),
    "https://example.com/huge": () => html("x".repeat(MAX_BYTES + 1))
  });
  const pdf = await handleRequest(proxyRequest("https://example.com/file.pdf"), env, fetchImpl);
  assert.equal(pdf.status, 415);
  assert.equal((await pdf.json()).code, "not_html");
  const huge = await handleRequest(proxyRequest("https://example.com/huge"), env, fetchImpl);
  assert.equal(huge.status, 413);
  assert.equal((await huge.json()).code, "too_large");
});

test("upstream 404 becomes 502 not_found with the original status as data", async () => {
  const fetchImpl = mockFetch({});
  const res = await handleRequest(proxyRequest("https://example.com/missing"), env, fetchImpl);
  assert.equal(res.status, 502);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  const body = await res.json();
  assert.equal(body.code, "not_found");
  assert.equal(body.upstreamStatus, 404);
  assert.doesNotMatch(body.error, /HTTP/);
});

test("Cloudflare DNS/origin errors (530, 52x) become unreachable or timeout, never passed through", async () => {
  const fetchImpl = mockFetch({
    "https://no-such-site.example/": new Response("error code: 1016", { status: 530 }),
    "https://slow.example/": new Response("", { status: 522 })
  });
  const dns = await handleRequest(proxyRequest("https://no-such-site.example/"), env, fetchImpl);
  assert.equal(dns.status, 502);
  assert.equal((await dns.json()).code, "unreachable");
  const slow = await handleRequest(proxyRequest("https://slow.example/"), env, fetchImpl);
  assert.equal(slow.status, 504);
  assert.equal((await slow.json()).code, "timeout");
});

test("upstreamStatusError classifies site responses", () => {
  assert.equal(upstreamStatusError(403).code, "blocked");
  assert.equal(upstreamStatusError(429).code, "blocked");
  assert.equal(upstreamStatusError(410).code, "not_found");
  assert.equal(upstreamStatusError(503).code, "upstream_error");
  assert.equal(upstreamStatusError(524).code, "timeout");
  assert.equal(upstreamStatusError(521).code, "unreachable");
  for (const s of [403, 404, 503, 530]) assert.equal(upstreamStatusError(s).status, 502);
});

test("network failures and timeouts map to unreachable (502) and timeout (504)", async () => {
  const refused = await handleRequest(proxyRequest("https://example.com/"), env, async () => {
    throw new TypeError("Network connection lost.");
  });
  assert.equal(refused.status, 502);
  assert.equal((await refused.json()).code, "unreachable");

  const timedOut = await handleRequest(proxyRequest("https://example.com/"), env, async () => {
    throw new DOMException("The operation was aborted.", "AbortError");
  });
  assert.equal(timedOut.status, 504);
  assert.equal((await timedOut.json()).code, "timeout");
});

test("only GET and OPTIONS are allowed", async () => {
  const fetchImpl = mockFetch({});
  const post = await handleRequest(
    proxyRequest("https://example.com/privacy", { method: "POST" }),
    env,
    fetchImpl
  );
  assert.equal(post.status, 405);
  const preflight = await handleRequest(
    proxyRequest("https://example.com/privacy", { method: "OPTIONS" }),
    env,
    fetchImpl
  );
  assert.equal(preflight.status, 204);
});
