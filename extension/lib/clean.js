/** Strip page chrome and return readable plain text from HTML. */

const MAX_TEXT_CHARS = 200_000;

const REMOVE_TAGS = /<\/?(script|style|noscript|svg|iframe|nav|header|footer|aside|form)[^>]*>/gi;

/**
 * @param {string} html
 * @returns {string}
 */
export function htmlToPlainText(html) {
  if (!html || typeof html !== "string") return "";

  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(REMOVE_TAGS, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r/g, "");

  cleaned = cleaned
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u0022/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return code >= 0 && code < 0x110000 ? String.fromCodePoint(code) : " ";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = parseInt(h, 16);
      return code >= 0 && code < 0x110000 ? String.fromCodePoint(code) : " ";
    });

  // Second pass if entity decoding reintroduced tags
  cleaned = cleaned.replace(/<[^>]+>/g, " ");

  cleaned = cleaned
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  if (cleaned.length > MAX_TEXT_CHARS) {
    cleaned = cleaned.slice(0, MAX_TEXT_CHARS);
  }
  return cleaned;
}

/**
 * Split text into sentences for citation matching.
 * @param {string} text
 * @returns {string[]}
 */
export function splitSentences(text) {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

/**
 * Heuristic: is this cleaned text likely a privacy policy (not a marketing page / cookie banner)?
 * @param {string} text
 * @returns {boolean}
 */
export function looksLikePrivacyPolicy(text) {
  const t = String(text || "").trim();
  if (t.length < 400) return false;

  // SPA shells / CSS dumps (e.g. Meta privacy center HTML)
  if ((t.match(/--[a-z0-9-]+:|#\d{3,}|:root/gi) || []).length > 40) return false;
  if (/__fb-light-mode|--fds-/i.test(t) && !/we collect personal/i.test(t)) return false;

  const marketingHits = [
    /\bget access\b/i,
    /\bjoin the\b/i,
    /\btake control\b/i,
    /\bearly[- ]access\b/i,
    /\bwaitlist\b/i,
    /\bhow it works\b/i
  ].filter((re) => re.test(t)).length;

  // Avoid matching marketing copy like “privacy policy checkpoint”
  const hasPolicyTitle = /privacy\s+policy(?!\s+checkpoint)/i.test(t) || /\blast updated\b/i.test(t);

  const legal = [
    /\bwe collect\b/i,
    /personal\s+(information|data)/i,
    /\bservice providers?\b/i,
    /\bthird[- ]part(y|ies)\b/i,
    /\b(opt[- ]out|request deletion|right to (access|delete|erasure))\b/i,
    /\binformation we collect\b/i,
    /\bhow we use\b/i,
    /\bdata\s+protection\b/i
  ];
  let legalHits = 0;
  for (const re of legal) {
    if (re.test(t)) legalHits += 1;
  }

  if (hasPolicyTitle && legalHits >= 4) return true;
  if (hasPolicyTitle && legalHits >= 3 && marketingHits <= 2) return true;
  if (legalHits >= 5 && marketingHits <= 1) return true;
  return false;
}
