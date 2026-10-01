/**
 * Snapshot analyses of known-good policies for the web demo's sample buttons (needs network).
 * Run: node scripts/build-samples.mjs   → writes docs/try/samples.json
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { htmlToPlainText, looksAnalyzablePolicy } from "../lib/clean.js";
import { fetchPolicyHtml } from "../lib/fetch.js";
import { buildAnalysisResult } from "../lib/result.js";

const SITES = [
  { id: "duckduckgo", domain: "duckduckgo.com", url: "https://duckduckgo.com/privacy" },
  { id: "mozilla", domain: "mozilla.org", url: "https://www.mozilla.org/en-US/privacy/" },
  {
    id: "wikimedia",
    domain: "wikipedia.org",
    url: "https://foundation.wikimedia.org/wiki/Policy:Privacy_policy"
  },
  { id: "discover", domain: "discover.com", url: "https://www.discover.com/privacy-statement/" }
];

const ANCHOR_RE = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

/**
 * Policy-page links feed opt-out detection the same way page links do in the extension.
 * @param {string} html
 * @param {string} baseUrl
 */
function extractLinks(html, baseUrl) {
  const links = [];
  for (const match of html.matchAll(ANCHOR_RE)) {
    try {
      const href = new URL(match[1], baseUrl).href;
      const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      links.push({ href, text });
    } catch {
      /* skip bad href */
    }
  }
  return links;
}

const samples = [];
for (const site of SITES) {
  const fetched = await fetchPolicyHtml(site.url);
  if (!fetched.ok) {
    console.error("SKIP", site.domain, fetched.error);
    continue;
  }
  const text = htmlToPlainText(fetched.html);
  if (!looksAnalyzablePolicy(text)) {
    console.error("SKIP", site.domain, "did not look like a policy");
    continue;
  }
  const result = buildAnalysisResult(text, {
    domain: site.domain,
    policyUrl: fetched.finalUrl,
    pageLinks: extractLinks(fetched.html, fetched.finalUrl)
  });
  samples.push({ id: site.id, result });
  console.log("OK", site.domain, `${result.alertCount}/5 found`);
}

if (!samples.length) {
  console.error("No samples captured; leaving existing samples.json untouched.");
  process.exit(1);
}

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "try", "samples.json");
writeFileSync(out, `${JSON.stringify({ generatedAt: new Date().toISOString(), samples }, null, 2)}\n`);
console.log(`Wrote ${samples.length} samples → docs/try/samples.json`);
