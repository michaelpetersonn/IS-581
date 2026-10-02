/**
 * Static XSS guards: the extension and every website page ship a strict Content Security Policy,
 * pages have no inline script/style the CSP would need to allow, and UI code never builds HTML strings.
 * Run: node --test scripts/verify-security.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

const extUrl = new URL("../", import.meta.url);
const docsUrl = new URL("../../docs/", import.meta.url);
const read = (base, path) => readFileSync(new URL(path, base), "utf8");

/** @param {string} policy */
function parseCsp(policy) {
  const out = new Map();
  for (const part of policy.split(";")) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) out.set(name.toLowerCase(), values);
  }
  return out;
}

/** @param {Map<string, string[]>} csp @param {string} directive */
function effective(csp, directive) {
  return csp.get(directive) || csp.get("default-src") || [];
}

const HTML_SINKS = /\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write|\beval\s*\(|new Function\b|setTimeout\(\s*["'`]|setInterval\(\s*["'`]/;
const UI_SCRIPTS = [
  [extUrl, "popup/popup.js"],
  [extUrl, "popup/render.js"],
  [extUrl, "background/service-worker.js"],
  [extUrl, "content/discover.js"],
  [docsUrl, "try/try.js"],
  [docsUrl, "try/web-helpers.js"],
  [docsUrl, "signup.js"]
];

test("UI code never parses strings as HTML or code", () => {
  for (const [base, path] of UI_SCRIPTS) {
    assert.doesNotMatch(read(base, path), HTML_SINKS, path);
  }
});

test("extension pages use a strict CSP that MV3 accepts", () => {
  const manifest = JSON.parse(read(extUrl, "manifest.json"));
  const policy = manifest.content_security_policy?.extension_pages;
  assert.equal(typeof policy, "string");
  const csp = parseCsp(policy);
  assert.deepEqual(csp.get("script-src"), ["'self'"]);
  assert.deepEqual(csp.get("object-src"), ["'none'"]);
  assert.deepEqual(csp.get("base-uri"), ["'none'"]);
  assert.deepEqual(csp.get("frame-ancestors"), ["'none'"]);
  assert.deepEqual(csp.get("default-src"), ["'self'"]);
  // The service worker downloads policies from any http(s) host the user allowed.
  assert.deepEqual(csp.get("connect-src"), ["https:", "http:"]);
  assert.doesNotMatch(policy, /unsafe-|\*|data:|blob:/);
  assert.equal(manifest.content_security_policy.sandbox, undefined);
  assert.equal(manifest.externally_connectable, undefined);
  assert.equal(manifest.web_accessible_resources, undefined);
});

test("popup page has no inline script, inline style, or event handlers", () => {
  const html = read(extUrl, "popup/popup.html");
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i);
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(html, /<style\b|\sstyle\s*=/i);
});

const pages = readdirSync(docsUrl).filter((f) => f.endsWith(".html"));

test("site has the expected pages", () => {
  for (const page of ["index.html", "extension.html", "try.html", "privacy-policy.html", "thank-you.html"]) {
    assert.ok(pages.includes(page), page);
  }
});

for (const page of pages) {
  test(`${page}: strict CSP meta and no inline code`, () => {
    const html = read(docsUrl, page);
    const metas = [...html.matchAll(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/gi)];
    assert.equal(metas.length, 1, "exactly one CSP meta");
    const policy = metas[0][1];
    const csp = parseCsp(policy);

    assert.ok(html.indexOf(metas[0][0]) < html.search(/<link\b|<script\b|<style\b/i), "CSP must come before any resource");
    assert.deepEqual(csp.get("default-src"), ["'none'"]);
    assert.deepEqual(csp.get("base-uri"), ["'none'"]);
    assert.deepEqual(csp.get("object-src"), ["'none'"]);
    assert.ok(csp.has("form-action"), "form-action set");
    assert.doesNotMatch(policy, /'unsafe-eval'|'unsafe-hashes'|'strict-dynamic'|\*|data:|blob:/);
    for (const dir of ["script-src", "style-src"]) {
      assert.ok(!effective(csp, dir).includes("'unsafe-inline'"), `${dir} must not allow 'unsafe-inline'`);
    }
    // Ignored (and warned about) when delivered via <meta>.
    for (const dir of ["frame-ancestors", "report-uri", "sandbox"]) assert.ok(!csp.has(dir), dir);

    assert.match(html, /<meta name="referrer" content="(strict-origin-when-cross-origin|strict-origin|same-origin|no-referrer)"/);
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i, "no inline <script>");
    assert.doesNotMatch(html, /<[a-z][^>]*\son[a-z]+\s*=/i, "no inline event handlers");
    assert.doesNotMatch(html, /<style\b|<[a-z][^>]*\sstyle\s*=/i, "no inline styles");
    assert.doesNotMatch(html, /(href|src|action)\s*=\s*["']?\s*(javascript|data|vbscript):/i);

    const scriptSrc = effective(csp, "script-src");
    for (const [, src] of html.matchAll(/<script[^>]*\bsrc="([^"]+)"/gi)) {
      assert.ok(!/^https?:/i.test(src) && scriptSrc.includes("'self'"), `script ${src} allowed by script-src`);
    }
    const styleSrc = effective(csp, "style-src");
    for (const [, href] of html.matchAll(/<link[^>]*\bhref="(https:[^"]+)"[^>]*rel="stylesheet"/gi)) {
      assert.ok(styleSrc.includes(new URL(href).origin), `stylesheet ${href} allowed by style-src`);
    }
    for (const [, action] of html.matchAll(/<form[^>]*\baction="(https:[^"]+)"/gi)) {
      assert.ok(csp.get("form-action").includes(new URL(action).origin), `form action ${action} allowed`);
    }
    for (const [, endpoint] of html.matchAll(/data-endpoint="([^"]+)"/gi)) {
      assert.ok(effective(csp, "connect-src").includes(new URL(endpoint).origin), `fetch ${endpoint} allowed`);
    }
  });
}

test("try.html allows the configured proxy and nothing else cross-origin", async () => {
  const { PROXY_URL } = await import(new URL("try/config.js", docsUrl).href);
  const csp = parseCsp(read(docsUrl, "try.html").match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)[1]);
  const connect = csp.get("connect-src");
  assert.ok(connect.includes("'self'"), "samples.json");
  if (PROXY_URL) assert.ok(connect.includes(new URL(PROXY_URL).origin), "proxy origin");
  assert.equal(connect.filter((v) => /^https:/.test(v)).length, PROXY_URL ? 1 : 0);
});
