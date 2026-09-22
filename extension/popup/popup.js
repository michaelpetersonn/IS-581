const statusEl = document.getElementById("status");
const metaEl = document.getElementById("meta");
const alertBoxEl = document.getElementById("alert-box");
const alternativesEl = document.getElementById("alternatives");
const findingsEl = document.getElementById("findings");
const guidanceEl = document.getElementById("guidance");
const actionsEl = document.getElementById("actions");
const policyInput = document.getElementById("policy-url");

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
  statusEl.className = "status";
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
  statusEl.className = "status loading";
  metaEl.classList.add("hidden");
  alertBoxEl.classList.add("hidden");
  alternativesEl.classList.add("hidden");
  findingsEl.classList.add("hidden");
  guidanceEl.classList.add("hidden");
  actionsEl.classList.add("hidden");
}

function showError(message, detail) {
  statusEl.textContent = message;
  statusEl.className = "status error";
  alertBoxEl.classList.add("hidden");
  findingsEl.classList.add("hidden");
  guidanceEl.classList.add("hidden");
  actionsEl.classList.add("hidden");

  if (detail?.domain) {
    metaEl.classList.remove("hidden");
    metaEl.innerHTML = `<strong>${escapeHtml(detail.domain)}</strong>`;
  } else {
    metaEl.classList.add("hidden");
  }

  renderAlternatives(detail?.candidates || []);
}

/**
 * Surface top policy URL candidates as one-click retries when discovery/fetch fails.
 * @param {{ href: string, text?: string }[]} candidates
 */
function renderAlternatives(candidates) {
  const top = (candidates || []).slice(0, 3);
  if (!top.length) {
    alternativesEl.classList.add("hidden");
    alternativesEl.innerHTML = "";
    return;
  }

  alternativesEl.classList.remove("hidden");
  alternativesEl.innerHTML = "";

  const heading = document.createElement("h2");
  heading.textContent = "Try another policy URL";
  alternativesEl.appendChild(heading);

  const list = document.createElement("div");
  list.className = "alt-list";

  for (const c of top) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "alt-btn";
    const label = c.text && !c.text.startsWith("/") ? `${c.text} — ${shortUrl(c.href)}` : shortUrl(c.href);
    btn.textContent = label;
    btn.title = c.href;
    btn.addEventListener("click", () => {
      policyInput.value = c.href;
      runAnalyze({ force: true, policyUrl: c.href });
    });
    list.appendChild(btn);
  }

  alternativesEl.appendChild(list);

  const hint = document.createElement("p");
  hint.className = "alt-hint";
  hint.textContent = "Or paste a full policy URL below and click Analyze.";
  alternativesEl.appendChild(hint);
}

function renderResult(result) {
  statusEl.className = "status";
  statusEl.textContent = result.fromCache
    ? "Cached rules match for this site (session). Not a full legal review."
    : "Rules matched language in this policy. Citations are excerpts — not legal advice.";

  alternativesEl.classList.add("hidden");
  alternativesEl.innerHTML = "";

  metaEl.classList.remove("hidden");
  metaEl.innerHTML = `
    <div><strong>${escapeHtml(result.domain)}</strong></div>
    <div>Policy: <a href="${escapeAttr(result.policyUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(shortUrl(result.policyUrl))}</a></div>
  `;

  const alertCount =
    typeof result.alertCount === "number"
      ? result.alertCount
      : Object.values(result.findings || {}).filter((f) => f?.found).length;

  alertBoxEl.classList.remove("hidden");
  const label = alertCount === 1 ? "1 alert on this policy" : `${alertCount} alerts on this policy`;
  alertBoxEl.innerHTML = `
    <h2>Alerts</h2>
    <p class="count">${escapeHtml(label)}</p>
    <p class="hint">Categories with matching policy language.</p>
  `;

  findingsEl.classList.remove("hidden");
  findingsEl.innerHTML = "";

  const order = ["collected", "used", "shared", "advertising", "choices"];
  for (const id of order) {
    const item = result.findings?.[id];
    if (!item) continue;
    const card = document.createElement("article");
    card.className = "card";
    const badge = item.found
      ? '<span class="badge found">Found</span>'
      : '<span class="badge miss">Unclear</span>';
    card.innerHTML = `<h2>${escapeHtml(item.label)} ${badge}</h2>`;
    if (item.found) {
      card.innerHTML += `<p class="expl">${escapeHtml(item.explanation)}</p>`;
      card.innerHTML += `<p class="excerpt">“${escapeHtml(item.excerpt)}”</p>`;
    } else {
      card.innerHTML += `<p class="missing">${escapeHtml(item.explanation)}</p>`;
    }
    findingsEl.appendChild(card);
  }

  guidanceEl.classList.remove("hidden");
  guidanceEl.innerHTML = `<h2>What you should do</h2><p>${escapeHtml(result.guidance)}</p>`;

  actionsEl.classList.remove("hidden");
  actionsEl.innerHTML = "";
  const acts = result.actions || {};

  if (acts.policyUrl) {
    actionsEl.appendChild(linkBtn(acts.policyUrl, "Open privacy policy", false));
  }
  if (acts.optOutUrl) {
    actionsEl.appendChild(linkBtn(acts.optOutUrl, "Open privacy choices / opt-out", false));
  } else {
    const missing = document.createElement("span");
    missing.style.cssText = "font-size:11px;color:#666;align-self:center";
    missing.textContent = "No opt-out link found on this page.";
    actionsEl.appendChild(missing);
  }
  if (acts.contactEmail) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "secondary";
    btn.textContent = `Copy ${acts.contactEmail}`;
    btn.style.cssText =
      "border:1px solid #101010;background:#fff;color:#101010;padding:8px 10px;font-size:12px;font-weight:600";
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(acts.contactEmail);
        btn.textContent = "Copied";
      } catch {
        btn.textContent = "Copy failed";
      }
    });
    actionsEl.appendChild(btn);
  }
}

function linkBtn(href, label, secondary) {
  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = label;
  if (secondary) a.classList.add("secondary");
  return a;
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
