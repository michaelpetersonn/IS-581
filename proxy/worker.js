/**
 * c3nsor policy proxy (Cloudflare Worker).
 * Lets the static web demo download a public privacy-policy page that browsers would block cross-origin.
 * GET /?url=https://example.com/privacy  →  page HTML as text/plain
 * Errors are JSON: { error, code, upstreamStatus? }. The web demo turns `code` into visitor-facing wording.
 */

export const MAX_BYTES = 1_500_000;
export const TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 5;
const DEFAULT_ALLOWED_ORIGINS = "https://michael-peterson.com,https://michaelpetersonn.github.io";
const USER_AGENT = "c3nsor-demo/0.1 (+https://michael-peterson.com/IS-581/try.html)";

const BLOCKED_HOST_RE = /(^|\.)(localhost|local|internal|lan|home\.arpa|intranet|corp)$/i;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
const ALLOWED_TYPE_RE = /^(text\/html|application\/xhtml\+xml|text\/plain)\b/i;
/** Cloudflare-generated origin errors (DNS failure, refused, timed out, bad TLS) — not real site responses. */
const CF_TIMEOUT_STATUSES = new Set([522, 524]);
const CF_UNREACHABLE_STATUSES = new Set([520, 521, 523, 525, 526, 527, 530]);

class ProxyError extends Error {
  /**
   * @param {number} status
   * @param {string} code machine-readable reason for the web demo
   * @param {string} message
   * @param {number} [upstreamStatus]
   */
  constructor(status, code, message, upstreamStatus) {
    super(message);
    this.status = status;
    this.code = code;
    this.upstreamStatus = upstreamStatus;
  }
}

/**
 * Map a non-OK upstream status to a proxy error.
 * @param {number} status
 * @returns {ProxyError}
 */
export function upstreamStatusError(status) {
  if (CF_TIMEOUT_STATUSES.has(status)) {
    return new ProxyError(504, "timeout", "The site took too long to respond.", status);
  }
  if (CF_UNREACHABLE_STATUSES.has(status)) {
    return new ProxyError(502, "unreachable", "Could not reach that site.", status);
  }
  if (status === 404 || status === 410) {
    return new ProxyError(502, "not_found", "The site has no page at that address.", status);
  }
  if (status >= 400 && status < 500) {
    return new ProxyError(502, "blocked", "The site refused the request.", status);
  }
  return new ProxyError(502, "upstream_error", "The site returned an error.", status);
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
    throw new ProxyError(400, "invalid_url", "That URL is not valid.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ProxyError(400, "invalid_url", "Only http and https URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new ProxyError(400, "invalid_url", "URLs with credentials are not allowed.");
  }
  if (url.port) {
    throw new ProxyError(400, "invalid_url", "Only default ports are allowed.");
  }
  const host = url.hostname;
  if (
    !host.includes(".") ||
    host.startsWith("[") ||
    IPV4_RE.test(host) ||
    BLOCKED_HOST_RE.test(host)
  ) {
    throw new ProxyError(400, "blocked_host", "That host is not allowed.");
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
 * @param {ProxyError} err
 * @param {Record<string, string>} [headers]
 */
function jsonError(err, headers = {}) {
  const body = { error: err.message, code: err.code };
  if (err.upstreamStatus) body.upstreamStatus = err.upstreamStatus;
  return new Response(JSON.stringify(body), {
    status: err.status,
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
    let response;
    try {
      response = await fetchImpl(current.href, {
        method: "GET",
        redirect: "manual",
        signal,
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8",
          "User-Agent": USER_AGENT
        }
      });
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      throw new ProxyError(502, "unreachable", "Could not reach that site.");
    }
    const location = response.headers.get("Location");
    if (response.status >= 300 && response.status < 400 && location) {
      try {
        current = validateTargetUrl(new URL(location, current).href);
      } catch (err) {
        if (err instanceof ProxyError) {
          throw new ProxyError(err.status, "bad_redirect", `Redirect blocked: ${err.message}`);
        }
        throw new ProxyError(400, "bad_redirect", "Redirect blocked: invalid location.");
      }
      continue;
    }
    return { response, finalUrl: current.href };
  }
  throw new ProxyError(502, "bad_redirect", "Too many redirects.");
}

/**
 * @param {Response} response
 * @param {number} maxBytes
 */
async function readCappedText(response, maxBytes) {
  const declared = Number(response.headers.get("Content-Length") || 0);
  if (declared > maxBytes) throw new ProxyError(413, "too_large", "That page is too large to analyze.");
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
      throw new ProxyError(413, "too_large", "That page is too large to analyze.");
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
    return jsonError(new ProxyError(403, "origin_not_allowed", "Origin not allowed."));
  }
  const cors = corsHeaders(origin);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "GET") {
    return jsonError(new ProxyError(405, "method_not_allowed", "Only GET is supported."), cors);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const target = validateTargetUrl(new URL(request.url).searchParams.get("url"));
    const { response, finalUrl } = await fetchFollowingSafeRedirects(
      target,
      fetchImpl,
      controller.signal
    );
    if (!response.ok) throw upstreamStatusError(response.status);
    const type = response.headers.get("Content-Type") || "";
    if (type && !ALLOWED_TYPE_RE.test(type)) {
      throw new ProxyError(415, "not_html", "That URL is not an HTML page.");
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
    if (err instanceof ProxyError) return jsonError(err, cors);
    if (err?.name === "AbortError") {
      return jsonError(new ProxyError(504, "timeout", "Timed out downloading that page."), cors);
    }
    return jsonError(new ProxyError(502, "unreachable", "Could not download that page."), cors);
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
