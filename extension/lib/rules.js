import { splitSentences } from "./clean.js";
import { CATEGORIES, NOT_SPECIFIED } from "./templates.js";

/** Keyword / phrase patterns per category (case-insensitive). */
const RULES = {
  collected: [
    /we collect/i,
    /information we collect/i,
    /personal (information|data)/i,
    /data we collect/i,
    /may collect/i,
    /collects? (the )?following/i,
    /device (identifiers?|information)/i,
    /ip address/i,
    /email address/i,
    /cookies? (and|to) /i,
    /location (data|information)/i
  ],
  used: [
    /we use (your |this |the )?(information|data|personal)/i,
    /use of (personal )?information/i,
    /purposes? of (processing|collection|use)/i,
    /to (provide|improve|personalize|operate)/i,
    /for (marketing|analytics|advertising|research)/i,
    /how we use/i
  ],
  shared: [
    /we (may )?share/i,
    /share(s|d)? (your |personal )?(information|data)/i,
    /third[- ]part(y|ies)/i,
    /service providers?/i,
    /disclose(s|d)? (your |personal )?(information|data)/i,
    /affiliates?/i,
    /business partners?/i,
    /with our partners/i
  ],
  advertising: [
    /targeted advertising/i,
    /interest[- ]based advertising/i,
    /personalized ads?/i,
    /sale of personal/i,
    /sell(s|ing)? (your )?personal/i,
    /do not sell/i,
    /share.*for (cross[- ]context|advertising)/i,
    /advertising partners?/i,
    /behavioral advertising/i,
    /we (do not|don't) (rent or )?sell/i
  ],
  choices: [
    /opt[- ]out/i,
    /your privacy choices/i,
    /do not sell/i,
    /request (access|deletion|deletion of)/i,
    /delete (your )?(account|data|personal)/i,
    /access (your )?(personal )?(information|data)/i,
    /right to (access|delete|erasure|opt)/i,
    /privacy@/i,
    /contact us.*(privacy|data)/i,
    /ccpa|gdpr|cpra/i
  ]
};

const ACTION_URL_PATTERNS = [
  /do[- ]?not[- ]?sell/i,
  /privacy[- ]?choices/i,
  /your[- ]?privacy[- ]?choices/i,
  /opt[- ]?out/i,
  /data[- ]?request/i,
  /dsar/i,
  /privacy[- ]?request/i,
  /cookie[- ]?settings/i
];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

const PLACEHOLDER_LOCAL = /^(you|your|email|name|user|example|test|me|someone|username|firstname|lastname)$/i;
const PLACEHOLDER_DOMAIN =
  /^(domain\.com|email\.com|test\.com|localhost|example\.org|example\.net)$/i;
const PREFERRED_LOCAL = /^(privacy|dpo|legal|data|compliance|gdpr)/i;

/**
 * @param {string} email
 * @returns {boolean}
 */
function isPlaceholderEmail(email) {
  const parts = String(email).toLowerCase().split("@");
  if (parts.length !== 2) return true;
  const [local, domain] = parts;
  if (PLACEHOLDER_LOCAL.test(local)) return true;
  if (PLACEHOLDER_DOMAIN.test(domain)) return true;
  // example.com is often a doc placeholder unless it looks like a real privacy inbox
  if (domain === "example.com" && !PREFERRED_LOCAL.test(local)) return true;
  return false;
}

/**
 * @param {string[]} emails
 * @returns {string|null}
 */
function pickContactEmail(emails) {
  const real = emails.filter((e) => !isPlaceholderEmail(e));
  if (!real.length) return null;
  const preferred = real.find((e) => PREFERRED_LOCAL.test(e.split("@")[0]));
  return preferred || real[0];
}

/**
 * Skip headings and junk left over from poor HTML cleaning.
 * @param {string} sentence
 */
function isJunkExcerpt(sentence) {
  const s = String(sentence || "").trim();
  if (s.length < 18) return true;
  // Pure JSON / markup blobs without prose
  if (/^[{[]/.test(s) && !hasVerbSignal(s)) return true;
  if (/<\/?[a-z][\w:-]*\b/i.test(s) && !hasVerbSignal(s)) return true;
  if (/^\s*[\w.-]+\s*:\s*["'[{]/.test(s) && !hasVerbSignal(s)) return true;
  // Short title-case headings without a verb ("Information We Collect")
  if (s.length < 48 && !/[.!?]/.test(s) && /^[A-Z][\w\s,'/-]+$/.test(s)) return true;
  return false;
}

/**
 * Prefer full sentences with an actor + verb over bare headings.
 * @param {string} sentence
 */
function hasVerbSignal(sentence) {
  return (
    /\b(we|you|our|they|company|site|service|services|providers?)\s+(collect|use|share|disclose|sell|may|do|don't|does|will|process|transfer|obtain)/i.test(
      sentence
    ) ||
    /\b(is|are|may be|will be|can be)\s+(collected|used|shared|sold|disclosed|processed)/i.test(
      sentence
    )
  );
}

/**
 * Strip obvious markup/JSON leftovers from an otherwise useful citation.
 * @param {string} sentence
 */
function polishExcerpt(sentence) {
  let s = String(sentence || "");
  s = s.replace(/\{[^{}]{0,200}\}/g, " ");
  s = s.replace(/<\/?[a-z][^>]*>/gi, " ");
  // Drop leftover tag text crumbs before the prose starts
  s = s.replace(/^(?:nav|menu|footer|header|script|style)\s+/i, "");
  s = s.replace(/\s+/g, " ").trim();
  // Prefer starting at a clear actor if junk remains ahead
  const actor = s.search(/\b(We|You|Our)\b/);
  if (actor > 0 && actor < 40) s = s.slice(actor);
  return s.trim();
}

/**
 * Find the best supporting sentence for a category.
 * @param {string[]} sentences
 * @param {RegExp[]} patterns
 * @returns {string|null}
 */
function findExcerpt(sentences, patterns) {
  let best = null;
  let bestScore = -Infinity;

  for (const sentence of sentences) {
    if (isJunkExcerpt(sentence)) continue;

    let score = 0;
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(sentence)) score += 1;
    }
    if (score === 0) continue;

    if (hasVerbSignal(sentence)) score += 2;
    if (sentence.length >= 60 && sentence.length <= 280) score += 1;
    if (sentence.length < 40) score -= 2;
    if (/[{<]|<\/?[a-z]/i.test(sentence)) score -= 2;

    if (score > bestScore) {
      bestScore = score;
      best = sentence;
    }
  }

  if (!best || bestScore <= 0) return null;
  best = polishExcerpt(best);
  if (!best || best.length < 18) return null;
  if (best.length > 320) return `${best.slice(0, 317)}...`;
  return best;
}

/**
 * Analyze plain policy text into five findings.
 * @param {string} text
 * @param {{ policyUrl?: string, pageLinks?: { href: string, text: string }[] }} [extras]
 */
export function analyzePolicy(text, extras = {}) {
  const sentences = splitSentences(text);
  const findings = {};

  for (const category of CATEGORIES) {
    const patterns = RULES[category.id] || [];
    const excerpt = findExcerpt(sentences, patterns);
    if (excerpt) {
      findings[category.id] = {
        found: true,
        label: category.label,
        explanation: category.explanation,
        excerpt,
        status: "found"
      };
    } else {
      findings[category.id] = {
        found: false,
        label: category.label,
        explanation: NOT_SPECIFIED,
        excerpt: null,
        status: "not_specified"
      };
    }
  }

  const actions = extractActions(text, extras);
  const alertCount = Object.values(findings).filter((f) => f.found).length;

  return { findings, actions, sentenceCount: sentences.length, alertCount };
}

/**
 * @param {string} text
 * @param {{ policyUrl?: string, pageLinks?: { href: string, text: string }[] }} extras
 */
function extractActions(text, extras) {
  const actions = {
    policyUrl: extras.policyUrl || null,
    optOutUrl: null,
    contactEmail: null
  };

  const links = extras.pageLinks || [];
  for (const link of links) {
    const hay = `${link.text || ""} ${link.href || ""}`;
    if (!ACTION_URL_PATTERNS.some((re) => re.test(hay))) continue;
    try {
      const u = new URL(link.href);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      actions.optOutUrl = u.href;
      break;
    } catch {
      /* skip bad href */
    }
  }

  const emails = text.match(EMAIL_RE) || [];
  actions.contactEmail = pickContactEmail(emails);

  return actions;
}

export { RULES, ACTION_URL_PATTERNS, isPlaceholderEmail, pickContactEmail };
