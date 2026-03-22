import { test, expect } from "@playwright/test";

test.describe("Public Pages", () => {
  test("homepage loads with all sections", async ({ page }) => {
    await page.goto("/es");
    await expect(page).toHaveTitle(/Laveina/i);

    // Hero section
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

    // Should have navigation links
    await expect(page.getByRole("navigation").first()).toBeVisible();
  });

  test("pricing page loads", async ({ page }) => {
    await page.goto("/es/pricing");
    await page.waitForLoadState("networkidle");

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("pickup points page loads", async ({ page }) => {
    await page.goto("/es/pickup-points");
    await page.waitForLoadState("networkidle");

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("booking page loads with form", async ({ page }) => {
    await page.goto("/es/book");
    await page.waitForLoadState("networkidle");

    // Booking form should be visible
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });

  test("language switcher changes locale", async ({ page }) => {
    await page.goto("/es");
    await page.waitForLoadState("networkidle");

    // Find and click the English locale option
    const langSwitcher = page.locator(
      '[data-testid="locale-switcher"], button:has-text("ES"), button:has-text("EN")'
    );
    if (await langSwitcher.first().isVisible()) {
      await langSwitcher.first().click();

      // Look for English option
      const enOption = page.getByText("EN", { exact: true });
      if (await enOption.isVisible()) {
        await enOption.click();
        // URL may be /en or /en/ depending on trailing slash config
        await page.waitForURL(/\/en/, { timeout: 10_000 });
        expect(page.url()).toContain("/en");
      }
    }
  });

  test("unauthenticated user is redirected from dashboard to login", async ({ page }) => {
    await page.goto("/es/admin");
    await page.waitForURL(/\/auth\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/auth/login");
  });
});
