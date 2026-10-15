# Instagram 30-Day Lock

Chrome extension (Manifest V3) that blocks Instagram for 30 days. Early unlock requires the recovery password you set when the lock starts.

## What it does

1. Open the popup and set a recovery password (min 8 characters).
2. Click **Start 30-day lock**.
3. Navigations to `instagram.com` / `instagr.am` redirect to a blocked page.
4. During the lock, the only in-extension escape is entering that password in the popup.
5. After 30 days the block ends automatically.

Uninstalling the extension also ends the block (Chrome cannot prevent uninstall).

## Load unpacked (local test)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this `instagram-blocker/` folder
4. Pin the extension, open the popup, start the lock
5. Visit `https://www.instagram.com` — you should see the blocked page

## Pack for Chrome Web Store

```bash
npm --prefix instagram-blocker run pack
```

Upload `instagram-blocker/instagram-blocker.zip` in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

Suggested store notes:

- Permission justification: `declarativeNetRequest` + Instagram host access are used only to redirect Instagram navigations while a lock is active; `storage` holds the lock end time and password hash; `tabs` closes/redirects already-open Instagram tabs when a lock starts.
- Privacy: no network calls, no analytics, password stored as PBKDF2 hash with random salt in `chrome.storage.local`.

## Develop

```bash
npm --prefix instagram-blocker test
```

Root `npm test` / `npm run ci` also run these checks.
