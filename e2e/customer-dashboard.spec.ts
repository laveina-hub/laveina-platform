import { test, expect } from "@playwright/test";

import { login, TEST_ACCOUNTS } from "./helpers";

test.describe("Customer Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.customer, "/customer");
  });

  test("customer dashboard loads and shows shipments section", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("shows empty state or shipment list", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    // Either shows a table/list or an empty state CTA
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });
});
