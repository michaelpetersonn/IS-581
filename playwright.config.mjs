import { defineConfig, devices } from "@playwright/test";

const PORT = 8765;
export const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.mjs",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 30_000,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "web",
      testMatch: "web/**/*.spec.mjs",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "extension",
      testMatch: "extension/**/*.spec.mjs",
    },
  ],
  webServer: {
    command: `npm --prefix extension run --silent build:web && node scripts/serve-docs.mjs ${PORT}`,
    url: `${BASE_URL}/try.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
