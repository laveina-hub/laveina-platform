import { test, expect } from "@playwright/test";

import { login, TEST_ACCOUNTS } from "./helpers";

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.admin, "/admin");
  });

  test("admin overview page shows stats cards", async ({ page }) => {
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("admin can navigate to shipments page", async ({ page }) => {
    // Sidebar link: "Envíos"
    await page
      .getByRole("link", { name: /envíos|shipments/i })
      .first()
      .click();
    await page.waitForURL(/\/admin\/shipments/, { timeout: 10_000 });
    expect(page.url()).toContain("/admin/shipments");
  });

  test("admin can navigate to pickup points management", async ({ page }) => {
    // Sidebar link: "Puntos de Recogida"
    await page
      .getByRole("link", { name: /puntos de recogida|pickup points/i })
      .first()
      .click();
    await page.waitForURL(/\/admin\/pickup-points/, { timeout: 10_000 });
    expect(page.url()).toContain("/admin/pickup-points");
  });

  test("admin can navigate to settings page", async ({ page }) => {
    // Sidebar link: "Configuración"
    await page
      .getByRole("link", { name: /configuración|settings/i })
      .first()
      .click();
    await page.waitForURL(/\/admin\/settings/, { timeout: 10_000 });
    expect(page.url()).toContain("/admin/settings");
  });

  test("admin can navigate to dispatch page", async ({ page }) => {
    // Sidebar link: "Despacho"
    await page
      .getByRole("link", { name: /despacho|dispatch/i })
      .first()
      .click();
    await page.waitForURL(/\/admin\/dispatch/, { timeout: 10_000 });
    expect(page.url()).toContain("/admin/dispatch");
  });
});
