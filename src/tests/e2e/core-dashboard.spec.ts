import { test, expect } from "@playwright/test";

test.describe("Core Weather Dashboard & Interactive Charts", () => {
  test("loads the main dashboard with header telemetry and search", async ({ page }) => {
    await page.goto("/");

    // Verify brand stamp
    await expect(page.getByText("WeatherGPT")).toBeVisible();
    await expect(page.getByText("2.0")).toBeVisible();

    // Verify search input is present
    const searchInput = page.getByPlaceholder("Search city (e.g. Kanpur, London, Tokyo)...");
    await expect(searchInput).toBeVisible();

    // Focus search input to reveal recent searches dropdown
    await searchInput.focus();
    const recentsHeader = page.getByText("Recent Searches");
    await expect(recentsHeader).toBeVisible();
  });

  test("switches between Temperature, Precipitation, and Ensemble Fan in WeatherCharts", async ({ page }) => {
    await page.goto("/");

    // Find tab buttons
    const tempTab = page.getByRole("button", { name: "Temperature" });
    const precipTab = page.getByRole("button", { name: "Precipitation" });
    const ensembleTab = page.getByRole("button", { name: "Ensemble Fan" });

    await expect(tempTab).toBeVisible();
    await expect(precipTab).toBeVisible();
    await expect(ensembleTab).toBeVisible();

    // Click Precipitation tab
    await precipTab.click();
    await page.waitForTimeout(200);

    // Click Ensemble Fan tab
    await ensembleTab.click();
    await page.waitForTimeout(200);

    // Verify multi-model labels appear
    await expect(page.getByText("ECMWF IFS (0.1°)")).toBeVisible();
    await expect(page.getByText("NOAA GFS (0.25°)")).toBeVisible();
    await expect(page.getByText("DWD ICON (13km)")).toBeVisible();

    // Return to Temperature tab
    await tempTab.click();
    await page.waitForTimeout(200);
  });

  test("displays hourly timeline forecast with current hour tag", async ({ page }) => {
    await page.goto("/");

    const timelineHeading = page.getByRole("heading", { name: "Next 24 Hours" });
    await expect(timelineHeading).toBeVisible();

    // Verify hourly items exist
    const nowTag = page.getByText("Now");
    await expect(nowTag.first()).toBeVisible();
  });
});
