import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Laveina E2E tests.
 *
 * Test accounts (must be created in Supabase first — see seed.sql):
 *   admin@laveina-test.com / TestAdmin123!
 *   shop-origin@laveina-test.com / TestShop123!
 *   shop-dest@laveina-test.com / TestShop123!
 *   customer@laveina-test.com / TestCustomer123!
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  reporter: "html",

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "es",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],

  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
