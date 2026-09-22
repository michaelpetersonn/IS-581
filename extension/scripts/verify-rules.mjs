/**
 * Offline verification of clean + rules against sample policy text.
 * Run: node scripts/verify-rules.mjs
 */
import { htmlToPlainText } from "../lib/clean.js";
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
const { findings, actions } = analyzePolicy(text, {
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

if (failed) {
  console.error(`\nFAILED: ${failed} checks`);
  process.exit(1);
}
console.log("\nAll rule checks passed.");
