/** Discover likely privacy-policy URLs on the current page (runs in page context). */

const LINK_TEXT_RE =
  /privacy(\s+policy)?|privacy\s+notice|data\s+protection|your\s+privacy\s+choices|do\s+not\s+sell|cookie\s+policy/i;

const HREF_RE =
  /privacy|privacypolicy|privacy-policy|privacy_policy|data-protection|legal\/privacy|do-not-sell|privacy-choices|cookie/i;

const COMMON_PATHS = [
  "/privacy",
  "/privacy-policy",
  "/privacy_policy",
  "/privacypolicy",
  "/legal/privacy",
  "/legal/privacy-policy",
  "/policies/privacy",
  "/about/privacy",
  "/en/privacy",
  "/en-us/privacy",
  "/privacy/index.html"
];

/**
 * @returns {{ candidates: { href: string, text: string, score: number }[], pageLinks: { href: string, text: string }[], origin: string, pageUrl: string }}
 */
export function discoverPrivacyLinks() {
  const pageUrl = location.href;
  const origin = location.origin;
  let pageHost = "";
  try {
    pageHost = new URL(origin).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }

  const seen = new Set();
  const candidates = [];
  const pageLinks = [];

  function addCandidate(href, text, score) {
    try {
      const url = new URL(href, origin);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      const key = url.href.split("#")[0];
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push({ href: url.href, text: (text || "").trim().slice(0, 120), score });
    } catch {
      /* ignore bad URLs */
    }
  }

  function scoreCandidate(href, text) {
    let score = 0;
    const trimmed = (text || "").replace(/\s+/g, " ").trim();

    if (/^privacy\s+policy$/i.test(trimmed)) score += 12;
    else if (/privacy\s+policy/i.test(trimmed)) score += 8;
    else if (/^privacy\s+notice$/i.test(trimmed)) score += 10;
    else if (LINK_TEXT_RE.test(trimmed)) score += 5;

    if (HREF_RE.test(href)) score += 3;
    if (/\/privacy([-_]?policy)?\/?$/i.test(href)) score += 2;

    if (/cookie/i.test(trimmed) && !/privacy/i.test(trimmed)) score -= 4;
    if (/cookie/i.test(href) && !/privacy/i.test(href) && !/privacy/i.test(trimmed)) {
      score -= 3;
    }

    try {
      const url = new URL(href, origin);
      const host = url.hostname.replace(/^www\./, "");
      const sameOrigin =
        host === pageHost || host.endsWith("." + pageHost) || pageHost.endsWith("." + host);
      if (sameOrigin) score += 3;
      else score -= 2;
      if (url.protocol === "https:") score += 1;
      else score -= 2;
    } catch {
      /* ignore */
    }

    return score;
  }

  document.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const text = (a.textContent || "").replace(/\s+/g, " ").trim();
    pageLinks.push({ href: a.href, text });

    const score = scoreCandidate(a.href, text);
    if (score > 0) addCandidate(a.href, text, score);
  });

  for (const path of COMMON_PATHS) {
    addCandidate(origin + path, path, 1);
  }

  candidates.sort((a, b) => b.score - a.score || a.href.length - b.href.length);

  return {
    candidates: candidates.slice(0, 12),
    pageLinks: pageLinks.filter((l) => ACTION_LIKE(l)).slice(0, 40),
    origin,
    pageUrl
  };
}

function ACTION_LIKE(link) {
  const hay = `${link.text} ${link.href}`;
  return /do[- ]?not[- ]?sell|privacy[- ]?choices|opt[- ]?out|privacy|cookie[- ]?settings|data[- ]?request/i.test(
    hay
  );
}

// Expose for chrome.scripting.executeScript world MAIN/isolated
if (typeof window !== "undefined") {
  window.__c3nsorDiscover = discoverPrivacyLinks;
}
