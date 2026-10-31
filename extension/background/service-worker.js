import {
  htmlToPlainText,
  looksLikePrivacyPolicy,
  looksAnalyzablePolicy,
} from "../lib/clean.js";
import { fetchPolicyHtml, FETCH_TIMEOUT_MS, MAX_BYTES } from "../lib/fetch.js";
import { createPolicyFetcher } from "../lib/policy-access.js";
import { buildAnalysisResult } from "../lib/result.js";
import { getCached, setCached, clearCache } from "../lib/cache.js";
import {
  isTrustedSender,
  sanitizeDiscovery,
  validateMessage,
} from "../lib/messages.js";

/** Accent red for toolbar alert counts (matches product accent). */
const BADGE_RED = "#b42318";
const BACKGROUND_ORIGINS = ["http://*/*", "https://*/*"];
const SCAN_DEBOUNCE_MS = 450;

/** @type {Map<number, ReturnType<typeof setTimeout>>} */
const scanTimers = new Map();
/** @type {Set<number>} */
const inflightScans = new Set();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isTrustedSender(sender, chrome.runtime.id, chrome.runtime.getURL(""))) {
    return false;
  }
  handleMessage(message)
    .then(sendResponse)
    .catch((err) =>
      sendResponse({
        ok: false,
        error: err?.message || "Unexpected extension error.",
      }),
    );
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  scheduleBackgroundScan(tabId, tab?.url);
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs
    .get(tabId)
    .then((tab) => scheduleBackgroundScan(tabId, tab?.url))
    .catch(() => {});
});

chrome.permissions.onRemoved.addListener(() => {
  // If background access is revoked, clear badges on the next scan attempt.
});

async function handleMessage(raw) {
  const checked = validateMessage(raw);
  if (!checked.ok) return checked;
  const message = checked.message;

  if (message.type === "CLEAR_CACHE") {
    await clearCache();
    const tab = await getActiveTab();
    if (tab?.id) await clearAlertBadge(tab.id);
    return { ok: true };
  }

  if (message.type === "GET_BACKGROUND_STATUS") {
    const enabled = await hasBackgroundAccess();
    return { ok: true, enabled };
  }

  if (message.type === "BACKGROUND_READY") {
    const enabled = await hasBackgroundAccess();
    if (!enabled) {
      return {
        ok: false,
        error: "Background site access is not enabled yet.",
        enabled: false,
      };
    }
    const tab = await getActiveTab();
    if (tab?.id) await runBackgroundScan(tab.id);
    return { ok: true, enabled: true };
  }

  return analyzeActiveTab({
    force: message.force,
    policyUrlOverride: message.policyUrl,
  });
}

function scheduleBackgroundScan(tabId, url) {
  if (!tabId || !isHttpUrl(url)) return;
  const existing = scanTimers.get(tabId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    scanTimers.delete(tabId);
    runBackgroundScan(tabId).catch(() => {});
  }, SCAN_DEBOUNCE_MS);
  scanTimers.set(tabId, timer);
}

async function runBackgroundScan(tabId) {
  if (inflightScans.has(tabId)) return;
  if (!(await hasBackgroundAccess())) return;

  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return;
  }
  if (!tab?.id || !isHttpUrl(tab.url)) {
    if (tab?.id) await clearAlertBadge(tab.id);
    return;
  }

  inflightScans.add(tabId);
  try {
    await analyzeTab(tab, { force: false, quiet: true });
  } catch {
    await clearAlertBadge(tabId).catch(() => {});
  } finally {
    inflightScans.delete(tabId);
  }
}

async function hasBackgroundAccess() {
  try {
    return await chrome.permissions.contains({ origins: BACKGROUND_ORIGINS });
  } catch {
    return false;
  }
}

/**
 * @param {{ force?: boolean, policyUrlOverride?: string|null }} opts
 */
async function analyzeActiveTab(opts) {
  const tab = await getActiveTab();
  if (!tab?.id || !tab.url) {
    return { ok: false, error: "No active tab found." };
  }
  return analyzeTab(tab, opts);
}

/**
 * @param {chrome.tabs.Tab} tab
 * @param {{ force?: boolean, policyUrlOverride?: string|null, quiet?: boolean }} opts
 */
async function analyzeTab(tab, opts) {
  const quiet = Boolean(opts.quiet);

  let tabUrl;
  try {
    tabUrl = new URL(tab.url);
  } catch {
    if (quiet) {
      await clearAlertBadge(tab.id);
      return { ok: false, error: "This page cannot be analyzed." };
    }
    return { ok: false, error: "This page cannot be analyzed." };
  }

  if (tabUrl.protocol !== "http:" && tabUrl.protocol !== "https:") {
    await clearAlertBadge(tab.id);
    return {
      ok: false,
      error:
        "Open a normal website (http/https). Chrome system pages cannot be scanned.",
    };
  }

  const domain = tabUrl.hostname;

  if (!opts.force && !opts.policyUrlOverride) {
    const cached = await getCached(domain);
    if (cached) {
      await setAlertBadge(
        tab.id,
        cached.alertCount ?? countAlerts(cached.findings),
      );
      return { ok: true, fromCache: true, ...cached };
    }
  }

  let discovery = {
    candidates: [],
    pageLinks: [],
    origin: tabUrl.origin,
    pageUrl: tab.url,
  };

  try {
    const injected = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/discover.js"],
    });
    if (injected?.[0]?.result) {
      discovery = sanitizeDiscovery(injected[0].result, discovery);
    }
  } catch {
    discovery.candidates = defaultCandidates(tabUrl.origin);
  }

  if (!discovery.candidates?.length) {
    discovery.candidates = defaultCandidates(tabUrl.origin);
  }

  const fetchPolicy = createPolicyFetcher({
    pageUrl: tab.url,
    fetchInPage: (url) => fetchInTab(tab.id, url),
    hasHostAccess: (pattern) =>
      chrome.permissions.contains({ origins: [pattern] }),
    fetchDirect: (url) => fetchPolicyHtml(url),
  });

  let policyUrl = opts.policyUrlOverride;
  let fetched;
  let text;

  if (policyUrl) {
    try {
      const u = new URL(policyUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return { ok: false, error: "Policy URL must be http or https." };
      }
      policyUrl = u.href;
    } catch {
      return { ok: false, error: "That policy URL is not valid." };
    }
    fetched = await fetchPolicy(policyUrl);
    if (!fetched.ok) {
      await clearAlertBadge(tab.id);
      if (quiet) return { ok: false, error: fetched.error };
      return {
        ok: false,
        error: fetched.error,
        needsPermission: permissionRequest(fetched),
        domain,
        pageUrl: tab.url,
        policyUrl,
        openPolicyUrl: policyUrl,
        candidates: discovery.candidates,
      };
    }
    text = htmlToPlainText(fetched.html);
    if (!looksAnalyzablePolicy(text)) {
      await clearAlertBadge(tab.id);
      if (quiet) return { ok: false, error: "Not enough policy text." };
      return {
        ok: false,
        error:
          "Couldn’t extract enough policy text from that page (often a hub or script-heavy page). Open the link to read it, or paste a full policy URL.",
        domain,
        pageUrl: tab.url,
        policyUrl: fetched.finalUrl,
        openPolicyUrl: fetched.finalUrl,
        candidates: discovery.candidates,
      };
    }
  } else {
    const picked = await pickReadablePolicy(
      discovery.candidates,
      tab.url,
      fetchPolicy,
    );
    if (!picked.fetched) {
      await clearAlertBadge(tab.id);
      if (quiet) return { ok: false, error: "No privacy policy found." };
      if (picked.blocked) {
        return {
          ok: false,
          error: picked.blocked.error,
          needsPermission: permissionRequest(picked.blocked),
          domain,
          pageUrl: tab.url,
          openPolicyUrl: picked.blocked.url,
          candidates: discovery.candidates,
        };
      }
      const topHref = discovery.candidates?.[0]?.href || null;
      return {
        ok: false,
        error:
          "No privacy policy was found on this page. Try a suggested link below, open it to read, or paste a policy URL.",
        domain,
        pageUrl: tab.url,
        openPolicyUrl: topHref,
        candidates: discovery.candidates,
      };
    }
    fetched = picked.fetched;
    text = picked.text;
    policyUrl = fetched.finalUrl;
  }

  if (!text || text.length < 80) {
    await clearAlertBadge(tab.id);
    if (quiet) return { ok: false, error: "Policy text too short." };
    return {
      ok: false,
      error:
        "The policy page could not be read as text (empty or heavily scripted).",
      domain,
      pageUrl: tab.url,
      policyUrl: fetched?.finalUrl || policyUrl,
      openPolicyUrl: fetched?.finalUrl || policyUrl,
      candidates: discovery.candidates,
    };
  }

  const result = buildAnalysisResult(text, {
    domain,
    policyUrl: fetched.finalUrl,
    pageUrl: tab.url,
    pageLinks: discovery.pageLinks || [],
  });

  await setCached(domain, result);
  await setAlertBadge(tab.id, result.alertCount);
  return { ok: true, fromCache: false, ...result };
}

function normalizeUrlKey(url) {
  try {
    const u = new URL(url);
    return (u.origin + u.pathname).replace(/\/+$/, "").toLowerCase();
  } catch {
    return String(url || "").toLowerCase();
  }
}

/**
 * @param {{ href: string, score?: number }[]} candidates
 * @param {string} pageUrl
 * @param {(url: string) => Promise<any>} fetchPolicy
 */
async function pickReadablePolicy(candidates, pageUrl, fetchPolicy) {
  const pageKey = normalizeUrlKey(pageUrl);
  const list = [...(candidates || [])].sort((a, b) => {
    const aSame = normalizeUrlKey(a.href) === pageKey ? 1 : 0;
    const bSame = normalizeUrlKey(b.href) === pageKey ? 1 : 0;
    if (aSame !== bSame) return aSame - bSame;
    return (b.score || 0) - (a.score || 0);
  });

  let blocked = null;
  for (const c of list.slice(0, 8)) {
    if (normalizeUrlKey(c.href) === pageKey && (c.score || 0) < 8) {
      continue;
    }
    const fetched = await fetchPolicy(c.href);
    if (!fetched.ok) {
      if (fetched.needsPermission && !blocked) blocked = fetched;
      continue;
    }
    const text = htmlToPlainText(fetched.html);
    const ok =
      looksLikePrivacyPolicy(text) ||
      ((c.score || 0) >= 5 && looksAnalyzablePolicy(text));
    if (!ok) continue;
    return { fetched, text };
  }
  return { blocked };
}

function permissionRequest(result) {
  if (!result?.needsPermission) return undefined;
  return { origin: result.origin, host: result.host, url: result.url };
}

/**
 * @param {number} tabId
 * @param {string} url
 */
async function fetchInTab(tabId, url) {
  try {
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId },
      func: fetchPolicyHtml,
      args: [url, { maxBytes: MAX_BYTES, timeoutMs: FETCH_TIMEOUT_MS }],
    });
    return (
      injected?.result || {
        ok: false,
        error: "Could not read the policy from this page.",
      }
    );
  } catch {
    return { ok: false, error: "Could not read the policy from this page." };
  }
}

function countAlerts(findings) {
  if (!findings) return 0;
  return Object.values(findings).filter((f) => f?.found).length;
}

async function setAlertBadge(tabId, count) {
  const n = Number(count) || 0;
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_RED, tabId });
  await chrome.action
    .setBadgeTextColor({ color: "#ffffff", tabId })
    .catch(() => {});
  await chrome.action.setBadgeText({
    text: n > 0 ? String(Math.min(n, 9)) : "",
    tabId,
  });
}

async function clearAlertBadge(tabId) {
  await chrome.action.setBadgeText({ text: "", tabId });
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function isHttpUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function defaultCandidates(origin) {
  return [
    "/privacy",
    "/privacy-policy",
    "/privacy-policy.html",
    "/privacy-statement",
    "/privacy-notice",
    "/legal/privacy",
    "/policies/privacy",
    "/company/privacy",
  ].map((path) => ({ href: origin + path, text: path, score: 1 }));
}
