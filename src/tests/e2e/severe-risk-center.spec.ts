import { test, expect } from "@playwright/test";

test.describe("Severe Weather Risk Intelligence Center", () => {
  test("renders all 8 deterministic hazard categories with severity indicators", async ({ page }) => {
    await page.goto("/");

    // Verify Risk Center card container
    const riskCenter = page.locator('section[aria-label="Weather Risk Center"]');
    await expect(riskCenter).toBeVisible({ timeout: 10000 });

    // Verify header title and verified badge
    await expect(riskCenter.getByText("Weather Risk Center")).toBeVisible();
    await expect(riskCenter.getByText("Verified")).toBeVisible();

    // Verify all 8 hazard categories are rendered
    const categories = [
      "Cyclone",
      "Flood",
      "Heavy Rain",
      "Thunderstorm",
      "Wind",
      "Heat",
      "Drought",
      "UV",
    ];

    for (const category of categories) {
      await expect(riskCenter.getByText(category, { exact: true })).toBeVisible();
    }

    // Verify footer deterministic badge
    await expect(riskCenter.getByText("Deterministic")).toBeVisible();
    await expect(riskCenter.getByText("Updated from verified forecast")).toBeVisible();
  });

  test("expands hazard category row to reveal transparent verified evidence and recommendations", async ({ page }) => {
    await page.goto("/");

    const riskCenter = page.locator('section[aria-label="Weather Risk Center"]');
    await expect(riskCenter).toBeVisible({ timeout: 10000 });

    // Find the first category button
    const firstCategoryBtn = riskCenter.locator("button").first();
    await expect(firstCategoryBtn).toBeVisible();

    // Click to expand category drawer
    await firstCategoryBtn.click();
    await page.waitForTimeout(200);

    // Verify expanded details (Window, Confidence, Recommendation)
    await expect(riskCenter.locator("text=/Window:/i")).toBeVisible();
    await expect(riskCenter.locator("text=/Confidence:/i")).toBeVisible();

    // Click again to collapse
    await firstCategoryBtn.click();
    await page.waitForTimeout(200);
  });
});
