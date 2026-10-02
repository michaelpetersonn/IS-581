/**
 * DOM builders for the popup. Policy text, excerpts, domains, and URLs come from
 * third-party sites, so every string is set with textContent / properties — never HTML.
 * Each builder takes a `doc` (the popup's document) so it can be unit tested without a browser.
 */

/** Only allow navigable http(s) links (blocks javascript:/data:). */
export function isHttpUrl(value) {
  try {
    const u = new URL(String(value || ""));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "that site";
  }
}

export function shortUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 28 ? `${u.pathname.slice(0, 28)}…` : u.pathname;
    return u.hostname + path;
  } catch {
    return String(url ?? "");
  }
}

/** Keep citations short and readable under the one-look summary. */
export function compactCite(text) {
  let s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length > 140) s = `${s.slice(0, 137)}…`;
  return s;
}

/**
 * @param {Document} doc
 * @param {string} tag
 * @param {{ className?: string, text?: unknown, title?: unknown }} [props]
 */
export function el(doc, tag, props = {}) {
  const node = doc.createElement(tag);
  if (props.className) node.className = props.className;
  if (props.text !== undefined) node.textContent = String(props.text ?? "");
  if (props.title) node.title = String(props.title);
  return node;
}

/**
 * Children for the `.ext-head` row: domain, plus the alert pill when a count is given.
 * @param {Document} doc
 * @param {{ domain: unknown, policyUrl?: unknown, alertCount?: number }} info
 * @returns {HTMLElement[]}
 */
export function buildMeta(doc, info) {
  const nodes = [el(doc, "strong", { text: info.domain, title: info.policyUrl || "" })];
  if (typeof info.alertCount === "number") {
    const label = info.alertCount === 1 ? "1 alert" : `${info.alertCount} alerts`;
    nodes.push(el(doc, "span", { className: "alerts", text: label }));
  }
  return nodes;
}

/**
 * @param {Document} doc
 * @param {string} label
 * @param {{ found?: boolean, summary?: unknown, explanation?: unknown, excerpt?: unknown }} item
 */
export function buildFinding(doc, label, item) {
  const li = el(doc, "li");
  const row = el(doc, "div", { className: "row-main" });
  row.append(
    el(doc, "span", {
      className: `badge ${item.found ? "found" : "miss"}`,
      text: item.found ? "Found" : "Unclear"
    }),
    el(doc, "span", { className: "label", text: label })
  );
  li.append(row);

  if (!item.found) return li;
  const summary =
    item.summary || item.explanation || "Mentioned in the policy, but details are unclear in one look.";
  li.append(el(doc, "p", { className: "summary", text: summary }));
  if (item.excerpt) {
    li.append(
      el(doc, "p", {
        className: "excerpt",
        text: `“${compactCite(item.excerpt)}”`,
        title: item.excerpt
      })
    );
  }
  return li;
}

/**
 * @param {Document} doc
 * @param {unknown} href
 * @param {string} label
 * @param {string} [className]
 * @returns {HTMLAnchorElement|null} null when the URL is not http(s)
 */
export function buildLink(doc, href, label, className = "") {
  if (!isHttpUrl(href)) return null;
  const a = /** @type {HTMLAnchorElement} */ (el(doc, "a", { className, text: label }));
  a.href = String(href);
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}

/**
 * @param {Document} doc
 * @param {string} label
 */
export function buildDisabledAction(doc, label) {
  const btn = /** @type {HTMLButtonElement} */ (el(doc, "button", { className: "is-disabled", text: label }));
  btn.type = "button";
  btn.disabled = true;
  return btn;
}
