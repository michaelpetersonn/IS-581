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

/** Proxy error codes where the site itself answered, so linking visitors to it is useful. */
const REACHABLE_ERROR_CODES = new Set(["blocked", "not_found", "upstream_error", "too_large", "not_html", "bad_redirect"]);

/**
 * Visitor-facing wording for a proxy error `code` (see proxy/worker.js). Never includes HTTP status codes.
 * `siteUrl` is the site's homepage when the site was reachable, otherwise null (no link to a dead domain).
 * @param {string|undefined|null} code
 * @param {string} targetUrl the URL the visitor asked to analyze
 * @returns {{ message: string, siteUrl: string|null }}
 */
export function describeProxyError(code, targetUrl) {
  const host = hostOf(targetUrl) || "That site";
  let message;
  switch (code) {
    case "unreachable":
      message = `We couldn’t reach ${host}. Check the spelling, or try the site’s full address.`;
      break;
    case "timeout":
      message = `${host} took too long to respond. Try again, or paste the policy text below.`;
      break;
    case "blocked":
      message = `${host} didn’t let us read its pages. Open the site’s privacy policy and paste its text below.`;
      break;
    case "not_found":
      message = `We couldn’t find that page on ${host}. Check the address, or try just the site name.`;
      break;
    case "upstream_error":
      message = `${host} had a problem loading that page. Try again later, or paste the policy text below.`;
      break;
    case "too_large":
      message = "That page is too large to analyze. Paste the policy text below instead.";
      break;
    case "not_html":
      message = "That address isn’t a web page we can read (it may be a PDF or a download). Try the site’s privacy policy page instead.";
      break;
    case "bad_redirect":
      message = `${host} sent us somewhere we can’t follow. Open the site’s privacy policy and paste its text below.`;
      break;
    case "invalid_url":
    case "blocked_host":
      message = "Enter a public website address like duckduckgo.com.";
      break;
    default:
      message = "We couldn’t download that page right now. Try again, or paste the policy text below.";
  }
  let siteUrl = null;
  if (code && REACHABLE_ERROR_CODES.has(code) && isHttpUrl(targetUrl)) {
    siteUrl = `${new URL(targetUrl).origin}/`;
  }
  return { message, siteUrl };
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
