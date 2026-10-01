/** Pure helpers for the web demo (no DOM) so they can be unit-tested in Node. */

export const MAX_PASTE_CHARS = 300_000;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isHttpUrl(value) {
  try {
    const u = new URL(String(value || ""));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Accept “duckduckgo.com” or a full URL; return a normalized http(s) URL or null.
 * @param {string} raw
 * @returns {string|null}
 */
export function normalizeInputUrl(raw) {
  let s = String(raw || "").trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!isHttpUrl(u.href) || !u.hostname.includes(".")) return null;
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}

/**
 * @param {string} url
 * @returns {string}
 */
export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function looksLikeHtml(text) {
  return /<(html|body|p|div|h[1-6]|section|article|main)\b/i.test(String(text || ""));
}

/**
 * Score a link on a homepage as a privacy-policy candidate (mirrors the extension’s discover heuristics).
 * @param {string} href absolute URL
 * @param {string} text link text
 * @param {string} pageHost hostname without www.
 * @returns {number}
 */
export function scorePolicyLink(href, text, pageHost) {
  if (!isHttpUrl(href)) return 0;
  const label = String(text || "").replace(/\s+/g, " ").trim();
  let score = 0;

  if (/^privacy\s+(policy|notice|statement)$/i.test(label)) score += 12;
  else if (/privacy\s+(policy|notice|statement)/i.test(label)) score += 8;
  else if (/^privacy$/i.test(label)) score += 7;
  else if (/privacy/i.test(label)) score += 4;

  if (/privacy/i.test(href)) score += 3;
  if (/cookie/i.test(label) && !/privacy/i.test(label)) score -= 4;

  const host = hostOf(href);
  if (host && pageHost && (host === pageHost || host.endsWith(`.${pageHost}`) || pageHost.endsWith(`.${host}`))) {
    score += 2;
  }
  return score;
}

/**
 * Keep citations short and readable under the one-look summary.
 * @param {string} text
 * @param {number} [max]
 */
export function compactCite(text, max = 140) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
