/** Short-lived local cache of analysis results (domain only — no full history log). */

const CACHE_KEY = "c3nsor_cache_v1";
const TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * @param {string} domain
 * @returns {Promise<object|null>}
 */
export async function getCached(domain) {
  const data = await chrome.storage.session.get(CACHE_KEY);
  const cache = data[CACHE_KEY] || {};
  const entry = cache[domain];
  if (!entry) return null;
  if (Date.now() - entry.savedAt > TTL_MS) {
    delete cache[domain];
    await chrome.storage.session.set({ [CACHE_KEY]: cache });
    return null;
  }
  return entry.result;
}

/**
 * @param {string} domain
 * @param {object} result
 */
export async function setCached(domain, result) {
  const data = await chrome.storage.session.get(CACHE_KEY);
  const cache = data[CACHE_KEY] || {};
  cache[domain] = { savedAt: Date.now(), result };
  // Keep cache small: at most 20 domains
  const keys = Object.keys(cache);
  if (keys.length > 20) {
    keys
      .sort((a, b) => cache[a].savedAt - cache[b].savedAt)
      .slice(0, keys.length - 20)
      .forEach((k) => delete cache[k]);
  }
  await chrome.storage.session.set({ [CACHE_KEY]: cache });
}

export async function clearCache() {
  await chrome.storage.session.remove(CACHE_KEY);
}
