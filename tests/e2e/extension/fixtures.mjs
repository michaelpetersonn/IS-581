/**
 * Playwright fixture that loads the c3nsor extension into Chromium.
 *
 * Tests load a temporary copy of extension/ whose manifest also grants host access to the local
 * test server. That stands in for the user clicking the toolbar icon (activeTab), which Playwright
 * cannot do. The real manifest is never changed.
 */
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, test as base } from "@playwright/test";

const repoRoot = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");
export const TEST_HOST_PATTERN = "http://127.0.0.1/*";
const DEBUG_PORT = 9333;

function prepareExtensionCopy() {
  const dir = mkdtempSync(join(tmpdir(), "c3nsor-ext-"));
  cpSync(join(repoRoot, "extension"), dir, {
    recursive: true,
    filter: (src) => !/[\\/](scripts|store)([\\/]|$)|\.zip$/.test(src),
  });
  const manifestPath = join(dir, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.host_permissions = [TEST_HOST_PATTERN];
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return dir;
}

export const test = base.extend({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const extensionDir = prepareExtensionCopy();
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [
        `--disable-extensions-except=${extensionDir}`,
        `--load-extension=${extensionDir}`,
        `--remote-debugging-port=${DEBUG_PORT}`,
      ],
    });
    await use(context);
    await context.close();
    rmSync(extensionDir, { recursive: true, force: true });
  },
  serviceWorker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker");
    await use(worker);
  },
  extensionId: async ({ serviceWorker }, use) => {
    await use(new URL(serviceWorker.url()).host);
  },
  /**
   * Open the real toolbar popup for a tab, as if the user clicked the c3nsor icon.
   * Playwright does not list action popups, so the popup page is reached over the DevTools protocol.
   */
  openPopup: async ({ serviceWorker, extensionId }, use) => {
    const popupUrl = `chrome-extension://${extensionId}/popup/popup.html`;
    const connections = [];
    await use(async (page) => {
      await page.bringToFront();
      await serviceWorker.evaluate(() => chrome.action.openPopup());
      const debugUrl = `http://127.0.0.1:${DEBUG_PORT}`;
      for (let i = 0; i < 50; i++) {
        const targets = await (await fetch(`${debugUrl}/json/list`)).json();
        if (targets.some((t) => t.url === popupUrl)) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      // Connect after the popup exists: pages created later are not attached to an existing connection.
      const browser = await chromium.connectOverCDP(debugUrl);
      connections.push(browser);
      const popup = browser
        .contexts()
        .flatMap((ctx) => ctx.pages())
        .find((p) => p.url() === popupUrl);
      if (!popup) throw new Error("The c3nsor popup did not open.");
      return popup;
    });
    for (const browser of connections) await browser.close();
  },
  /** Toolbar badge text for the tab showing `page`. */
  badgeText: async ({ serviceWorker }, use) => {
    await use((page) =>
      serviceWorker.evaluate(async (url) => {
        const [tab] = await chrome.tabs.query({ url });
        return chrome.action.getBadgeText({ tabId: tab.id });
      }, page.url()),
    );
  },
});

export const expect = test.expect;
