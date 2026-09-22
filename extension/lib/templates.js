/** Plain-English templates and guidance — rules only, not AI. */

export const CATEGORIES = [
  {
    id: "collected",
    label: "What data is collected",
    explanation:
      "This policy appears to describe personal or device information the site may collect about you."
  },
  {
    id: "used",
    label: "How the data is used",
    explanation:
      "This policy appears to describe purposes for using information it collects (for example accounts, analytics, or advertising)."
  },
  {
    id: "shared",
    label: "Who the data is shared with",
    explanation:
      "This policy appears to describe sharing information with partners, vendors, or other third parties."
  },
  {
    id: "advertising",
    label: "Mentions sale/sharing (including “we do not sell”)",
    explanation:
      "This policy appears to mention advertising, targeted ads, or selling/sharing personal information — including statements that the company does not sell data."
  },
  {
    id: "choices",
    label: "Access, opt-out, or deletion choices",
    explanation:
      "This policy appears to describe ways to access, correct, opt out of, or delete your information."
  }
];

export const NOT_SPECIFIED = "Not clearly specified";

/**
 * Build a short guidance line from which categories matched.
 * @param {Record<string, { found: boolean }>} findings
 * @returns {string}
 */
export function buildGuidance(findings) {
  const tips = [];
  const adExcerptPositive =
    findings.advertising?.found &&
    !/\b(do not|don't|does not|never)\s+(rent or )?sell\b/i.test(
      findings.advertising.excerpt || ""
    );

  if (adExcerptPositive) {
    tips.push(
      "Consider using any “Do Not Sell / Share” or “Your Privacy Choices” link before creating an account."
    );
  } else if (findings.advertising?.found) {
    tips.push(
      "This policy discusses selling or advertising practices — confirm whether that matches how you want your data used."
    );
  }
  if (findings.shared?.found) {
    tips.push(
      "Review who receives your data if you plan to sign up or submit personal details."
    );
  }
  if (findings.choices?.found) {
    tips.push(
      "You may have access, opt-out, or deletion options — open the links below when available."
    );
  }
  if (findings.collected?.found && !findings.choices?.found) {
    tips.push(
      "The policy describes collection but may not clearly explain how to control it — read carefully before you agree."
    );
  }

  if (tips.length === 0) {
    return "Open the full privacy policy and decide whether you are comfortable continuing before you share personal information.";
  }

  return tips.slice(0, 2).join(" ");
}
