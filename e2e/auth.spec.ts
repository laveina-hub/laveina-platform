import { test, expect } from "@playwright/test";

import { TEST_ACCOUNTS } from "./helpers";

test.describe("Authentication", () => {
  test("homepage loads and shows hero section", async ({ page }) => {
    await page.goto("/es");
    await expect(page).toHaveTitle(/Laveina/i);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("login page renders with email and password fields", async ({ page }) => {
    await page.goto("/es/auth/login");
    await expect(page.getByPlaceholder(/ejemplo|email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/caracteres|password|mínimo/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /iniciar sesión|login/i })).toBeVisible();
  });

  test("register page renders with all fields", async ({ page }) => {
    await page.goto("/es/auth/register");
    await expect(page.getByPlaceholder(/nombre|name/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/ejemplo|email/i)).toBeVisible();
  });

  test("login with invalid credentials stays on login page", async ({ page }) => {
    await page.goto("/es/auth/login");

    await page.getByPlaceholder(/ejemplo|email/i).fill("invalid@test.com");
    await page.getByPlaceholder(/caracteres|password|mínimo/i).fill("wrongpassword");
    await page.getByRole("button", { name: /iniciar sesión|login/i }).click();

    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/auth/login");
  });

  test("customer login succeeds and can access dashboard", async ({ page }) => {
    await page.goto("/es/auth/login");
    await page.getByPlaceholder(/ejemplo|email/i).fill(TEST_ACCOUNTS.customer.email);
    await page
      .getByPlaceholder(/caracteres|password|mínimo/i)
      .fill(TEST_ACCOUNTS.customer.password);
    await page.getByRole("button", { name: /iniciar sesión|login/i }).click();
    await page.waitForTimeout(3000);

    await page.goto("/es/customer");
    await page.waitForLoadState("networkidle");
    // Should not be redirected back to login
    expect(page.url()).not.toContain("/auth/login");
  });

  test("admin login succeeds and can access dashboard", async ({ page }) => {
    await page.goto("/es/auth/login");
    await page.getByPlaceholder(/ejemplo|email/i).fill(TEST_ACCOUNTS.admin.email);
    await page.getByPlaceholder(/caracteres|password|mínimo/i).fill(TEST_ACCOUNTS.admin.password);
    await page.getByRole("button", { name: /iniciar sesión|login/i }).click();
    await page.waitForTimeout(3000);

    await page.goto("/es/admin");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/auth/login");
  });

  test("pickup point login succeeds and can access dashboard", async ({ page }) => {
    await page.goto("/es/auth/login");
    await page.getByPlaceholder(/ejemplo|email/i).fill(TEST_ACCOUNTS.pickupPointOrigin.email);
    await page
      .getByPlaceholder(/caracteres|password|mínimo/i)
      .fill(TEST_ACCOUNTS.pickupPointOrigin.password);
    await page.getByRole("button", { name: /iniciar sesión|login/i }).click();
    await page.waitForTimeout(3000);

    await page.goto("/es/pickup-point");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/auth/login");
  });
});
