/**
 * Offline verification of clean + rules against sample policy text.
 * Run: node scripts/verify-rules.mjs
 */
import { htmlToPlainText, looksLikePrivacyPolicy } from "../lib/clean.js";
import { analyzePolicy } from "../lib/rules.js";
import { buildGuidance } from "../lib/templates.js";

const sampleHtml = `
<html><body>
<nav>Menu</nav>
<script>evil()</script>
<article>
<h1>Privacy Policy</h1>
<p>We collect personal information including your email address, IP address, and device identifiers when you use our services.</p>
<p>We use this information to provide and improve our services, for analytics, and for marketing.</p>
<p>We may share your information with service providers and advertising partners.</p>
<p>We use targeted advertising and may sell personal information as defined under CCPA.</p>
<p>You may opt-out of the sale of personal information and request deletion of your data by emailing privacy@example.com or visiting our Do Not Sell page.</p>
</article>
</body></html>
`;

const text = htmlToPlainText(sampleHtml);
const { findings, actions, alertCount } = analyzePolicy(text, {
  policyUrl: "https://example.com/privacy",
  pageLinks: [
    { href: "https://example.com/privacy-choices", text: "Your Privacy Choices" },
    { href: "https://example.com/do-not-sell", text: "Do Not Sell My Personal Information" }
  ]
});

const required = ["collected", "used", "shared", "advertising", "choices"];
let failed = 0;

for (const id of required) {
  const f = findings[id];
  if (!f) {
    console.error("MISSING category", id);
    failed++;
    continue;
  }
  if (!f.found) {
    console.error("EXPECTED found:", id, f);
    failed++;
  } else if (!f.excerpt) {
    console.error("EXPECTED excerpt:", id);
    failed++;
  } else {
    console.log("OK", id, "→", f.excerpt.slice(0, 80) + "...");
  }
}

if (!actions.optOutUrl) {
  console.error("EXPECTED optOutUrl from pageLinks");
  failed++;
} else {
  console.log("OK optOutUrl", actions.optOutUrl);
}

if (!actions.contactEmail) {
  console.error("EXPECTED contactEmail");
  failed++;
} else {
  console.log("OK contactEmail", actions.contactEmail);
}

if (typeof alertCount !== "number" || alertCount !== 5) {
  console.error("EXPECTED alertCount 5, got", alertCount);
  failed++;
} else {
  console.log("OK alertCount", alertCount);
}

// Placeholder email must be ignored
const placeholderOnly = analyzePolicy(
  "Contact us at you@domain.com for privacy questions. We collect personal information including email."
);
if (placeholderOnly.actions.contactEmail) {
  console.error("EXPECTED no contactEmail for you@domain.com, got", placeholderOnly.actions.contactEmail);
  failed++;
} else {
  console.log("OK rejected you@domain.com");
}

const mixed = analyzePolicy(
  "Email you@domain.com or privacy@acme.com. We collect personal information including email."
);
if (mixed.actions.contactEmail !== "privacy@acme.com") {
  console.error("EXPECTED privacy@acme.com, got", mixed.actions.contactEmail);
  failed++;
} else {
  console.log("OK preferred privacy@acme.com over you@domain.com");
}

const guidance = buildGuidance(findings);
if (!guidance || guidance.length < 20) {
  console.error("EXPECTED guidance");
  failed++;
} else {
  console.log("OK guidance", guidance.slice(0, 100) + "...");
}

// Not specified path
const empty = analyzePolicy("Welcome to our website. Contact support for help.");
for (const id of required) {
  if (empty.findings[id].found) {
    console.error("EXPECTED not specified for thin text:", id);
    failed++;
  }
}
console.log("OK not-specified path for thin text");

// Prefer verb sentences over short headings
const headingBias = analyzePolicy(
  "Information We Collect. We collect personal information including your email address and IP address when you use our services."
);
if (!headingBias.findings.collected.found) {
  console.error("EXPECTED collected hit");
  failed++;
} else if (/^Information We Collect\.?$/i.test(headingBias.findings.collected.excerpt.trim())) {
  console.error("EXPECTED verb sentence, got heading:", headingBias.findings.collected.excerpt);
  failed++;
} else {
  console.log("OK excerpt prefers verb sentence over heading");
}

// Skip markup leftovers
const junk = analyzePolicy(
  '{ "collect": true } <div class="x">nav</div> We may share your information with service providers and advertising partners.'
);
if (!junk.findings.shared.found) {
  console.error("EXPECTED shared despite junk nearby");
  failed++;
} else if (/[{<]/.test(junk.findings.shared.excerpt)) {
  console.error("EXPECTED clean excerpt, got", junk.findings.shared.excerpt);
  failed++;
} else {
  console.log("OK skipped junk excerpt");
}

// Marketing / cookie-banner pages must not count as policies
const marketing = htmlToPlainText(`
<html><body>
<h1>c3nsor</h1>
<p>Join the waitlist today.</p>
<p>We use cookies to personalize content and ads, and to measure our advertising.</p>
</body></html>
`);
if (looksLikePrivacyPolicy(marketing)) {
  console.error("EXPECTED marketing page to fail looksLikePrivacyPolicy");
  failed++;
} else {
  console.log("OK rejected marketing/cookie-banner page as policy");
}

const policyLike = htmlToPlainText(`
<html><body>
<h1>Privacy Policy</h1>
<p>Last updated: September 21, 2026</p>
<p>We collect personal information including your email address when you join our waitlist.</p>
<p>We use this information to contact you about product updates and to operate the site with service providers.</p>
<p>We may share information with third parties that process submissions on our behalf.</p>
<p>You may request deletion of your data by emailing privacy@example.com or using any opt-out link we provide.</p>
<p>This Privacy Policy explains how we handle personal data on this website.</p>
</body></html>
`);
if (!looksLikePrivacyPolicy(policyLike)) {
  console.error("EXPECTED sample policy to pass looksLikePrivacyPolicy");
  failed++;
} else {
  console.log("OK accepted real policy-like text");
}

if (failed) {
  console.error(`\nFAILED: ${failed} checks`);
  process.exit(1);
}
console.log("\nAll rule checks passed.");
