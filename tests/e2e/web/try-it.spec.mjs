/**
 * End-to-end tests for the Try it page (docs/try.html) in a real browser.
 * The policy proxy is stubbed with page.route, so no request leaves the machine.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { PROXY_URL } from "../../../docs/try/config.js";

const fixtures = join(fileURLToPath(import.meta.url), "..", "..", "fixtures");
const fixture = (path) => readFileSync(join(fixtures, path), "utf8");
const SHOP = "https://shop.example";
const REQUEST_ID = "3b241101-e2bb-4255-8caf-4136c566a962";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers":
    "X-Final-Url, X-Request-Id, X-C3nsor-Version",
};

/**
 * Answer proxy requests from a map of target URL to fixture HTML, or a JSON error.
 * @param {import("@playwright/test").Page} page
 * @param {Record<string, string | { status: number, code: string }>} pages
 */
async function stubProxy(page, pages) {
  const seen = [];
  await page.route(`${PROXY_URL}/**`, (route) => {
    const target = new URL(route.request().url()).searchParams.get("url");
    seen.push(target);
    const answer = pages[target];
    if (typeof answer === "string") {
      return route.fulfill({
        status: 200,
        headers: {
          ...CORS,
          "Content-Type": "text/plain; charset=utf-8",
          "X-Final-Url": target,
          "X-Request-Id": REQUEST_ID,
        },
        body: answer,
      });
    }
    const error = answer || { status: 502, code: "not_found" };
    return route.fulfill({
      status: error.status,
      headers: {
        ...CORS,
        "Content-Type": "application/json",
        "X-Request-Id": REQUEST_ID,
      },
      body: JSON.stringify({
        error: "stubbed",
        code: error.code,
        requestId: REQUEST_ID,
      }),
    });
  });
  return seen;
}

/** @param {import("@playwright/test").Page} page */
const findings = (page) => page.locator("#result-findings > li");

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (err) => {
    throw err;
  });
});

test("loads a saved sample and shows five checkpoints with citations", async ({
  page,
}) => {
  await page.goto("/try.html");
  const samples = page.locator("#sample-list button");
  await expect(samples.first()).toBeVisible();
  expect(await samples.count()).toBeGreaterThanOrEqual(3);

  await samples.nth(1).click();
  await expect(samples.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(findings(page)).toHaveCount(5);
  await expect(page.locator("#result-head strong")).toHaveText(
    (await samples.nth(1).locator("strong").textContent()) || "",
  );
  await expect(
    page.locator("#result-findings .try-excerpt").first(),
  ).toBeVisible();
  await expect(page.locator("#result-status")).toContainText("Saved snapshot");
});

test("analyzes pasted policy text in the browser", async ({ page }) => {
  await page.goto("/try.html");
  const policyText = await page.evaluate((html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.querySelector("main").innerText;
  }, fixture("shop/privacy.html"));

  await page.locator("#text-input").fill(policyText);
  await page.locator("#text-form button[type=submit]").click();

  await expect(page.locator("#result-status")).toHaveText(
    "Rules matched language in your pasted text",
  );
  await expect(page.locator("#result-head strong")).toHaveText("Pasted policy");
  await expect(page.locator("#result-head .try-alerts")).toHaveText("5 alerts");
  await expect(findings(page).locator(".try-badge.found")).toHaveCount(5);
  await expect(page.locator("#result-acts")).toContainText("Copy email");
});

test("rejects pasted text that is not a policy", async ({ page }) => {
  await page.goto("/try.html");
  await page
    .locator("#text-input")
    .fill("Buy one mug, get one free this week.");
  await page.locator("#text-form button[type=submit]").click();
  await expect(page.locator("#result-status")).toContainText(
    "doesn’t look like a privacy policy",
  );
  await expect(page.locator("#result-ref")).toBeHidden();
});

test("finds and analyzes a website's policy through the proxy", async ({
  page,
}) => {
  const seen = await stubProxy(page, {
    [`${SHOP}/`]: fixture("shop/index.html").replaceAll("/fixtures/shop/", "/"),
    [`${SHOP}/privacy.html`]: fixture("shop/privacy.html"),
  });
  await page.goto("/try.html");
  await page.locator("#url-input").fill("shop.example");
  await page.locator("#url-form button").click();

  await expect(page.locator("#result-status")).toHaveText(
    "Rules matched language in this policy",
  );
  await expect(page.locator("#result-head strong")).toHaveText("shop.example");
  await expect(findings(page).locator(".try-badge.found")).toHaveCount(5);
  await expect(
    page.locator("#result-acts a", { hasText: "Open policy" }),
  ).toHaveAttribute("href", `${SHOP}/privacy.html`);
  expect(seen).toEqual([`${SHOP}/`, `${SHOP}/privacy.html`]);
});

test("proxy errors show plain wording and a reference ID", async ({ page }) => {
  await stubProxy(page, {
    "https://unreachable.example/": { status: 502, code: "unreachable" },
  });
  await page.goto("/try.html");
  await page.locator("#url-input").fill("unreachable.example");
  await page.locator("#url-form button").click();

  await expect(page.locator("#result-status")).toHaveText(
    "We couldn’t reach unreachable.example. Check the spelling, or try the site’s full address.",
  );
  await expect(page.locator("#result-ref")).toHaveText(
    `Reference: ${REQUEST_ID}`,
  );
  await expect(page.locator("#result-findings")).toBeHidden();
});

test("a proxy timeout tells the visitor to retry or paste the text", async ({
  page,
}) => {
  await stubProxy(page, {
    "https://slow.example/": { status: 504, code: "timeout" },
  });
  await page.goto("/try.html");
  await page.locator("#url-input").fill("slow.example");
  await page.locator("#url-form button").click();
  await expect(page.locator("#result-status")).toContainText(
    "slow.example took too long to respond",
  );
  await expect(page.locator("#result-ref")).toContainText("Reference:");
});
