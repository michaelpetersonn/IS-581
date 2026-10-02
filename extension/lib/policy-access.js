/**
 * Decide how to download a policy URL without install-time access to every site.
 * Same-origin pages are fetched from inside the active tab (activeTab grant);
 * other hosts need an optional host permission the user granted for that host.
 */

/** @typedef {{ ok: true, html: string, finalUrl: string } | { ok: false, error: string }} FetchResult */
/** @typedef {{ ok: false, needsPermission: true, origin: string, host: string, url: string, error: string }} PermissionNeeded */

/**
 * @param {string} url
 * @param {string} pageUrl
 */
export function isSameOrigin(url, pageUrl) {
  try {
    return new URL(url).origin === new URL(pageUrl).origin;
  } catch {
    return false;
  }
}

/**
 * Match pattern for chrome.permissions (ports are not allowed in host patterns).
 * @param {string} url
 */
export function originPattern(url) {
  const u = new URL(url);
  return `${u.protocol}//${u.hostname}/*`;
}

/**
 * @param {{
 *   pageUrl: string,
 *   fetchInPage: (url: string) => Promise<FetchResult>,
 *   hasHostAccess: (pattern: string) => Promise<boolean>,
 *   fetchDirect: (url: string) => Promise<FetchResult>
 * }} deps
 * @returns {(url: string) => Promise<FetchResult | PermissionNeeded>}
 */
export function createPolicyFetcher(deps) {
  return async function fetchPolicy(url) {
    let pattern;
    try {
      pattern = originPattern(url);
    } catch {
      return { ok: false, error: "That policy URL is not valid." };
    }

    if (isSameOrigin(url, deps.pageUrl)) {
      const inPage = await deps.fetchInPage(url);
      if (inPage.ok) return inPage;
      // e.g. a same-site link that redirects to another host the user already allowed
      if (await deps.hasHostAccess(pattern)) return deps.fetchDirect(url);
      return inPage;
    }

    if (await deps.hasHostAccess(pattern)) return deps.fetchDirect(url);

    const host = new URL(url).hostname;
    return {
      ok: false,
      needsPermission: true,
      origin: pattern,
      host,
      url,
      error: `This site’s privacy policy is on ${host}. Allow c3nsor to read it.`
    };
  };
}
