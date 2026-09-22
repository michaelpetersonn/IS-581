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
