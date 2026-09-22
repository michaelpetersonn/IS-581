import { htmlToPlainText } from "../lib/clean.js";
import { fetchPolicyHtml } from "../lib/fetch.js";
import { analyzePolicy } from "../lib/rules.js";
import { buildGuidance } from "../lib/templates.js";
import { getCached, setCached, clearCache } from "../lib/cache.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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

async function handleMessage(message) {
  if (!message || typeof message !== "object") {
    return { ok: false, error: "Invalid message." };
  }

  if (message.type === "CLEAR_CACHE") {
    await clearCache();
    const tab = await getActiveTab();
    if (tab?.id) await clearAlertBadge(tab.id);
    return { ok: true };
  }

  if (message.type === "ANALYZE_TAB") {
    return analyzeActiveTab({
      force: Boolean(message.force),
      policyUrlOverride: message.policyUrl || null
    });
  }

  return { ok: false, error: "Unknown message type." };
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
      discovery = injected[0].result;
    }
  } catch {
    // Restricted pages or injection failure — still try common paths / pasted URL
    discovery.candidates = defaultCandidates(tabUrl.origin);
  }

  if (!discovery.candidates?.length) {
    discovery.candidates = defaultCandidates(tabUrl.origin);
  }

  let policyUrl = opts.policyUrlOverride;
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
  } else {
    policyUrl = await pickWorkingPolicyUrl(discovery.candidates);
  }

  if (!policyUrl) {
    await clearAlertBadge(tab.id);
    return {
      ok: false,
      error:
        "No privacy policy was found on this page. Paste a policy URL below if you have one.",
      domain,
      pageUrl: tab.url,
      candidates: discovery.candidates
    };
  }

  const fetched = await fetchPolicyHtml(policyUrl);
  if (!fetched.ok) {
    await clearAlertBadge(tab.id);
    return {
      ok: false,
      error: fetched.error,
      domain,
      pageUrl: tab.url,
      policyUrl,
      candidates: discovery.candidates
    };
  }

  const text = htmlToPlainText(fetched.html);
  if (!text || text.length < 80) {
    await clearAlertBadge(tab.id);
    return {
      ok: false,
      error: "The policy page could not be read as text (empty or heavily scripted).",
      domain,
      pageUrl: tab.url,
      policyUrl: fetched.finalUrl,
      candidates: discovery.candidates
    };
  }

  const analysis = analyzePolicy(text, {
    policyUrl: fetched.finalUrl,
    pageLinks: discovery.pageLinks || []
  });

  if (!analysis.actions.policyUrl) {
    analysis.actions.policyUrl = fetched.finalUrl;
  }

  const guidance = buildGuidance(analysis.findings);
  const alertCount = analysis.alertCount ?? countAlerts(analysis.findings);

  const result = {
    domain,
    pageUrl: tab.url,
    policyUrl: fetched.finalUrl,
    findings: analysis.findings,
    actions: analysis.actions,
    guidance,
    alertCount,
    analyzedAt: new Date().toISOString()
  };

  await setCached(domain, result);
  await setAlertBadge(tab.id, alertCount);
  return { ok: true, fromCache: false, ...result };
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
    "/legal/privacy",
    "/policies/privacy"
  ].map((path) => ({ href: origin + path, text: path, score: 1 }));
}

/**
 * Probe candidates with HEAD/GET until one returns HTML-ish success.
 * @param {{ href: string, score: number }[]} candidates
 */
async function pickWorkingPolicyUrl(candidates) {
  for (const c of candidates.slice(0, 8)) {
    const result = await probeUrl(c.href);
    if (result) return result;
  }
  return null;
}

async function probeUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    // Prefer HEAD; fall back to a short GET if HEAD is rejected.
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      credentials: "omit",
      signal: controller.signal
    }).catch(() => null);

    if (!response || response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        credentials: "omit",
        signal: controller.signal,
        headers: { Accept: "text/html", Range: "bytes=0-2047" }
      });
    }

    if (!response.ok && response.status !== 206) return null;
    const type = response.headers.get("content-type") || "";
    if (type && !/html|text|xml|json/i.test(type) && response.status !== 206) {
      return null;
    }
    if (response.body) {
      try {
        await response.body.cancel();
      } catch {
        /* ignore */
      }
    }
    return response.url || url;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
