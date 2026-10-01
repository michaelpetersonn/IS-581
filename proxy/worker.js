/**
 * c3nsor policy proxy (Cloudflare Worker).
 * Lets the static web demo download a public privacy-policy page that browsers would block cross-origin.
 * GET /?url=https://example.com/privacy  →  page HTML as text/plain
 */

export const MAX_BYTES = 1_500_000;
export const TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 5;
const DEFAULT_ALLOWED_ORIGINS = "https://michael-peterson.com,https://michaelpetersonn.github.io";
const USER_AGENT = "c3nsor-demo/0.1 (+https://michael-peterson.com/IS-581/try.html)";

const BLOCKED_HOST_RE = /(^|\.)(localhost|local|internal|lan|home\.arpa|intranet|corp)$/i;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
const ALLOWED_TYPE_RE = /^(text\/html|application\/xhtml\+xml|text\/plain)\b/i;

class ProxyError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Only public http(s) hostnames on default ports — no IP literals, credentials, or internal names.
 * @param {string} raw
 * @returns {URL}
 */
export function validateTargetUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || ""));
  } catch {
    throw new ProxyError(400, "That URL is not valid.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ProxyError(400, "Only http and https URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new ProxyError(400, "URLs with credentials are not allowed.");
  }
  if (url.port) {
    throw new ProxyError(400, "Only default ports are allowed.");
  }
  const host = url.hostname;
  if (
    !host.includes(".") ||
    host.startsWith("[") ||
    IPV4_RE.test(host) ||
    BLOCKED_HOST_RE.test(host)
  ) {
    throw new ProxyError(400, "That host is not allowed.");
  }
  url.hash = "";
  return url;
}

/**
 * @param {Record<string, string|undefined>} env
 * @returns {string[]}
 */
function allowedOrigins(env) {
  return String(env?.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {string} origin
 */
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Expose-Headers": "X-Final-Url",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

/**
 * @param {number} status
 * @param {string} message
 * @param {Record<string, string>} [headers]
 */
function jsonError(status, message, headers = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers }
  });
}

/**
 * Follow redirects manually so every hop is re-validated.
 * @param {URL} target
 * @param {typeof fetch} fetchImpl
 * @param {AbortSignal} signal
 */
async function fetchFollowingSafeRedirects(target, fetchImpl, signal) {
  let current = target;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetchImpl(current.href, {
      method: "GET",
      redirect: "manual",
      signal,
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8",
        "User-Agent": USER_AGENT
      }
    });
    const location = response.headers.get("Location");
    if (response.status >= 300 && response.status < 400 && location) {
      current = validateTargetUrl(new URL(location, current).href);
      continue;
    }
    return { response, finalUrl: current.href };
  }
  throw new ProxyError(502, "Too many redirects.");
}

/**
 * @param {Response} response
 * @param {number} maxBytes
 */
async function readCappedText(response, maxBytes) {
  const declared = Number(response.headers.get("Content-Length") || 0);
  if (declared > maxBytes) throw new ProxyError(413, "That page is too large to analyze.");
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ProxyError(413, "That page is too large to analyze.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/**
 * @param {Request} request
 * @param {Record<string, string|undefined>} env
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<Response>}
 */
export async function handleRequest(request, env, fetchImpl) {
  const origin = request.headers.get("Origin") || "";
  if (!allowedOrigins(env).includes(origin)) {
    return jsonError(403, "Origin not allowed.");
  }
  const cors = corsHeaders(origin);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "GET") return jsonError(405, "Only GET is supported.", cors);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const target = validateTargetUrl(new URL(request.url).searchParams.get("url"));
    const { response, finalUrl } = await fetchFollowingSafeRedirects(
      target,
      fetchImpl,
      controller.signal
    );
    if (!response.ok) {
      throw new ProxyError(502, `The site responded with HTTP ${response.status}.`);
    }
    const type = response.headers.get("Content-Type") || "";
    if (type && !ALLOWED_TYPE_RE.test(type)) {
      throw new ProxyError(415, "That URL is not an HTML page.");
    }
    const body = await readCappedText(response, MAX_BYTES);
    return new Response(body, {
      status: 200,
      headers: {
        ...cors,
        // Served as plain text so the proxy origin can never render third-party HTML.
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600",
        "X-Final-Url": finalUrl
      }
    });
  } catch (err) {
    if (err instanceof ProxyError) return jsonError(err.status, err.message, cors);
    if (err?.name === "AbortError") return jsonError(504, "Timed out downloading that page.", cors);
    return jsonError(502, "Could not download that page.", cors);
  } finally {
    clearTimeout(timer);
  }
}

export default {
  /**
   * @param {Request} request
   * @param {Record<string, string|undefined>} env
   */
  fetch(request, env) {
    return handleRequest(request, env, fetch);
  }
};
