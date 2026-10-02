# Security

c3nsor has three parts: the Chrome extension (`extension/`), the static GitHub Pages site (`docs/`), and a small Cloudflare Worker proxy (`proxy/`). There is no backend, database, or user account system.

## Threat model

| Untrusted input | Where it enters | Main risk |
| --- | --- | --- |
| Privacy-policy HTML and text from third-party sites | Extension service worker, Try-it page (via the proxy), pasted text | Cross-site scripting (XSS) when findings, excerpts, domains, and links are shown |
| URLs typed or pasted by a user | Popup policy URL box, Try-it URL box | `javascript:`/`data:` links, malformed URLs |
| Messages to the service worker | `chrome.runtime.onMessage` | A content script or web page asking the extension to act |
| Results from the injected discover script | `chrome.scripting.executeScript` | Malformed or oversized link lists from a hostile page |
| URLs sent to the proxy | `GET /?url=` on the Worker | Server-side request forgery (SSRF), abuse as an open proxy |

## Protections

**XSS (extension popup).** All third-party strings are rendered with `textContent` and DOM properties through the builders in `extension/popup/render.js`; there is no `innerHTML` with untrusted data. Links are only created for `http:`/`https:` URLs and open with `rel="noopener noreferrer"`. The manifest sets a strict Content Security Policy for extension pages:

```
default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; connect-src https: http:
```

`connect-src` stays open to http(s) because the service worker downloads policy pages from hosts the user allowed. Policy HTML is never inserted into a page; `lib/clean.js` converts it to plain text with string processing.

**XSS (website).** The Try-it page renders with `textContent`/`createElement` only and parses proxied HTML with `DOMParser` (scripts in it never run). Pages have no inline scripts, inline event handlers, or inline styles, and each page ships a `<meta http-equiv="Content-Security-Policy">` that allows only what it uses: `'self'` scripts (or none), Google Fonts styles/fonts, the proxy origin for `connect-src` on `try.html`, and Formspree for the waitlist form on `index.html`. No page allows `'unsafe-inline'` or `'unsafe-eval'`. Documents created by `DOMParser` inherit the page's CSP, so after live URL analysis the console may show `style-src` reports for the downloaded page's own inline styles; that is the policy blocking them in the hidden parsed copy, not a bug, so don't loosen the CSP to silence it. GitHub Pages cannot send HTTP headers, so clickjacking protection (`frame-ancestors`) is not available for the site; it has no logged-in state to protect. Pages also set `Referrer-Policy: strict-origin-when-cross-origin` via `<meta name="referrer">`.

**Extension messaging.** The service worker only answers messages from this extension's own pages (`sender.id === chrome.runtime.id` and `sender.url` inside the extension origin), so content scripts and web pages cannot drive it. Messages are validated in `extension/lib/messages.js`: known types only, boolean `force`, and `policyUrl` must be an `http(s)` string of at most 2,048 characters with no embedded credentials. Results from the injected discover script are reduced to capped lists of `http(s)` links. The extension does not listen for external messages, and its session cache (`chrome.storage.session`) is not readable by content scripts.

**SSRF and proxy abuse.** The Worker accepts only `GET`/`OPTIONS` from allow-listed origins, rejects non-`http(s)` schemes, credentials, non-default ports, IP literals, and internal hostnames, re-validates every redirect hop, caps the `url` parameter length, page size (1.5 MB), and time (12 s), accepts HTML/text only, and returns the body as `text/plain` with `X-Content-Type-Options: nosniff` and a `default-src 'none'` CSP so the proxy origin can never render third-party HTML.

**SQL and other injection.** There is no database, SQL, ORM, or server-side query anywhere in the project, so there is no SQL injection surface. User input is never passed to a shell, `eval`, or `new Function`. If a database is ever added, use parameterized queries or the ORM as intended (see `.cursor/rules/project-best-practices.mdc`); never build queries by string concatenation.

**Data minimization.** No telemetry or analytics. Extension and Try-it fetches use `credentials: "omit"` (no cookies sent). The extension keeps a short session cache on the device only. The proxy does not log or store URLs or pages (Cloudflare may process standard request data). The waitlist form sends only the email address you enter (plus an empty spam honeypot field) to [Formspree](https://formspree.io); nothing else on the site collects personal data.

## Checks

```bash
cd extension && npm run verify     # includes XSS/CSP regression tests (verify-security, verify-popup-render, verify-messages)
cd proxy && npm test               # proxy validation and security-header tests
```

## Reporting a vulnerability

Please email **privacy@c3nsor.app** with steps to reproduce, or open a [private security advisory](https://github.com/michaelpetersonn/IS-581/security/advisories/new) on GitHub. Please do not open a public issue for security problems. We aim to reply within a few days.
