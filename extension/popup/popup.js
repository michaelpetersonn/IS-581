import { isSameOrigin, originPattern } from "../lib/policy-access.js";
import {
  buildDisabledAction,
  buildFinding,
  buildLink,
  buildMeta,
  el,
  hostOf,
  isHttpUrl,
  shortUrl
} from "./render.js";

const PENDING_KEY = "c3nsor:pendingPolicyUrl";
const PENDING_TTL_MS = 2 * 60 * 1000;

const statusEl = document.getElementById("status");
const metaEl = document.getElementById("meta");
const alternativesEl = document.getElementById("alternatives");
const findingsEl = document.getElementById("findings");
const guidanceEl = document.getElementById("guidance");
const actLabelEl = document.getElementById("act-label");
const actionsEl = document.getElementById("actions");
const policyInput = document.getElementById("policy-url");

/** Shorter labels aligned with the docs extension mockup. */
const DISPLAY_LABELS = {
  collected: "What data is collected",
  used: "How the data is used",
  shared: "Who the data is shared with",
  advertising: "Mentions sale / sharing",
  choices: "Access, opt-out, or deletion choices"
};

document.getElementById("refresh-btn").addEventListener("click", () => {
  runAnalyze({ force: true });
});

let pageUrl = "";

document.getElementById("analyze-url-btn").addEventListener("click", () => {
  const url = policyInput.value.trim();
  if (!url) {
    showError("Paste a privacy policy URL first.");
    return;
  }
  analyzeUrl(url);
});

document.getElementById("clear-cache-btn").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "CLEAR_CACHE" });
  statusEl.textContent = "Cache cleared. Refresh to re-analyze.";
  statusEl.className = "ext-kicker status";
  alternativesEl.classList.add("hidden");
});

start();

async function start() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
  pageUrl = tab?.url || "";
  const pending = await takePendingPolicyUrl();
  if (pending) {
    policyInput.value = pending;
    runAnalyze({ force: true, policyUrl: pending });
    return;
  }
  runAnalyze({ force: false });
}

/**
 * Policies on another host need that host's permission. Chrome only shows its prompt
 * when chrome.permissions.request runs inside the click, before any other await.
 * @param {string} url
 */
async function analyzeUrl(url) {
  if (!isHttpUrl(url)) {
    showError("Policy URL must be a full http or https link.");
    return;
  }
  if (!isSameOrigin(url, pageUrl)) {
    const granted = await requestHostAccess(url);
    if (!granted) {
      showError(
        `c3nsor can only read ${hostOf(url)} if you allow it. You can still open the policy and read it yourself.`,
        { openPolicyUrl: url }
      );
      return;
    }
  }
  runAnalyze({ force: true, policyUrl: url });
}

/** @param {string} url */
async function requestHostAccess(url) {
  // Chrome's prompt can close the popup; the next open resumes this URL.
  chrome.storage.session.set({ [PENDING_KEY]: { url, pageUrl, at: Date.now() } }).catch(() => {});
  let granted = false;
  try {
    granted = await chrome.permissions.request({ origins: [originPattern(url)] });
  } catch {
    granted = false;
  }
  await chrome.storage.session.remove(PENDING_KEY).catch(() => {});
  return granted;
}

async function takePendingPolicyUrl() {
  const data = await chrome.storage.session.get(PENDING_KEY).catch(() => ({}));
  const pending = data?.[PENDING_KEY];
  if (!pending) return null;
  await chrome.storage.session.remove(PENDING_KEY).catch(() => {});
  const fresh = Date.now() - (pending.at || 0) < PENDING_TTL_MS;
  return fresh && pending.pageUrl === pageUrl && isHttpUrl(pending.url) ? pending.url : null;
}

/**
 * @param {{ force?: boolean, policyUrl?: string }} opts
 */
async function runAnalyze(opts) {
  showLoading();
  try {
    const result = await chrome.runtime.sendMessage({
      type: "ANALYZE_TAB",
      force: Boolean(opts.force),
      policyUrl: opts.policyUrl || null
    });
    if (!result?.ok) {
      showError(result?.error || "Analysis failed.", result);
      return;
    }
    renderResult(result);
  } catch (err) {
    showError(err?.message || "Could not reach the extension background script.");
  }
}

function showLoading() {
  statusEl.textContent = "Finding and reading the privacy policy…";
  statusEl.className = "ext-kicker status loading";
  metaEl.classList.add("hidden");
  alternativesEl.classList.add("hidden");
  findingsEl.classList.add("hidden");
  guidanceEl.classList.add("hidden");
  actLabelEl.classList.add("hidden");
  actionsEl.classList.add("hidden");
}

function showError(message, detail) {
  statusEl.textContent = message;
  statusEl.className = "ext-kicker status error";
  findingsEl.classList.add("hidden");
  guidanceEl.classList.add("hidden");
  actLabelEl.classList.add("hidden");
  actionsEl.classList.add("hidden");

  if (detail?.domain) {
    metaEl.classList.remove("hidden");
    metaEl.replaceChildren(...buildMeta(document, { domain: detail.domain }));
  } else {
    metaEl.classList.add("hidden");
  }

  renderAlternatives(detail?.candidates || [], detail);
}

/**
 * Surface top policy URL candidates as one-click retries when discovery/fetch fails.
 * Each row: Analyze (try excerpts) + Open (always read the live page).
 * @param {{ href: string, text?: string }[]} candidates
 * @param {{ openPolicyUrl?: string, policyUrl?: string }|undefined} detail
 */
function renderAlternatives(candidates, detail) {
  const top = (candidates || []).slice(0, 4);
  const openFallback = detail?.openPolicyUrl || detail?.policyUrl || top[0]?.href || null;
  const access = detail?.needsPermission;

  if (!top.length && !openFallback && !access) {
    alternativesEl.classList.add("hidden");
    alternativesEl.replaceChildren();
    return;
  }

  alternativesEl.classList.remove("hidden");
  alternativesEl.replaceChildren();

  if (access && isHttpUrl(access.url)) {
    const allowRow = document.createElement("div");
    allowRow.className = "alt-open-row";
    const allowBtn = document.createElement("button");
    allowBtn.type = "button";
    allowBtn.className = "alt-open-primary";
    allowBtn.textContent = `Allow c3nsor to read ${access.host || hostOf(access.url)}`;
    allowBtn.addEventListener("click", () => {
      policyInput.value = access.url;
      analyzeUrl(access.url);
    });
    const why = document.createElement("p");
    why.className = "alt-hint";
    why.textContent =
      "c3nsor only reads sites you approve. Chrome will ask once for this site, and the policy is still analyzed on your device.";
    allowRow.append(allowBtn, why);
    alternativesEl.appendChild(allowRow);
  }

  const openBtn = openFallback && buildLink(document, openFallback, "Open privacy policy", "alt-open-primary");
  if (openBtn) {
    const openRow = document.createElement("div");
    openRow.className = "alt-open-row";
    openBtn.title = openFallback;
    openRow.appendChild(openBtn);
    alternativesEl.appendChild(openRow);
  }

  if (!top.length) return;

  const heading = document.createElement("h2");
  heading.textContent = "Try another policy URL";
  alternativesEl.appendChild(heading);

  const list = document.createElement("div");
  list.className = "alt-list";

  for (const c of top) {
    if (!isHttpUrl(c.href)) continue;

    const row = document.createElement("div");
    row.className = "alt-row";

    const analyzeBtn = document.createElement("button");
    analyzeBtn.type = "button";
    analyzeBtn.className = "alt-btn";
    const label =
      c.text && !c.text.startsWith("/") ? `${c.text} — ${shortUrl(c.href)}` : shortUrl(c.href);
    analyzeBtn.textContent = label;
    analyzeBtn.title = `Analyze ${c.href}`;
    analyzeBtn.addEventListener("click", () => {
      policyInput.value = c.href;
      analyzeUrl(c.href);
    });

    const openLink = buildLink(document, c.href, "Open", "alt-open");
    openLink.title = `Open ${c.href}`;

    row.appendChild(analyzeBtn);
    row.appendChild(openLink);
    list.appendChild(row);
  }

  alternativesEl.appendChild(list);

  const hint = document.createElement("p");
  hint.className = "alt-hint";
  hint.textContent =
    "Tap a suggestion to analyze it, or Open to read the page directly if excerpts can’t be pulled.";
  alternativesEl.appendChild(hint);
}

function renderResult(result) {
  statusEl.className = "ext-kicker status";
  statusEl.textContent = result.fromCache
    ? "Cached rules match for this site (session)"
    : "Rules matched language in this policy";

  alternativesEl.classList.add("hidden");
  alternativesEl.replaceChildren();

  const alertCount =
    typeof result.alertCount === "number"
      ? result.alertCount
      : Object.values(result.findings || {}).filter((f) => f?.found).length;

  metaEl.classList.remove("hidden");
  metaEl.replaceChildren(
    ...buildMeta(document, { domain: result.domain, policyUrl: result.policyUrl, alertCount })
  );

  findingsEl.classList.remove("hidden");
  findingsEl.replaceChildren();

  const order = ["collected", "used", "shared", "advertising", "choices"];
  for (const id of order) {
    const item = result.findings?.[id];
    if (!item) continue;
    findingsEl.appendChild(buildFinding(document, DISPLAY_LABELS[id] || item.label, item));
  }

  if (result.guidance) {
    guidanceEl.classList.remove("hidden");
    guidanceEl.replaceChildren(el(document, "p", { text: result.guidance }));
  } else {
    guidanceEl.classList.add("hidden");
    guidanceEl.replaceChildren();
  }

  actLabelEl.classList.remove("hidden");
  actionsEl.classList.remove("hidden");
  actionsEl.replaceChildren();
  const acts = result.actions || {};

  actionsEl.appendChild(
    buildLink(document, acts.policyUrl, "Open policy") || buildDisabledAction(document, "Open policy")
  );

  const openOptOut = buildLink(document, acts.optOutUrl, "Opt out");
  if (openOptOut) {
    actionsEl.appendChild(openOptOut);
  } else {
    const missing = buildDisabledAction(document, "Opt out");
    missing.title = "No opt-out link found on this page.";
    actionsEl.appendChild(missing);
  }

  if (acts.contactEmail) {
    const email = String(acts.contactEmail);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Copy email";
    btn.title = email;
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(email);
        btn.textContent = "Copied";
        setTimeout(() => {
          btn.textContent = "Copy email";
        }, 1500);
      } catch {
        btn.textContent = "Copy failed";
      }
    });
    actionsEl.appendChild(btn);
  } else {
    const missing = buildDisabledAction(document, "Copy email");
    missing.title = "No contact email found.";
    actionsEl.appendChild(missing);
  }
}
