/**
 * Content-script helper injected via scripting.executeScript.
 * Must be self-contained (no imports) for executeScript files injection.
 */

(function discoverPrivacyLinks() {
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
    "/en-us/privacy"
  ];
  const ACTION_RE =
    /do[- ]?not[- ]?sell|privacy[- ]?choices|opt[- ]?out|privacy|cookie[- ]?settings|data[- ]?request/i;

  const pageUrl = location.href;
  const origin = location.origin;
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
      candidates.push({
        href: url.href,
        text: (text || "").trim().slice(0, 120),
        score
      });
    } catch {
      /* ignore */
    }
  }

  document.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const text = (a.textContent || "").replace(/\s+/g, " ").trim();
    if (ACTION_RE.test(`${text} ${a.href}`)) {
      pageLinks.push({ href: a.href, text });
    }
    let score = 0;
    if (LINK_TEXT_RE.test(text)) score += 5;
    if (HREF_RE.test(href)) score += 3;
    if (/privacy\s+policy/i.test(text)) score += 4;
    if (/cookie/i.test(text) && !/privacy/i.test(text)) score -= 1;
    if (score > 0) addCandidate(a.href, text, score);
  });

  for (const path of COMMON_PATHS) {
    addCandidate(origin + path, path, 1);
  }

  candidates.sort((a, b) => b.score - a.score);

  return {
    candidates: candidates.slice(0, 12),
    pageLinks: pageLinks.slice(0, 40),
    origin,
    pageUrl
  };
})();
