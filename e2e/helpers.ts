import { type Page, expect } from "@playwright/test";

// ─── Test accounts (created by `npm run db:seed`) ──────────────────────────
// Pickup point owners are created from CSV Email column with password TestShop123!
export const TEST_ACCOUNTS = {
  admin: {
    email: "admin@laveina-test.com",
    password: "TestAdmin123!",
  },
  pickupPointOrigin: {
    email: "central@example.com",
    password: "TestShop123!",
  },
  pickupPointDest: {
    email: "sol@example.com",
    password: "TestShop123!",
  },
  customer: {
    email: "customer@laveina-test.com",
    password: "TestCustomer123!",
  },
} as const;

// ─── Test data ──────────────────────────────────────────────────────────────
// Pickup points are seeded from data/pickup-points.csv — IDs are auto-generated.
// Use names for lookup instead of hardcoded UUIDs.
export const TEST_PICKUP_POINTS = {
  origin: {
    name: "Librería Central",
    postcode: "08036",
  },
  destination: {
    name: "Papelería Sol",
    postcode: "08029",
  },
} as const;

/**
 * Login to the app using Supabase email/password auth.
 * Navigates to the login page, fills in credentials, and waits for redirect.
 */
export async function login(
  page: Page,
  credentials: { email: string; password: string },
  expectedRedirect?: string
) {
  await page.goto("/es/auth/login");
  await page.waitForLoadState("networkidle");

  // Use placeholders — labels may not be programmatically associated with inputs
  const emailInput = page.getByPlaceholder(/ejemplo|email/i);
  await emailInput.waitFor({ state: "visible", timeout: 10_000 });
  await emailInput.fill(credentials.email);
  await page.getByPlaceholder(/caracteres|password|mínimo/i).fill(credentials.password);
  await page.getByRole("button", { name: /iniciar sesión|login/i }).click();

  // Wait for auth to complete — user name appears in header when cookies are set
  await page.waitForTimeout(2000);

  // Wait for the page to reflect logged-in state (URL changes or user menu appears)
  try {
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 10_000 });
  } catch {
    // If URL didn't change, auth might have completed but page didn't redirect.
    // That's OK — we'll navigate to the dashboard manually.
  }

  if (expectedRedirect) {
    // Give cookies time to persist, then navigate
    await page.goto(`/es${expectedRedirect}`);
    await page.waitForLoadState("networkidle");

    // If middleware redirected us back to login, auth cookies didn't stick
    if (page.url().includes("/auth/login")) {
      // Retry once — sometimes cookies take an extra moment
      await page.waitForTimeout(2000);
      await page.goto(`/es${expectedRedirect}`);
      await page.waitForLoadState("networkidle");
    }
  }
}

/**
 * Assert the page has loaded without errors.
 */
export async function expectNoErrors(page: Page) {
  // No error toasts visible
  const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
  await expect(errorToast).toHaveCount(0);
}

/**
 * Wait for navigation to complete after an action.
 */
export async function waitForNavigation(page: Page) {
  await page.waitForLoadState("networkidle");
}
