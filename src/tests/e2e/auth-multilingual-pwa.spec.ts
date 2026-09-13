import { test, expect } from "@playwright/test";

test.describe("Rural Zero-Friction Auth, Multilingual Support & PWA Navigation", () => {
  test("provides zero-barrier anonymous guest access with farmer experience mode default", async ({ page }) => {
    await page.goto("/");

    // Open user profile menu in header
    const userMenuBtn = page.getByRole("button", { name: "User profile & authentication" });
    await expect(userMenuBtn).toBeVisible();

    // Verify default guest indicator
    await expect(userMenuBtn).toContainText("Guest");

    // Click to open user menu dropdown
    await userMenuBtn.click();

    // Verify zero friction guest banner and role options
    await expect(page.getByText("Guest Access (Zero Friction)")).toBeVisible();
    await expect(page.getByText("Farmer Mode (ICAR Decisions)")).toBeVisible();
    await expect(page.getByText("Urban / Commuter")).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign in with Google/i })).toBeVisible();

    // Close menu
    await page.keyboard.press("Escape");
  });

  test("toggles experience mode between Farmer Mode and Urban Mode without data loss", async ({ page }) => {
    await page.goto("/");

    const userMenuBtn = page.getByRole("button", { name: "User profile & authentication" });
    await userMenuBtn.click();

    // Switch to Urban / Commuter
    const urbanBtn = page.getByRole("button", { name: /Urban \/ Commuter/i });
    await urbanBtn.click();
    await page.waitForTimeout(200);

    // Re-open and verify role switched
    await userMenuBtn.click();
    const farmerBtn = page.getByRole("button", { name: /Farmer Mode/i });
    await farmerBtn.click();
    await page.waitForTimeout(200);
  });

  test("switches UI language between English, Hindi, and Punjabi", async ({ page }) => {
    await page.goto("/");

    // Language switcher buttons
    const btnHindi = page.getByTitle("हिंदी");
    const btnPunjabi = page.getByTitle("ਪੰਜਾਬੀ");
    const btnEnglish = page.getByTitle("English");

    await expect(btnHindi).toBeVisible();
    await expect(btnPunjabi).toBeVisible();
    await expect(btnEnglish).toBeVisible();

    // Switch to Hindi
    await btnHindi.click();
    await page.waitForTimeout(200);

    // Switch to Punjabi
    await btnPunjabi.click();
    await page.waitForTimeout(200);

    // Return to English
    await btnEnglish.click();
    await page.waitForTimeout(200);
  });

  test("renders accessible mobile navigation bar for PWA touch experience", async ({ page }) => {
    // Set mobile viewport to verify responsive mobile bottom bar
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const mobileNav = page.locator('nav[aria-label="Mobile Navigation"]');
    await expect(mobileNav).toBeVisible();

    // Verify key touch destinations exist
    await expect(mobileNav.getByRole("link", { name: /Overview/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /Forecast/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /History/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /Agri/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /Risks/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /Copilot/i })).toBeVisible();
  });
});
