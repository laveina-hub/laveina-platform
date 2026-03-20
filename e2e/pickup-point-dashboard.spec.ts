import { test, expect } from "@playwright/test";

import { login, TEST_ACCOUNTS } from "./helpers";

test.describe("Pickup Point Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.pickupPointOrigin, "/pickup-point");
  });

  test("pickup point overview page loads", async ({ page }) => {
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("can navigate to scan page", async ({ page }) => {
    // Sidebar link: "Escanear QR" or similar
    await page
      .getByRole("link", { name: /escanear|scan/i })
      .first()
      .click();
    await page.waitForURL(/\/pickup-point\/scan/, { timeout: 10_000 });
    expect(page.url()).toContain("/pickup-point/scan");
  });

  test("scan page has manual tracking ID input", async ({ page }) => {
    await page.goto("/es/pickup-point/scan");
    await page.waitForLoadState("networkidle");
    const input = page.locator("input");
    await expect(input.first()).toBeVisible();
  });

  test("can navigate to verify page", async ({ page }) => {
    await page
      .getByRole("link", { name: /verificar|verify/i })
      .first()
      .click();
    await page.waitForURL(/\/pickup-point\/verify/, { timeout: 10_000 });
    expect(page.url()).toContain("/pickup-point/verify");
  });

  test("can navigate to settings page", async ({ page }) => {
    // Sidebar link: "Configuración"
    await page
      .getByRole("link", { name: /configuración|settings/i })
      .first()
      .click();
    await page.waitForURL(/\/pickup-point\/settings/, { timeout: 10_000 });
    expect(page.url()).toContain("/pickup-point/settings");
  });
});
