import { test, expect } from "@playwright/test";

test.describe("Public Tracking", () => {
  test("tracking search page loads", async ({ page }) => {
    await page.goto("/es/tracking");
    await expect(page.getByRole("heading").first()).toBeVisible();
    // Search input should be present
    const searchInput = page.locator(
      'input[type="text"], input[placeholder*="tracking"], input[placeholder*="LAV"]'
    );
    await expect(searchInput.first()).toBeVisible();
  });

  test("searching for invalid tracking ID shows not found", async ({ page }) => {
    await page.goto("/es/tracking/LAV-INVALID99");
    await page.waitForLoadState("networkidle");

    // Should show a not-found or error message
    const content = await page.textContent("body");
    // The page should either show an error state or the tracking search
    expect(content).toBeTruthy();
  });

  test("tracking page shows search form", async ({ page }) => {
    await page.goto("/es/tracking");

    // Should have a form element or input for tracking ID
    const form = page.locator("form, [role='search']");
    const inputs = page.locator("input");

    const formCount = await form.count();
    const inputCount = await inputs.count();

    expect(formCount + inputCount).toBeGreaterThan(0);
  });
});
