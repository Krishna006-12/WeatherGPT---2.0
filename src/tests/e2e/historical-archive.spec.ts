import { test, expect } from "@playwright/test";

test.describe("Historical Climate Archive & ERA5 Reanalysis", () => {
  test("loads historical timeline with ERA5 1940-present reanalysis cards", async ({ page }) => {
    await page.goto("/history");

    // Verify main page title and provenance badges
    await expect(
      page.getByRole("heading", { name: /Meteorological Timeline & Climate Archive/i })
    ).toBeVisible();

    await expect(page.getByText("Open-Meteo Grounded")).toBeVisible();
    await expect(page.getByText("ERA5 1940–Present")).toBeVisible();

    // Verify Historical Climate section exists
    await expect(
      page.getByText("Historical Climate Reanalysis & Anomaly Comparison")
    ).toBeVisible();
  });

  test("allows switching multi-year comparison windows (1, 3, 5, 10 years ago)", async ({ page }) => {
    await page.goto("/history");

    // Check time machine buttons
    const btn1Year = page.getByRole("button", { name: /1 Year Ago/i });
    const btn3Years = page.getByRole("button", { name: /3 Years/i });
    const btn5Years = page.getByRole("button", { name: /5 Years/i });
    const btn10Years = page.getByRole("button", { name: /10 Years/i });

    await expect(btn1Year).toBeVisible();
    await expect(btn3Years).toBeVisible();
    await expect(btn5Years).toBeVisible();
    await expect(btn10Years).toBeVisible();

    // Click 3 Years
    await btn3Years.click();
    await page.waitForTimeout(300);

    // Click 5 Years
    await btn5Years.click();
    await page.waitForTimeout(300);

    // Click 10 Years
    await btn10Years.click();
    await page.waitForTimeout(300);

    // Return to 1 Year
    await btn1Year.click();
    await page.waitForTimeout(300);
  });

  test("renders hourly timeline and multi-day progression components", async ({ page }) => {
    await page.goto("/history");

    // Verify hourly forecast component
    const next24 = page.getByRole("heading", { name: "Next 24 Hours" });
    await expect(next24).toBeVisible();

    // Verify sunrise/sunset card
    await expect(page.getByText("Sun & Astronomical Cycle")).toBeVisible();

    // Verify 7-day forecast
    await expect(page.getByRole("heading", { name: "7-Day Meteorological Outlook" })).toBeVisible();
  });
});
