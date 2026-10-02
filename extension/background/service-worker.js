import { htmlToPlainText, looksLikePrivacyPolicy, looksAnalyzablePolicy } from "../lib/clean.js";
import { fetchPolicyHtml, FETCH_TIMEOUT_MS, MAX_BYTES } from "../lib/fetch.js";
import { createPolicyFetcher } from "../lib/policy-access.js";
import { buildAnalysisResult } from "../lib/result.js";
import { getCached, setCached, clearCache } from "../lib/cache.js";
import { isTrustedSender, sanitizeDiscovery, validateMessage } from "../lib/messages.js";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isTrustedSender(sender, chrome.runtime.id, chrome.runtime.getURL(""))) {
    return false;
  }
  handleMessage(message)
    .then(sendResponse)
    .catch((err) =>
      sendResponse({
        ok: false,
        error: err?.message || "Unexpected extension error."
      })
    );
  return true;
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

  return analyzeActiveTab({
    force: message.force,
    policyUrlOverride: message.policyUrl
  });
}

/**
 * @param {{ force?: boolean, policyUrlOverride?: string|null }} opts
 */
async function analyzeActiveTab(opts) {
  const tab = await getActiveTab();
  if (!tab?.id || !tab.url) {
    return { ok: false, error: "No active tab found." };
  }

  let tabUrl;
  try {
    tabUrl = new URL(tab.url);
  } catch {
    return { ok: false, error: "This page cannot be analyzed." };
  }

  if (tabUrl.protocol !== "http:" && tabUrl.protocol !== "https:") {
    await clearAlertBadge(tab.id);
    return {
      ok: false,
      error: "Open a normal website (http/https). Chrome system pages cannot be scanned."
    };
  }

  const domain = tabUrl.hostname;

  if (!opts.force && !opts.policyUrlOverride) {
    const cached = await getCached(domain);
    if (cached) {
      await setAlertBadge(tab.id, cached.alertCount ?? countAlerts(cached.findings));
      return { ok: true, fromCache: true, ...cached };
    }
  }

  let discovery = {
    candidates: [],
    pageLinks: [],
    origin: tabUrl.origin,
    pageUrl: tab.url
  };

  try {
    const injected = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/discover.js"]
    });
    if (injected?.[0]?.result) {
      discovery = sanitizeDiscovery(injected[0].result, discovery);
    }
  } catch {
    // Restricted pages or injection failure — still try common paths / pasted URL
    discovery.candidates = defaultCandidates(tabUrl.origin);
  }

  if (!discovery.candidates?.length) {
    discovery.candidates = defaultCandidates(tabUrl.origin);
  }

  const fetchPolicy = createPolicyFetcher({
    pageUrl: tab.url,
    fetchInPage: (url) => fetchInTab(tab.id, url),
    hasHostAccess: (pattern) => chrome.permissions.contains({ origins: [pattern] }),
    fetchDirect: (url) => fetchPolicyHtml(url)
  });

  let policyUrl = opts.policyUrlOverride;
  let fetched = null;
  let text = "";

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
      return {
        ok: false,
        error: fetched.error,
        needsPermission: permissionRequest(fetched),
        domain,
        pageUrl: tab.url,
        policyUrl,
        openPolicyUrl: policyUrl,
        candidates: discovery.candidates
      };
    }
    text = htmlToPlainText(fetched.html);
    // User / candidate picked this URL — use a softer readability gate
    if (!looksAnalyzablePolicy(text)) {
      await clearAlertBadge(tab.id);
      return {
        ok: false,
        error:
          "Couldn’t extract enough policy text from that page (often a hub or script-heavy page). Open the link to read it, or paste a full policy URL.",
        domain,
        pageUrl: tab.url,
        policyUrl: fetched.finalUrl,
        openPolicyUrl: fetched.finalUrl,
        candidates: discovery.candidates
      };
    }
  } else {
    const picked = await pickReadablePolicy(discovery.candidates, tab.url, fetchPolicy);
    if (!picked.fetched) {
      await clearAlertBadge(tab.id);
      if (picked.blocked) {
        return {
          ok: false,
          error: picked.blocked.error,
          needsPermission: permissionRequest(picked.blocked),
          domain,
          pageUrl: tab.url,
          openPolicyUrl: picked.blocked.url,
          candidates: discovery.candidates
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
        candidates: discovery.candidates
      };
    }
    fetched = picked.fetched;
    text = picked.text;
    policyUrl = fetched.finalUrl;
  }

  if (!text || text.length < 80) {
    await clearAlertBadge(tab.id);
    return {
      ok: false,
      error: "The policy page could not be read as text (empty or heavily scripted).",
      domain,
      pageUrl: tab.url,
      policyUrl: fetched?.finalUrl || policyUrl,
      openPolicyUrl: fetched?.finalUrl || policyUrl,
      candidates: discovery.candidates
    };
  }

  const result = buildAnalysisResult(text, {
    domain,
    policyUrl: fetched.finalUrl,
    pageUrl: tab.url,
    pageLinks: discovery.pageLinks || []
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
 * Fetch candidates until one looks like a real privacy policy.
 * Prefer linked policies over the current page URL (avoids marketing-page false positives).
 * Returns the first candidate that needs a host permission when nothing readable was found.
 * @param {{ href: string, score?: number }[]} candidates
 * @param {string} pageUrl
 * @param {(url: string) => Promise<any>} fetchPolicy
 * @returns {Promise<{ fetched?: { html: string, finalUrl: string }, text?: string, blocked?: any }>}
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
    // Skip analyzing the current marketing page unless it strongly looks like a policy URL
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

/** Only the fields the popup needs to ask for one host’s permission. */
function permissionRequest(result) {
  if (!result?.needsPermission) return undefined;
  return { origin: result.origin, host: result.host, url: result.url };
}

/**
 * Download a same-origin policy page from inside the tab, using the activeTab grant.
 * @param {number} tabId
 * @param {string} url
 */
async function fetchInTab(tabId, url) {
  try {
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId },
      func: fetchPolicyHtml,
      args: [url, { maxBytes: MAX_BYTES, timeoutMs: FETCH_TIMEOUT_MS }]
    });
    return injected?.result || { ok: false, error: "Could not read the policy from this page." };
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
  await chrome.action.setBadgeBackgroundColor({ color: "#101010", tabId });
  await chrome.action.setBadgeTextColor({ color: "#ffffff", tabId }).catch(() => {});
  await chrome.action.setBadgeText({
    text: n > 0 ? String(n) : "",
    tabId
  });
}

async function clearAlertBadge(tabId) {
  await chrome.action.setBadgeText({ text: "", tabId });
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
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
    "/company/privacy"
  ].map((path) => ({ href: origin + path, text: path, score: 1 }));
}
