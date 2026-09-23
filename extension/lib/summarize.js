/**
 * Rules-based one-look summaries from matched policy text (not AI).
 * Pulls concrete signal labels so the popup answers “what happens to my data?” at a glance.
 */

/** @type {Record<string, { re: RegExp, label: string }[]>} */
const SIGNALS = {
  collected: [
    { re: /\be-?mail\b/i, label: "email" },
    { re: /\bphone|telephone|mobile number\b/i, label: "phone number" },
    { re: /\bip address(es)?\b/i, label: "IP address" },
    { re: /\bdevice (id|identifier|identifiers|information)\b/i, label: "device IDs" },
    { re: /\bcookies?\b/i, label: "cookies" },
    { re: /\blocation (data|information)|precise location|geolocation\b/i, label: "location" },
    { re: /\bpayment|credit card|debit card|financial\b/i, label: "payment info" },
    { re: /\bname\b/i, label: "name" },
    { re: /\b(mailing|postal|street|home|billing)\s+address\b/i, label: "address" },
    { re: /\baccount (info|information|data)\b/i, label: "account details" },
    { re: /\bbiometric\b/i, label: "biometrics" },
    { re: /\bpersonal (information|data)\b/i, label: "personal information" }
  ],
  used: [
    { re: /\b(provide|operate|deliver|maintain)\b.{0,40}\b(service|product|account|app)/i, label: "running the service" },
    { re: /\bto provide\b/i, label: "running the service" },
    { re: /\banalytics|measure|statistics|usage data\b/i, label: "analytics" },
    { re: /\bimprove|research|develop(ment)?\b/i, label: "product improvement" },
    { re: /\bmarketing|promotional|newsletter\b/i, label: "marketing" },
    { re: /\badvertis|personalized ads?|targeted ads?\b/i, label: "advertising" },
    { re: /\bpersonalize|customise|customize|tailor\b/i, label: "personalization" },
    { re: /\bsecurity|fraud|abuse|protect\b/i, label: "security & fraud prevention" },
    { re: /\blegal|comply|law enforcement|regulation\b/i, label: "legal compliance" },
    { re: /\bcustomer support|respond to (your )?requests?\b/i, label: "customer support" }
  ],
  shared: [
    { re: /\bservice providers?\b/i, label: "service providers" },
    { re: /\baffiliates?\b/i, label: "affiliates" },
    { re: /\badvertising partners?\b/i, label: "advertising partners" },
    { re: /\bbusiness partners?\b/i, label: "business partners" },
    { re: /\bthird[- ]part(y|ies)\b/i, label: "third parties" },
    { re: /\bvendors?\b/i, label: "vendors" },
    { re: /\blaw enforcement|government\b/i, label: "law enforcement / government" },
    { re: /\b(in connection with )?(sale|merger|acquisition)\b/i, label: "business transfers" }
  ],
  advertising: [
    { re: /\b(do not|don't|does not|never)\s+(rent or )?sell\b/i, label: "says they do not sell personal info" },
    { re: /\bsell(s|ing)? (your )?personal\b/i, label: "may sell personal information" },
    { re: /\bshare.{0,40}(for )?(cross[- ]context|advertising)\b/i, label: "sharing for advertising" },
    { re: /\btargeted advertising|interest[- ]based|behavioral advertising|personalized ads?\b/i, label: "targeted / personalized ads" },
    { re: /\badvertising partners?\b/i, label: "advertising partners" }
  ],
  choices: [
    { re: /\bopt[- ]out\b/i, label: "opt out" },
    { re: /\b(request )?deletion|right to (delete|erasure)|delete (your )?(account|data)\b/i, label: "request deletion" },
    { re: /\b(request )?access|right to access\b/i, label: "access your data" },
    { re: /\bcorrect|rectif(y|ication)\b/i, label: "correct your data" },
    { re: /\byour privacy choices|do not sell\b/i, label: "privacy choices / do-not-sell" },
    { re: /\bcookie (settings|preferences)\b/i, label: "cookie settings" }
  ]
};

const PREFIX = {
  collected: "May collect",
  used: "Uses your data for",
  shared: "May share with",
  advertising: "Sale / ads",
  choices: "You can"
};

/**
 * Build a short, scannable summary from category signals in the citation (and optional full text).
 * @param {string} categoryId
 * @param {string|null} excerpt
 * @param {string} [fullText]
 * @param {string} [fallbackExplanation]
 * @returns {string}
 */
export function buildSummary(categoryId, excerpt, fullText = "", fallbackExplanation = "") {
  const signals = SIGNALS[categoryId];
  if (!signals) return fallbackExplanation || "Not clearly specified";

  const hay = `${excerpt || ""}\n${String(fullText || "").slice(0, 12_000)}`;
  const labels = [];
  const seen = new Set();

  for (const { re, label } of signals) {
    re.lastIndex = 0;
    if (!re.test(hay)) continue;
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
    if (labels.length >= 4) break;
  }

  if (!labels.length) {
    return fallbackExplanation || "Mentioned in the policy, but details are unclear in one look.";
  }

  // Advertising: prefer a clear sell / do-not-sell headline
  if (categoryId === "advertising") {
    const noSell = labels.find((l) => /do not sell/i.test(l));
    const doesSell = labels.find((l) => /may sell/i.test(l));
    const ads = labels.filter(
      (l) => l !== noSell && l !== doesSell
    );
    if (doesSell && noSell) {
      const extra = ads.slice(0, 1);
      return extra.length
        ? `May sell personal information, with do-not-sell / opt-out language; also ${extra.join(", ")}.`
        : "May sell personal information, with do-not-sell / opt-out language.";
    }
    if (noSell && !doesSell) {
      const rest = ads.slice(0, 2);
      return rest.length ? `${noSell}; also mentions ${rest.join(", ")}.` : `${capitalize(noSell)}.`;
    }
    if (doesSell) {
      const rest = ads.slice(0, 2);
      return rest.length
        ? `${capitalize(doesSell)}; also ${rest.join(", ")}.`
        : `${capitalize(doesSell)}.`;
    }
  }

  const prefix = PREFIX[categoryId] || "Policy mentions";
  return `${prefix}: ${labels.join("; ")}.`;
}

/**
 * @param {string} s
 */
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
