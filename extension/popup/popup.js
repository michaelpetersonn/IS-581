const statusEl = document.getElementById("status");
const metaEl = document.getElementById("meta");
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
  findingsEl.classList.add("hidden");
  guidanceEl.classList.add("hidden");
  actionsEl.classList.add("hidden");
}

function showError(message, detail) {
  statusEl.textContent = message;
  statusEl.className = "status error";
  findingsEl.classList.add("hidden");
  guidanceEl.classList.add("hidden");
  actionsEl.classList.add("hidden");

  if (detail?.domain) {
    metaEl.classList.remove("hidden");
    metaEl.innerHTML = `<strong>${escapeHtml(detail.domain)}</strong>`;
  } else {
    metaEl.classList.add("hidden");
  }

  if (detail?.candidates?.length) {
    const top = detail.candidates
      .slice(0, 3)
      .map((c) => escapeHtml(c.href))
      .join("<br>");
    statusEl.innerHTML = `${escapeHtml(message)}<br><br><span style="color:#666;font-size:11px">Tried:<br>${top}</span>`;
  }
}

function renderResult(result) {
  statusEl.className = "status";
  statusEl.textContent = result.fromCache
    ? "Showing cached analysis for this site (session)."
    : "Analysis complete. Excerpts are taken from the policy text.";

  metaEl.classList.remove("hidden");
  metaEl.innerHTML = `
    <div><strong>${escapeHtml(result.domain)}</strong></div>
    <div>Policy: <a href="${escapeAttr(result.policyUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(shortUrl(result.policyUrl))}</a></div>
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
    actionsEl.appendChild(
      linkBtn(acts.policyUrl, "Open privacy policy", false)
    );
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
