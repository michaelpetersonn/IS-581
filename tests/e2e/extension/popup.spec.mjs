/**
 * End-to-end tests for the Chrome extension: real popup, real service worker, local fixture sites.
 */
import { expect, test } from "./fixtures.mjs";

test("finds a same-site policy, shows five checkpoints, and sets the badge", async ({
  context,
  openPopup,
  badgeText,
}) => {
  const page = await context.newPage();
  await page.goto("/fixtures/shop/");
  const popup = await openPopup(page);

  await expect(popup.locator("#status")).toHaveText(
    "Rules matched language in this policy",
    { timeout: 15_000 },
  );
  await expect(popup.locator("#meta strong")).toHaveText("127.0.0.1");
  await expect(popup.locator("#meta strong")).toHaveAttribute(
    "title",
    "http://127.0.0.1:8765/fixtures/shop/privacy.html",
  );
  await expect(popup.locator("#meta .alerts")).toHaveText("5 alerts");
  await expect(popup.locator("#findings > li")).toHaveCount(5);
  await expect(popup.locator("#findings .badge.found")).toHaveCount(5);
  await expect(popup.locator("#findings .excerpt").first()).toBeVisible();
  await expect(popup.locator("#actions")).toContainText("Copy email");
  expect(await badgeText(page)).toBe("5");
});

test("a page with no policy explains what to do and clears the badge", async ({
  context,
  openPopup,
  badgeText,
}) => {
  const page = await context.newPage();
  await page.goto("/fixtures/no-policy/");
  const popup = await openPopup(page);

  await expect(popup.locator("#status")).toContainText(
    "No privacy policy was found on this page",
    { timeout: 15_000 },
  );
  await expect(popup.locator("#findings")).toBeHidden();
  expect(await badgeText(page)).toBe("");
});

test("a pasted policy URL is analyzed from the popup", async ({
  context,
  openPopup,
}) => {
  const page = await context.newPage();
  await page.goto("/fixtures/no-policy/");
  const popup = await openPopup(page);
  await expect(popup.locator("#status")).toContainText("No privacy policy", {
    timeout: 15_000,
  });

  await popup
    .locator("#policy-url")
    .fill("http://127.0.0.1:8765/fixtures/shop/privacy.html");
  await popup.locator("#analyze-url-btn").click();
  await expect(popup.locator("#status")).toHaveText(
    "Rules matched language in this policy",
    { timeout: 15_000 },
  );
  await expect(popup.locator("#findings .badge.found")).toHaveCount(5);
});
