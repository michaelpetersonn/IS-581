/**
 * XSS regression checks for the popup's DOM builders (popup/render.js).
 * A tiny fake DOM records text and throws if any HTML-parsing sink is touched.
 * Run: node --test scripts/verify-popup-render.mjs
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildDisabledAction,
  buildFinding,
  buildLink,
  buildMeta,
  compactCite,
  el,
  isHttpUrl,
  shortUrl
} from "../popup/render.js";

const PAYLOAD = `<img src=x onerror=alert(1)><script>alert(2)</script>"'><svg onload=alert(3)>`;

class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.textContent = "";
    this.className = "";
    this.title = "";
  }
  append(...nodes) {
    this.children.push(...nodes);
  }
  appendChild(node) {
    this.children.push(node);
    return node;
  }
  set innerHTML(_v) {
    throw new Error("innerHTML must not be used");
  }
  set outerHTML(_v) {
    throw new Error("outerHTML must not be used");
  }
  insertAdjacentHTML() {
    throw new Error("insertAdjacentHTML must not be used");
  }
  setAttribute(name) {
    if (/^on/i.test(name) || name === "srcdoc") throw new Error(`setAttribute(${name}) must not be used`);
  }
}

const doc = {
  created: [],
  createElement(tag) {
    const node = new FakeElement(tag);
    this.created.push(node.tagName);
    return node;
  }
};

function allTags(node) {
  return [node.tagName, ...node.children.flatMap(allTags)];
}

test("el sets untrusted strings as text only", () => {
  const node = el(doc, "p", { className: "summary", text: PAYLOAD, title: PAYLOAD });
  assert.equal(node.textContent, PAYLOAD);
  assert.equal(node.title, PAYLOAD);
  assert.deepEqual(node.children, []);
  assert.equal(el(doc, "p", { text: null }).textContent, "");
});

test("buildMeta keeps a hostile domain and policy URL as text", () => {
  const [strong, pill] = buildMeta(doc, { domain: PAYLOAD, policyUrl: PAYLOAD, alertCount: 1 });
  assert.equal(strong.tagName, "STRONG");
  assert.equal(strong.textContent, PAYLOAD);
  assert.equal(strong.title, PAYLOAD);
  assert.equal(pill.className, "alerts");
  assert.equal(pill.textContent, "1 alert");
  assert.equal(buildMeta(doc, { domain: "a.com", alertCount: 3 })[1].textContent, "3 alerts");
  assert.equal(buildMeta(doc, { domain: "a.com" }).length, 1);
});

test("buildFinding renders summary and excerpt as inert text with the popup's classes", () => {
  const li = buildFinding(doc, PAYLOAD, { found: true, summary: PAYLOAD, excerpt: PAYLOAD });
  assert.deepEqual(allTags(li), ["LI", "DIV", "SPAN", "SPAN", "P", "P"]);
  const [row, summary, excerpt] = li.children;
  assert.equal(row.className, "row-main");
  assert.equal(row.children[0].className, "badge found");
  assert.equal(row.children[0].textContent, "Found");
  assert.equal(row.children[1].className, "label");
  assert.equal(row.children[1].textContent, PAYLOAD);
  assert.equal(summary.className, "summary");
  assert.equal(summary.textContent, PAYLOAD);
  assert.equal(excerpt.className, "excerpt");
  assert.equal(excerpt.title, PAYLOAD);
  assert.equal(excerpt.textContent, `“${compactCite(PAYLOAD)}”`);
});

test("buildFinding for a miss shows only the badge row", () => {
  const li = buildFinding(doc, "Label", { found: false, summary: "ignored", excerpt: "ignored" });
  assert.deepEqual(allTags(li), ["LI", "DIV", "SPAN", "SPAN"]);
  assert.equal(li.children[0].children[0].className, "badge miss");
  assert.equal(li.children[0].children[0].textContent, "Unclear");
});

test("buildLink only allows http(s) and opens safely", () => {
  for (const bad of ["javascript:alert(1)", " javascript:alert(1)", "data:text/html,hi", "vbscript:x", "", null, PAYLOAD]) {
    assert.equal(buildLink(doc, bad, "Open"), null, String(bad));
  }
  const a = buildLink(doc, "https://example.com/privacy", PAYLOAD, "alt-open");
  assert.equal(a.href, "https://example.com/privacy");
  assert.equal(a.rel, "noopener noreferrer");
  assert.equal(a.target, "_blank");
  assert.equal(a.className, "alt-open");
  assert.equal(a.textContent, PAYLOAD);
});

test("buildDisabledAction", () => {
  const btn = buildDisabledAction(doc, "Opt out");
  assert.equal(btn.disabled, true);
  assert.equal(btn.type, "button");
  assert.equal(btn.className, "is-disabled");
  assert.equal(btn.textContent, "Opt out");
});

test("small helpers", () => {
  assert.equal(isHttpUrl("https://a.com"), true);
  assert.equal(isHttpUrl("javascript:alert(1)"), false);
  assert.equal(shortUrl("https://www.example.com/legal/privacy"), "www.example.com/legal/privacy");
  assert.equal(compactCite("a".repeat(200)).length, 138);
});
