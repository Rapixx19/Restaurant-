import { test, expect } from "@playwright/test";

test.describe("VECTERAI E2E Tests", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/");
    // Update this selector once you have actual content
    await expect(page).toHaveTitle(/.*/);
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    // Add mobile-specific assertions
  });
});

// RED ZONE: Auth E2E tests (example structure)
test.describe("Authentication Flow", () => {
  test.skip("should redirect unauthenticated users to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login/);
  });

  test.skip("should allow login with valid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });
});
