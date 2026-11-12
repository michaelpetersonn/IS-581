#!/usr/bin/env node
/**
 * Synthetic checks for the live site and policy proxy. Used by the scheduled monitor
 * (.github/workflows/monitor.yml), the post-deploy check in CI, and the proxy deploy script.
 *
 * node scripts/monitor.mjs [--site-only | --proxy-only] [--proxy-url URL]
 *   [--expect-commit SHA] [--expect-proxy-version SHA] [--wait SECONDS]
 *   [--report FILE] [--simulate-failure]
 *
 * Exits 1 when any check fails, so the calling workflow fails and alerts.
 */
import { appendFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { PROXY_URL } from "../docs/try/config.js";

export const DEFAULTS = {
  siteUrl: "https://michael-peterson.com/IS-581/",
  proxyUrl: PROXY_URL,
  origin: "https://michael-peterson.com",
  livePolicyUrl: "https://duckduckgo.com/privacy",
  timeoutMs: 15_000,
  retryDelayMs: 5_000,
};

/**
 * @typedef {{ name: string, ok: boolean, detail: string, ms: number }} CheckResult
 * @typedef {{ fetchImpl?: typeof fetch, retryDelayMs?: number, timeoutMs?: number }} ProbeOptions
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run one check, retrying once so a single dropped request does not page anyone.
 * @param {string} name
 * @param {() => Promise<string>} fn resolves with a short detail, throws on failure
 * @param {ProbeOptions} opts
 * @returns {Promise<CheckResult>}
 */
export async function probe(name, fn, opts = {}) {
  const retryDelayMs = opts.retryDelayMs ?? DEFAULTS.retryDelayMs;
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    const started = Date.now();
    try {
      const detail = await fn();
      return { name, ok: true, detail, ms: Date.now() - started };
    } catch (err) {
      lastError = {
        message: err?.message || String(err),
        ms: Date.now() - started,
      };
      if (attempt === 0 && retryDelayMs > 0) await sleep(retryDelayMs);
    }
  }
  return { name, ok: false, detail: lastError.message, ms: lastError.ms };
}

/**
 * @param {string} url
 * @param {ProbeOptions & { headers?: Record<string, string> }} opts
 */
async function get(url, opts) {
  const fetchImpl = opts.fetchImpl || fetch;
  const res = await fetchImpl(url, {
    headers: { "User-Agent": "c3nsor-monitor", ...(opts.headers || {}) },
    signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULTS.timeoutMs),
  });
  const body = await res.text();
  return { res, body };
}

/**
 * @param {ProbeOptions & { siteUrl?: string }} opts
 * @returns {Promise<CheckResult[]>}
 */
export async function checkSite(opts = {}) {
  const siteUrl = opts.siteUrl || DEFAULTS.siteUrl;
  return [
    await probe(
      "Website home page",
      async () => {
        const { res, body } = await get(siteUrl, opts);
        if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
        if (!/c3nsor/i.test(body))
          throw new Error("page is missing c3nsor content");
        return `HTTP 200, ${body.length} bytes`;
      },
      opts,
    ),
    await probe(
      "Try it page",
      async () => {
        const { res, body } = await get(
          new URL("try.html", siteUrl).href,
          opts,
        );
        if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
        if (!body.includes('id="url-form"'))
          throw new Error("analyzer form is missing");
        return `HTTP 200, ${body.length} bytes`;
      },
      opts,
    ),
  ];
}

/**
 * @param {ProbeOptions & { proxyUrl?: string, origin?: string, livePolicyUrl?: string, expectVersion?: string|null }} opts
 * @returns {Promise<CheckResult[]>}
 */
export async function checkProxy(opts = {}) {
  const proxyUrl = opts.proxyUrl || DEFAULTS.proxyUrl;
  const origin = opts.origin || DEFAULTS.origin;
  const livePolicyUrl = opts.livePolicyUrl || DEFAULTS.livePolicyUrl;
  return [
    await probe(
      "Proxy health",
      async () => {
        const { res, body } = await get(
          new URL("/health", proxyUrl).href,
          opts,
        );
        if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
        let health;
        try {
          health = JSON.parse(body);
        } catch {
          throw new Error("health response is not JSON");
        }
        if (health.ok !== true) throw new Error("health reported not ok");
        if (opts.expectVersion && health.version !== opts.expectVersion) {
          throw new Error(
            `running version ${health.version}, expected ${opts.expectVersion}`,
          );
        }
        return `ok, version ${health.version}, ${health.env}`;
      },
      opts,
    ),
    await probe(
      "Proxy live policy fetch",
      async () => {
        const endpoint = new URL(proxyUrl);
        endpoint.searchParams.set("url", livePolicyUrl);
        const { res, body } = await get(endpoint.href, {
          ...opts,
          headers: { Origin: origin },
        });
        const ref = res.headers.get("X-Request-Id");
        const suffix = ref ? ` (request ${ref})` : "";
        if (res.status !== 200) throw new Error(`HTTP ${res.status}${suffix}`);
        if (body.length < 1000 || !/privacy/i.test(body)) {
          throw new Error(
            `policy text looks wrong (${body.length} bytes)${suffix}`,
          );
        }
        return `HTTP 200, ${body.length} bytes from ${new URL(livePolicyUrl).hostname}${suffix}`;
      },
      opts,
    ),
  ];
}

/**
 * Poll the deployed version.json until it reports the expected commit.
 * @param {ProbeOptions & { siteUrl?: string, expectCommit: string, waitSeconds?: number, pollMs?: number }} opts
 * @returns {Promise<CheckResult>}
 */
export async function checkSiteVersion(opts) {
  const siteUrl = opts.siteUrl || DEFAULTS.siteUrl;
  const deadline = Date.now() + (opts.waitSeconds ?? 0) * 1000;
  const pollMs = opts.pollMs ?? 15_000;
  const started = Date.now();
  let last;
  for (;;) {
    try {
      const url = new URL("version.json", siteUrl);
      url.searchParams.set("t", String(Date.now()));
      const { res, body } = await get(url.href, opts);
      if (res.status === 200) {
        const info = JSON.parse(body);
        if (info.commit === opts.expectCommit) {
          return {
            name: "Deployed site version",
            ok: true,
            detail: `commit ${info.commit}, extension ${info.extensionVersion}, built ${info.builtAt}`,
            ms: Date.now() - started,
          };
        }
        last = `site reports commit ${info.commit}`;
      } else {
        last = `version.json HTTP ${res.status}`;
      }
    } catch (err) {
      last = err?.message || String(err);
    }
    if (Date.now() + pollMs > deadline) break;
    await sleep(pollMs);
  }
  return {
    name: "Deployed site version",
    ok: false,
    detail: `${last}, expected ${opts.expectCommit}`,
    ms: Date.now() - started,
  };
}

/**
 * @param {CheckResult[]} results
 * @param {{ runUrl?: string|null, when?: string }} [meta]
 */
export function formatReport(results, meta = {}) {
  const failed = results.filter((r) => !r.ok);
  const lines = [
    failed.length
      ? `**${failed.length} of ${results.length} checks failing**`
      : `**All ${results.length} checks passing**`,
    "",
    "| Check | Result | Detail | Time |",
    "| --- | --- | --- | --- |",
    ...results.map(
      (r) =>
        `| ${r.name} | ${r.ok ? "PASS" : "FAIL"} | ${r.detail.replace(/\|/g, "/")} | ${r.ms} ms |`,
    ),
    "",
    `Checked at ${meta.when || new Date().toISOString()}.`,
  ];
  if (meta.runUrl) lines.push(`Workflow run: ${meta.runUrl}`);
  return lines.join("\n");
}

/** @param {string[]} argv */
export function parseArgs(argv) {
  const opts = {
    site: true,
    proxy: true,
    proxyUrl: null,
    expectCommit: null,
    expectProxyVersion: null,
    waitSeconds: 0,
    report: null,
    simulateFailure: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (!value || value.startsWith("--"))
        throw new Error(`${arg} needs a value`);
      return value;
    };
    if (arg === "--site-only") opts.proxy = false;
    else if (arg === "--proxy-only") opts.site = false;
    else if (arg === "--proxy-url") opts.proxyUrl = next();
    else if (arg === "--expect-commit") opts.expectCommit = next();
    else if (arg === "--expect-proxy-version") opts.expectProxyVersion = next();
    else if (arg === "--wait") opts.waitSeconds = Number(next());
    else if (arg === "--report") opts.report = next();
    else if (arg === "--simulate-failure") opts.simulateFailure = true;
    else throw new Error(`Unknown option ${arg}`);
  }
  return opts;
}

/**
 * @param {ReturnType<typeof parseArgs>} args
 * @param {ProbeOptions} [probeOpts]
 * @returns {Promise<CheckResult[]>}
 */
export async function runChecks(args, probeOpts = {}) {
  const results = [];
  if (args.site && args.expectCommit) {
    results.push(
      await checkSiteVersion({
        ...probeOpts,
        expectCommit: args.expectCommit,
        waitSeconds: args.waitSeconds,
      }),
    );
  }
  if (args.site) results.push(...(await checkSite(probeOpts)));
  if (args.proxy) {
    results.push(
      ...(await checkProxy({
        ...probeOpts,
        proxyUrl: args.proxyUrl || undefined,
        expectVersion: args.expectProxyVersion,
      })),
    );
  }
  if (args.simulateFailure) {
    results.push({
      name: "Simulated failure (manual test of alerting)",
      ok: false,
      detail:
        "Requested with --simulate-failure; the site and proxy were not affected.",
      ms: 0,
    });
  }
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const results = await runChecks(args);
  const {
    GITHUB_SERVER_URL,
    GITHUB_REPOSITORY,
    GITHUB_RUN_ID,
    GITHUB_STEP_SUMMARY,
  } = process.env;
  const runUrl =
    GITHUB_RUN_ID && GITHUB_REPOSITORY
      ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
      : null;
  const report = formatReport(results, { runUrl });
  console.log(report);
  if (args.report) writeFileSync(args.report, `${report}\n`);
  if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, `${report}\n`);
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((err) => {
    console.error(err?.message || err);
    process.exitCode = 2;
  });
}
