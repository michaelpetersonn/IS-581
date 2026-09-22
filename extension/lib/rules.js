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

/**
 * Find the best supporting sentence for a category.
 * @param {string[]} sentences
 * @param {RegExp[]} patterns
 * @returns {string|null}
 */
function findExcerpt(sentences, patterns) {
  let best = null;
  let bestScore = 0;

  for (const sentence of sentences) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(sentence)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = sentence;
    }
  }

  if (!best || bestScore === 0) return null;
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

  return { findings, actions, sentenceCount: sentences.length };
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
    if (ACTION_URL_PATTERNS.some((re) => re.test(hay))) {
      actions.optOutUrl = link.href;
      break;
    }
  }

  if (!actions.optOutUrl && extras.policyUrl) {
    // Heuristic: same-origin “privacy choices” style paths are handled at discovery time via pageLinks.
  }

  const emails = text.match(EMAIL_RE) || [];
  const privacyEmail = emails.find((e) => /privacy|dpo|legal|data/i.test(e));
  actions.contactEmail = privacyEmail || emails[0] || null;

  return actions;
}

export { RULES, ACTION_URL_PATTERNS };
