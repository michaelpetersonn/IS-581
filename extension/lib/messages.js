/**
 * Validate what crosses the popup ↔ service worker boundary and what the injected
 * discover script returns from the page. Both are treated as untrusted input.
 */

export const MAX_URL_LENGTH = 2048;
export const MAX_LINK_TEXT = 120;
export const MAX_CANDIDATES = 12;
export const MAX_PAGE_LINKS = 40;

const MESSAGE_TYPES = new Set(["ANALYZE_TAB", "CLEAR_CACHE"]);

/**
 * Only extension pages (the popup) may talk to the service worker — not content scripts or web pages.
 * @param {{ id?: string, url?: string, tab?: unknown }|undefined} sender
 * @param {string} extensionId chrome.runtime.id
 * @param {string} extensionOrigin chrome.runtime.getURL("") (e.g. "chrome-extension://<id>/")
 */
export function isTrustedSender(sender, extensionId, extensionOrigin) {
  if (!sender || !extensionId || sender.id !== extensionId) return false;
  return typeof sender.url === "string" && Boolean(extensionOrigin) && sender.url.startsWith(extensionOrigin);
}

/**
 * @param {unknown} value
 * @returns {string|null} normalized http(s) URL, or null
 */
export function safeHttpUrl(value) {
  if (typeof value !== "string" || !value || value.length > MAX_URL_LENGTH) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    return u.href.length > MAX_URL_LENGTH ? null : u.href;
  } catch {
    return null;
  }
}

/**
 * @param {unknown} message
 * @returns {{ ok: true, message: { type: "CLEAR_CACHE" } | { type: "ANALYZE_TAB", force: boolean, policyUrl: string|null } } | { ok: false, error: string }}
 */
export function validateMessage(message) {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return { ok: false, error: "Invalid message." };
  }
  const { type } = /** @type {{ type?: unknown }} */ (message);
  if (typeof type !== "string" || !MESSAGE_TYPES.has(type)) {
    return { ok: false, error: "Unknown message type." };
  }
  if (type === "CLEAR_CACHE") return { ok: true, message: { type } };

  const { force, policyUrl } = /** @type {{ force?: unknown, policyUrl?: unknown }} */ (message);
  if (force !== undefined && typeof force !== "boolean") {
    return { ok: false, error: "Invalid message." };
  }
  if (policyUrl === undefined || policyUrl === null || policyUrl === "") {
    return { ok: true, message: { type, force: Boolean(force), policyUrl: null } };
  }
  if (typeof policyUrl !== "string" || policyUrl.length > MAX_URL_LENGTH) {
    return { ok: false, error: "That policy URL is not valid." };
  }
  const url = safeHttpUrl(policyUrl);
  if (!url) return { ok: false, error: "Policy URL must be a full http or https link." };
  return { ok: true, message: { type, force: Boolean(force), policyUrl: url } };
}

/**
 * @param {unknown} list
 * @param {number} max
 * @param {boolean} withScore
 */
function sanitizeLinks(list, max, withScore) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const item of list) {
    if (out.length >= max) break;
    const href = safeHttpUrl(item?.href);
    if (!href) continue;
    const text = typeof item.text === "string" ? item.text.slice(0, MAX_LINK_TEXT) : "";
    const link = { href, text };
    if (withScore) link.score = Number.isFinite(item.score) ? item.score : 0;
    out.push(link);
  }
  return out;
}

/**
 * Keep only well-formed http(s) links from the injected discover script's result.
 * @param {unknown} raw
 * @param {{ origin: string, pageUrl: string }} fallback values from the trusted tab object
 * @returns {{ candidates: { href: string, text: string, score: number }[], pageLinks: { href: string, text: string }[], origin: string, pageUrl: string }}
 */
export function sanitizeDiscovery(raw, fallback) {
  const data = raw && typeof raw === "object" ? /** @type {Record<string, unknown>} */ (raw) : {};
  return {
    candidates: /** @type {any} */ (sanitizeLinks(data.candidates, MAX_CANDIDATES, true)),
    pageLinks: sanitizeLinks(data.pageLinks, MAX_PAGE_LINKS, false),
    origin: fallback.origin,
    pageUrl: fallback.pageUrl
  };
}
