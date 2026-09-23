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

document.getElementById("analyze-url-btn").addEventListener("click", () => {
  const url = policyInput.value.trim();
  if (!url) {
    showError("Paste a privacy policy URL first.");
    return;
  }
  runAnalyze({ force: true, policyUrl: url });
});

document.getElementById("clear-cache-btn").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "CLEAR_CACHE" });
  statusEl.textContent = "Cache cleared. Refresh to re-analyze.";
  statusEl.className = "ext-kicker status";
  alternativesEl.classList.add("hidden");
});

runAnalyze({ force: false });

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
    metaEl.innerHTML = `<strong>${escapeHtml(detail.domain)}</strong>`;
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

  if (!top.length && !openFallback) {
    alternativesEl.classList.add("hidden");
    alternativesEl.innerHTML = "";
    return;
  }

  alternativesEl.classList.remove("hidden");
  alternativesEl.innerHTML = "";

  if (openFallback && isHttpUrl(openFallback)) {
    const openRow = document.createElement("div");
    openRow.className = "alt-open-row";
    const openBtn = document.createElement("a");
    openBtn.href = openFallback;
    openBtn.target = "_blank";
    openBtn.rel = "noopener noreferrer";
    openBtn.className = "alt-open-primary";
    openBtn.textContent = "Open privacy policy";
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
      runAnalyze({ force: true, policyUrl: c.href });
    });

    const openLink = document.createElement("a");
    openLink.href = c.href;
    openLink.target = "_blank";
    openLink.rel = "noopener noreferrer";
    openLink.className = "alt-open";
    openLink.textContent = "Open";
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
  alternativesEl.innerHTML = "";

  const alertCount =
    typeof result.alertCount === "number"
      ? result.alertCount
      : Object.values(result.findings || {}).filter((f) => f?.found).length;

  metaEl.classList.remove("hidden");
  const alertLabel = alertCount === 1 ? "1 alert" : `${alertCount} alerts`;
  metaEl.innerHTML = `
    <strong title="${escapeAttr(result.policyUrl || "")}">${escapeHtml(result.domain)}</strong>
    <span class="alerts">${escapeHtml(alertLabel)}</span>
  `;

  findingsEl.classList.remove("hidden");
  findingsEl.innerHTML = "";

  const order = ["collected", "used", "shared", "advertising", "choices"];
  for (const id of order) {
    const item = result.findings?.[id];
    if (!item) continue;

    const li = document.createElement("li");
    const label = DISPLAY_LABELS[id] || item.label;
    const badgeClass = item.found ? "found" : "miss";
    const badgeText = item.found ? "Found" : "Unclear";

    let body = `
      <div class="row-main">
        <span class="badge ${badgeClass}">${badgeText}</span>
        <span class="label">${escapeHtml(label)}</span>
      </div>
    `;

    if (item.found) {
      const summary =
        item.summary ||
        item.explanation ||
        "Mentioned in the policy, but details are unclear in one look.";
      body += `<p class="summary">${escapeHtml(summary)}</p>`;
      if (item.excerpt) {
        const cite = compactCite(item.excerpt);
        body += `<p class="excerpt" title="${escapeAttr(item.excerpt)}">“${escapeHtml(cite)}”</p>`;
      }
    }

    li.innerHTML = body;
    findingsEl.appendChild(li);
  }

  if (result.guidance) {
    guidanceEl.classList.remove("hidden");
    guidanceEl.innerHTML = `<p>${escapeHtml(result.guidance)}</p>`;
  } else {
    guidanceEl.classList.add("hidden");
    guidanceEl.innerHTML = "";
  }

  actLabelEl.classList.remove("hidden");
  actionsEl.classList.remove("hidden");
  actionsEl.innerHTML = "";
  const acts = result.actions || {};

  const openPolicy = linkBtn(acts.policyUrl, "Open policy");
  if (openPolicy) {
    actionsEl.appendChild(openPolicy);
  } else {
    actionsEl.appendChild(disabledAct("Open policy"));
  }

  if (acts.optOutUrl && isHttpUrl(acts.optOutUrl)) {
    const openOptOut = linkBtn(acts.optOutUrl, "Opt out");
    if (openOptOut) actionsEl.appendChild(openOptOut);
    else actionsEl.appendChild(disabledAct("Opt out"));
  } else {
    const missing = disabledAct("Opt out");
    missing.title = "No opt-out link found on this page.";
    actionsEl.appendChild(missing);
  }

  if (acts.contactEmail) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Copy email";
    btn.title = acts.contactEmail;
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(acts.contactEmail);
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
    const missing = disabledAct("Copy email");
    missing.title = "No contact email found.";
    actionsEl.appendChild(missing);
  }
}

function linkBtn(href, label) {
  const a = document.createElement("a");
  if (!isHttpUrl(href)) return null;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = label;
  return a;
}

function disabledAct(label) {
  const span = document.createElement("button");
  span.type = "button";
  span.textContent = label;
  span.disabled = true;
  span.className = "is-disabled";
  return span;
}

/** Only allow navigable http(s) action links (blocks javascript:/data:). */
function isHttpUrl(value) {
  try {
    const u = new URL(String(value || ""));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 28 ? `${u.pathname.slice(0, 28)}…` : u.pathname;
    return u.hostname + path;
  } catch {
    return url;
  }
}

/** Keep citations short and readable under the one-look summary. */
function compactCite(text) {
  let s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length > 140) s = `${s.slice(0, 137)}…`;
  return s;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
