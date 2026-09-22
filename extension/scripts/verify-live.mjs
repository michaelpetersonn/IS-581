/**
 * Fetch a few public privacy policies and run the rule analyzer.
 * Run: node scripts/verify-live.mjs
 */
import { htmlToPlainText } from "../lib/clean.js";
import { analyzePolicy } from "../lib/rules.js";
import { buildGuidance } from "../lib/templates.js";

const TARGETS = [
  {
    name: "example.com",
    urls: ["https://www.example.com/privacy", "https://example.com/privacy"]
  },
  {
    name: "wikipedia",
    urls: ["https://foundation.wikimedia.org/wiki/Policy:Privacy_policy"]
  },
  {
    name: "github",
    urls: ["https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"]
  },
  {
    name: "duckduckgo",
    urls: ["https://duckduckgo.com/privacy"]
  },
  {
    name: "mozilla",
    urls: ["https://www.mozilla.org/en-US/privacy/"]
  }
];

async function fetchText(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/html", "User-Agent": "c3nsor-mvp-verify/0.1" },
      redirect: "follow"
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 1_500_000) return null;
    return { html: new TextDecoder().decode(buf), finalUrl: res.url };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

let sitesOk = 0;

for (const target of TARGETS) {
  let fetched = null;
  let used = null;
  for (const url of target.urls) {
    fetched = await fetchText(url);
    if (fetched) {
      used = url;
      break;
    }
  }
  if (!fetched) {
    console.log("SKIP", target.name, "(could not fetch)");
    continue;
  }
  const text = htmlToPlainText(fetched.html);
  const { findings, actions } = analyzePolicy(text, {
    policyUrl: fetched.finalUrl,
    pageLinks: []
  });
  const foundCount = Object.values(findings).filter((f) => f.found).length;
  const guidance = buildGuidance(findings);
  console.log(
    "SITE",
    target.name,
    `found=${foundCount}/5`,
    `chars=${text.length}`,
    `email=${actions.contactEmail || "-"}`,
    `url=${fetched.finalUrl}`
  );
  for (const [id, f] of Object.entries(findings)) {
    if (f.found) console.log("  -", id, ":", f.excerpt.slice(0, 90).replace(/\n/g, " "));
  }
  console.log("  guidance:", guidance.slice(0, 120));
  if (foundCount >= 1 && text.length > 200) sitesOk++;
}

if (sitesOk < 2) {
  console.error(`\nExpected at least 2 live sites with findings, got ${sitesOk}`);
  process.exit(1);
}
console.log(`\nLive checks passed (${sitesOk} sites with usable analysis).`);
