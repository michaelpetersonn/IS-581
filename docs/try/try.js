import { htmlToPlainText, looksAnalyzablePolicy, looksLikePrivacyPolicy } from "./engine/clean.js";
import { buildAnalysisResult } from "./engine/result.js";
import { PROXY_URL } from "./config.js";
import {
  MAX_PASTE_CHARS,
  compactCite,
  hostOf,
  isHttpUrl,
  looksLikeHtml,
  normalizeInputUrl,
  scorePolicyLink
} from "./web-helpers.js";

/** Same short labels as the extension popup. */
const DISPLAY_LABELS = {
  collected: "What data is collected",
  used: "How the data is used",
  shared: "Who the data is shared with",
  advertising: "Mentions sale / sharing",
  choices: "Access, opt-out, or deletion choices"
};
const ORDER = ["collected", "used", "shared", "advertising", "choices"];
const MAX_CANDIDATES = 3;
const MAX_PAGE_LINKS = 300;

const el = {
  samples: document.getElementById("sample-list"),
  sampleNote: document.getElementById("sample-note"),
  urlForm: document.getElementById("url-form"),
  urlInput: document.getElementById("url-input"),
  urlButton: document.querySelector("#url-form button"),
  urlNote: document.getElementById("url-note"),
  textForm: document.getElementById("text-form"),
  textInput: document.getElementById("text-input"),
  status: document.getElementById("result-status"),
  head: document.getElementById("result-head"),
  open: document.getElementById("result-open"),
  findings: document.getElementById("result-findings"),
  guidance: document.getElementById("result-guidance"),
  actLabel: document.getElementById("result-act-label"),
  acts: document.getElementById("result-acts")
};

/** Ignore results from an older run if the user started a new one. */
let runId = 0;

setupUrlForm();
el.textForm.addEventListener("submit", (event) => {
  event.preventDefault();
  analyzePastedText(el.textInput.value);
});
loadSamples();

async function loadSamples() {
  try {
    const res = await fetch(new URL("./samples.json", import.meta.url));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const samples = Array.isArray(data.samples) ? data.samples : [];
    const date = data.generatedAt ? new Date(data.generatedAt).toLocaleDateString() : "";

    for (const sample of samples) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "try-sample";
      btn.setAttribute("aria-pressed", "false");
      const name = document.createElement("strong");
      name.textContent = sample.result.domain;
      const count = document.createElement("span");
      count.textContent = `${sample.result.alertCount}/5 found`;
      btn.append(name, count);
      btn.addEventListener("click", () => {
        runId++;
        for (const b of el.samples.querySelectorAll("button")) b.setAttribute("aria-pressed", "false");
        btn.setAttribute("aria-pressed", "true");
        renderResult(sample.result, date ? `Saved snapshot from ${date} · same rules as the extension` : "Saved snapshot");
        revealResult();
      });
      el.samples.appendChild(btn);
    }
    const first = samples[0];
    if (first) {
      el.samples.querySelector("button")?.setAttribute("aria-pressed", "true");
      renderResult(first.result, date ? `Saved snapshot from ${date} · same rules as the extension` : "Saved snapshot");
    }
  } catch {
    el.sampleNote.textContent = "Samples could not load. Try pasting policy text instead.";
  }
}

function setupUrlForm() {
  if (!PROXY_URL) {
    el.urlInput.disabled = true;
    el.urlButton.disabled = true;
    el.urlNote.textContent =
      "Live URL analysis isn’t switched on for this site yet. Use a sample or paste policy text.";
    return;
  }
  el.urlNote.textContent =
    "Paste a homepage or a privacy-policy link. Pages are downloaded through our proxy and analyzed in your browser.";
  el.urlForm.addEventListener("submit", (event) => {
    event.preventDefault();
    analyzeUrl(el.urlInput.value);
  });
}

/**
 * @param {string} raw
 */
async function analyzeUrl(raw) {
  const target = normalizeInputUrl(raw);
  if (!target) {
    renderError("Enter a website or policy URL like duckduckgo.com.");
    return;
  }
  const myRun = ++runId;
  clearSampleSelection();
  renderLoading("Downloading the page…");
  revealResult();
  el.urlButton.disabled = true;

  try {
    const first = await proxyFetch(target);
    if (myRun !== runId) return;
    const firstDoc = parseHtml(first.html);
    const firstText = htmlToPlainText(first.html);
    let picked = looksLikePrivacyPolicy(firstText)
      ? { text: firstText, url: first.finalUrl, doc: firstDoc }
      : null;

    let candidates = [];
    if (!picked) {
      renderLoading("Looking for the privacy policy link…");
      candidates = findPolicyCandidates(firstDoc, first.finalUrl);
      picked = await pickPolicyFromCandidates(candidates, myRun);
      if (myRun !== runId) return;
    }
    if (!picked && looksAnalyzablePolicy(firstText)) {
      picked = { text: firstText, url: first.finalUrl, doc: firstDoc };
    }
    if (!picked) {
      renderError(
        "Couldn’t find readable policy text on that site. Open the policy to read it, or paste its text below.",
        candidates[0]?.href || first.finalUrl
      );
      return;
    }

    const pageLinks = [...collectLinks(firstDoc, first.finalUrl), ...collectLinks(picked.doc, picked.url)];
    const result = buildAnalysisResult(picked.text, {
      domain: hostOf(target) || hostOf(picked.url),
      policyUrl: picked.url,
      pageUrl: target,
      pageLinks: pageLinks.slice(0, MAX_PAGE_LINKS)
    });
    renderResult(result, "Rules matched language in this policy");
  } catch (err) {
    if (myRun !== runId) return;
    renderError(err?.message || "Could not download that page.", target);
  } finally {
    if (myRun === runId) el.urlButton.disabled = false;
  }
}

/**
 * @param {{ href: string, score: number }[]} candidates
 * @param {number} myRun
 */
async function pickPolicyFromCandidates(candidates, myRun) {
  for (const c of candidates.slice(0, MAX_CANDIDATES)) {
    if (myRun !== runId) return null;
    try {
      const page = await proxyFetch(c.href);
      const text = htmlToPlainText(page.html);
      if (looksLikePrivacyPolicy(text) || (c.score >= 5 && looksAnalyzablePolicy(text))) {
        return { text, url: page.finalUrl, doc: parseHtml(page.html) };
      }
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

/**
 * @param {string} url
 * @returns {Promise<{ html: string, finalUrl: string }>}
 */
async function proxyFetch(url) {
  const endpoint = new URL(PROXY_URL);
  endpoint.searchParams.set("url", url);
  const res = await fetch(endpoint, { credentials: "omit" });
  if (!res.ok) {
    let message = "";
    try {
      message = (await res.json()).error || "";
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message || `Could not download that page (HTTP ${res.status}).`);
  }
  return { html: await res.text(), finalUrl: res.headers.get("X-Final-Url") || url };
}

/** DOMParser never runs page scripts, so third-party HTML stays inert. */
function parseHtml(html) {
  return new DOMParser().parseFromString(html, "text/html");
}

/**
 * @param {Document} doc
 * @param {string} baseUrl
 * @returns {{ href: string, text: string }[]}
 */
function collectLinks(doc, baseUrl) {
  const links = [];
  for (const a of doc.querySelectorAll("a[href]")) {
    try {
      const href = new URL(a.getAttribute("href"), baseUrl).href;
      if (!isHttpUrl(href)) continue;
      links.push({ href, text: (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120) });
    } catch {
      /* skip bad href */
    }
    if (links.length >= MAX_PAGE_LINKS) break;
  }
  return links;
}

/**
 * @param {Document} doc
 * @param {string} baseUrl
 */
function findPolicyCandidates(doc, baseUrl) {
  const pageHost = hostOf(baseUrl);
  const seen = new Set();
  const out = [];
  for (const link of collectLinks(doc, baseUrl)) {
    const key = link.href.split("#")[0];
    if (seen.has(key) || key === baseUrl.split("#")[0]) continue;
    const score = scorePolicyLink(link.href, link.text, pageHost);
    if (score <= 0) continue;
    seen.add(key);
    out.push({ href: key, text: link.text, score });
  }
  return out.sort((a, b) => b.score - a.score);
}

/**
 * @param {string} raw
 */
function analyzePastedText(raw) {
  runId++;
  clearSampleSelection();
  const input = String(raw || "");
  if (input.length > MAX_PASTE_CHARS) {
    renderError("That text is too long. Paste just the privacy policy.");
    revealResult();
    return;
  }
  const text = looksLikeHtml(input) ? htmlToPlainText(input) : input.replace(/\r/g, "").trim();
  if (!looksAnalyzablePolicy(text)) {
    renderError("That doesn’t look like a privacy policy yet. Paste the full policy text (at least a few paragraphs).");
    revealResult();
    return;
  }
  const result = buildAnalysisResult(text, { domain: "Pasted policy", policyUrl: null });
  renderResult(result, "Rules matched language in your pasted text");
  revealResult();
}

/** On one-column layouts the card sits below the forms; bring it into view after a user action. */
function revealResult() {
  const card = document.querySelector(".try-card");
  const rect = card.getBoundingClientRect();
  if (rect.top > window.innerHeight * 0.6 || rect.bottom < 0) {
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function clearSampleSelection() {
  for (const b of el.samples.querySelectorAll("button")) b.setAttribute("aria-pressed", "false");
}

function setStatus(text, kind = "") {
  el.status.textContent = text;
  el.status.className = `try-kicker${kind ? ` ${kind}` : ""}`;
}

function hideResultParts() {
  for (const part of [el.head, el.open, el.findings, el.guidance, el.actLabel, el.acts]) {
    part.classList.add("hidden");
    part.replaceChildren();
  }
}

function renderLoading(message) {
  hideResultParts();
  setStatus(message, "loading");
}

/**
 * @param {string} message
 * @param {string|null} [openUrl]
 */
function renderError(message, openUrl = null) {
  hideResultParts();
  setStatus(message, "error");
  if (openUrl && isHttpUrl(openUrl)) {
    el.open.append(linkButton(openUrl, "Open privacy policy", "try-open-primary"));
    el.open.classList.remove("hidden");
  }
}

/**
 * @param {ReturnType<typeof buildAnalysisResult>} result
 * @param {string} statusText
 */
function renderResult(result, statusText) {
  hideResultParts();
  setStatus(statusText);

  const domain = document.createElement("strong");
  domain.textContent = result.domain;
  if (result.policyUrl) domain.title = result.policyUrl;
  const alerts = document.createElement("span");
  alerts.className = "try-alerts";
  alerts.textContent = result.alertCount === 1 ? "1 alert" : `${result.alertCount} alerts`;
  el.head.append(domain, alerts);
  el.head.classList.remove("hidden");

  for (const id of ORDER) {
    const item = result.findings?.[id];
    if (!item) continue;
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "try-row-main";
    const badge = document.createElement("span");
    badge.className = `try-badge ${item.found ? "found" : "miss"}`;
    badge.textContent = item.found ? "Found" : "Unclear";
    const label = document.createElement("span");
    label.className = "try-label";
    label.textContent = DISPLAY_LABELS[id] || item.label;
    row.append(badge, label);
    li.append(row);

    if (item.found) {
      const summary = document.createElement("p");
      summary.className = "try-summary";
      summary.textContent = item.summary || item.explanation || "";
      li.append(summary);
      if (item.excerpt) {
        const cite = document.createElement("p");
        cite.className = "try-excerpt";
        cite.title = item.excerpt;
        cite.textContent = `“${compactCite(item.excerpt)}”`;
        li.append(cite);
      }
    }
    el.findings.append(li);
  }
  el.findings.classList.remove("hidden");

  if (result.guidance) {
    el.guidance.textContent = result.guidance;
    el.guidance.classList.remove("hidden");
  }

  const acts = result.actions || {};
  el.acts.append(
    acts.policyUrl && isHttpUrl(acts.policyUrl) ? linkButton(acts.policyUrl, "Open policy") : disabledButton("Open policy", "No policy link for pasted text."),
    acts.optOutUrl && isHttpUrl(acts.optOutUrl) ? linkButton(acts.optOutUrl, "Opt out") : disabledButton("Opt out", "No opt-out link found."),
    acts.contactEmail ? copyButton(acts.contactEmail) : disabledButton("Copy email", "No privacy contact email found.")
  );
  el.actLabel.classList.remove("hidden");
  el.acts.classList.remove("hidden");
}

function linkButton(href, label, className = "") {
  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = label;
  a.title = href;
  if (className) a.className = className;
  return a;
}

function disabledButton(label, title) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.disabled = true;
  btn.textContent = label;
  btn.title = title;
  return btn;
}

function copyButton(email) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Copy email";
  btn.title = email;
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(email);
      btn.textContent = "Copied";
    } catch {
      btn.textContent = "Copy failed";
    }
    setTimeout(() => {
      btn.textContent = "Copy email";
    }, 1500);
  });
  return btn;
}
