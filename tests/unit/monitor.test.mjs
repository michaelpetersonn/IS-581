/**
 * Unit tests for scripts/monitor.mjs (no network; fetch is stubbed).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkProxy,
  checkSite,
  checkSiteVersion,
  formatReport,
  parseArgs,
  probe,
  runChecks,
} from "../../scripts/monitor.mjs";

const SITE = "https://site.example/IS-581/";
const PROXY = "https://proxy.example.workers.dev";
const POLICY = "Privacy Policy. ".repeat(100);

/**
 * @param {Record<string, () => Response>} routes keyed by URL without query string, except proxy fetches
 */
function stubFetch(routes) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, headers: init?.headers || {} });
    const u = new URL(url);
    const key = u.searchParams.has("url") ? u.href : `${u.origin}${u.pathname}`;
    const route = routes[key];
    if (!route) return new Response("missing", { status: 404 });
    return route();
  };
  impl.calls = calls;
  return impl;
}

const healthy = () =>
  stubFetch({
    [SITE]: () => new Response("<h1>c3nsor</h1>"),
    [`${SITE}try.html`]: () => new Response('<form id="url-form"></form>'),
    [`${PROXY}/health`]: () =>
      Response.json({ ok: true, version: "abc1234", env: "production" }),
    [`${PROXY}/?url=${encodeURIComponent("https://duckduckgo.com/privacy")}`]:
      () =>
        new Response(POLICY, {
          headers: { "X-Request-Id": "8f1c2a3b4d5e6f70-DEN" },
        }),
  });

const quick = { retryDelayMs: 0 };

test("all checks pass against a healthy site and proxy", async () => {
  const fetchImpl = healthy();
  const site = await checkSite({ ...quick, fetchImpl, siteUrl: SITE });
  const proxy = await checkProxy({ ...quick, fetchImpl, proxyUrl: PROXY });
  assert.deepEqual(
    [...site, ...proxy].map((r) => [r.name, r.ok]),
    [
      ["Website home page", true],
      ["Try it page", true],
      ["Proxy health", true],
      ["Proxy live policy fetch", true],
    ],
  );
  assert.match(proxy[1].detail, /request 8f1c2a3b4d5e6f70-DEN/);
  const live = fetchImpl.calls.find((c) => c.url.includes("?url="));
  assert.equal(live.headers.Origin, "https://michael-peterson.com");
});

test("a down page, a broken form, and a bad proxy each fail with a reason", async () => {
  const fetchImpl = stubFetch({
    [SITE]: () => new Response("Service unavailable", { status: 503 }),
    [`${SITE}try.html`]: () => new Response("<p>no form</p>"),
    [`${PROXY}/health`]: () => new Response("not json"),
  });
  const site = await checkSite({ ...quick, fetchImpl, siteUrl: SITE });
  const proxy = await checkProxy({ ...quick, fetchImpl, proxyUrl: PROXY });
  assert.equal(site[0].ok, false);
  assert.match(site[0].detail, /HTTP 503/);
  assert.match(site[1].detail, /form is missing/);
  assert.match(proxy[0].detail, /not JSON/);
  assert.match(proxy[1].detail, /HTTP 404/);
});

test("proxy version mismatch fails the health check", async () => {
  const proxy = await checkProxy({
    ...quick,
    fetchImpl: healthy(),
    proxyUrl: PROXY,
    expectVersion: "def5678",
  });
  assert.equal(proxy[0].ok, false);
  assert.match(proxy[0].detail, /running version abc1234, expected def5678/);
});

test("probe retries once before reporting a failure", async () => {
  let calls = 0;
  const flaky = await probe(
    "flaky",
    async () => {
      calls += 1;
      if (calls === 1) throw new Error("dropped");
      return "fine";
    },
    quick,
  );
  assert.equal(flaky.ok, true);
  assert.equal(calls, 2);

  const down = await probe(
    "down",
    async () => {
      throw new Error("still down");
    },
    quick,
  );
  assert.deepEqual([down.ok, down.detail], [false, "still down"]);
});

test("checkSiteVersion waits for the expected commit", async () => {
  let deployed = "old1111";
  const fetchImpl = stubFetch({
    [`${SITE}version.json`]: () => {
      const body = {
        commit: deployed,
        extensionVersion: "0.1.4",
        builtAt: "2026-11-12T16:00:00Z",
      };
      deployed = "new2222";
      return Response.json(body);
    },
  });
  const ok = await checkSiteVersion({
    fetchImpl,
    siteUrl: SITE,
    expectCommit: "new2222",
    waitSeconds: 1,
    pollMs: 1,
  });
  assert.equal(ok.ok, true);
  assert.match(ok.detail, /commit new2222, extension 0\.1\.4/);

  const stale = await checkSiteVersion({
    fetchImpl: stubFetch({
      [`${SITE}version.json`]: () => Response.json({ commit: "old1111" }),
    }),
    siteUrl: SITE,
    expectCommit: "new2222",
    waitSeconds: 0,
  });
  assert.equal(stale.ok, false);
  assert.match(stale.detail, /site reports commit old1111, expected new2222/);
});

test("simulated failure fails the run without touching the site", async () => {
  const fetchImpl = healthy();
  const results = await runChecks(
    { ...parseArgs(["--proxy-only", "--simulate-failure"]), proxyUrl: PROXY },
    { ...quick, fetchImpl },
  );
  assert.deepEqual(
    results.map((r) => r.ok),
    [true, true, false],
  );
  assert.equal(
    fetchImpl.calls.some((c) => c.url.startsWith(SITE)),
    false,
  );
});

test("parseArgs and formatReport", () => {
  assert.deepEqual(
    parseArgs([
      "--site-only",
      "--expect-commit",
      "abc",
      "--wait",
      "600",
      "--report",
      "r.md",
    ]),
    {
      site: true,
      proxy: false,
      proxyUrl: null,
      expectCommit: "abc",
      expectProxyVersion: null,
      waitSeconds: 600,
      report: "r.md",
      simulateFailure: false,
    },
  );
  assert.throws(() => parseArgs(["--bogus"]), /Unknown option/);
  assert.throws(() => parseArgs(["--wait"]), /needs a value/);

  const report = formatReport(
    [
      { name: "A", ok: true, detail: "fine", ms: 5 },
      { name: "B", ok: false, detail: "x | y", ms: 7 },
    ],
    { runUrl: "https://github.com/run/1", when: "now" },
  );
  assert.match(report, /\*\*1 of 2 checks failing\*\*/);
  assert.match(report, /\| B \| FAIL \| x \/ y \| 7 ms \|/);
  assert.match(report, /Workflow run: https:\/\/github.com\/run\/1/);
});
