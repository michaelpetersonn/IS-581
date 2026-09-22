/** Fetch and size-limit privacy policy HTML. */

export const FETCH_TIMEOUT_MS = 12_000;
export const MAX_BYTES = 1_500_000;

/**
 * @param {string} url
 * @returns {Promise<{ ok: true, html: string, finalUrl: string } | { ok: false, error: string }>}
 */
export async function fetchPolicyHtml(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "That policy URL is not valid." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http and https policy URLs are allowed." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsed.href, {
      method: "GET",
      redirect: "follow",
      credentials: "omit",
      signal: controller.signal,
      headers: { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8" }
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Could not download the policy (HTTP ${response.status}).`
      };
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return {
        ok: false,
        error: "The privacy policy page is too large to process safely."
      };
    }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    if (!html.trim()) {
      return { ok: false, error: "The privacy policy page was empty." };
    }

    return { ok: true, html, finalUrl: response.url || parsed.href };
  } catch (err) {
    if (err?.name === "AbortError") {
      return { ok: false, error: "Timed out while downloading the privacy policy." };
    }
    return {
      ok: false,
      error: "Could not fetch the privacy policy (blocked network, CORS, or offline)."
    };
  } finally {
    clearTimeout(timer);
  }
}
