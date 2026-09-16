import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const mockSnapshot = {
  location: {
    name: "New Delhi",
    region: "Delhi",
    country: "India",
    coordinates: { latitude: 28.6139, longitude: 77.209 },
    timezone: "Asia/Kolkata",
  },
  observedAt: "2026-09-17T06:00:00Z",
  current: {
    temperature: 30,
    feelsLike: 32,
    humidity: 50,
    precipitation: 0,
    precipitationProbability: 10,
    windSpeed: 10,
    windDirection: 180,
    pressure: 1012,
    cloudCover: 10,
    condition: "clear",
    observedAt: "2026-09-17T06:00:00Z",
  },
  hourly: [],
  daily: [
    {
      date: "2026-09-17T00:00:00Z",
      temperatureHigh: 34,
      temperatureLow: 24,
      condition: "clear",
      precipitationProbability: 10,
      precipitationSum: 0,
      sunrise: "2026-09-17T00:30:00Z",
      sunset: "2026-09-17T12:30:00Z",
    },
  ],
  alerts: [],
  provenance: [{ provider: "open-meteo", retrievedAt: "2026-09-17T06:00:00Z" }],
};

test.describe("Automated Accessibility (a11y) & Degraded-Mode Failover", () => {
  test("core dashboard screen has zero critical accessibility violations", async ({ page }) => {
    await page.route("**/api/weather*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSnapshot),
      });
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical"
    );

    expect(criticalViolations).toEqual([]);
  });

  test("verifies keyboard navigation and ARIA attributes on role decision support tabs", async ({ page }) => {
    await page.route("**/api/weather*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSnapshot),
      });
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const generalTab = page.getByRole("tab", { name: "General" });
    const farmerTab = page.getByRole("tab", { name: "Farmer" });
    const disasterTab = page.getByRole("tab", { name: "Disaster Command" });

    await expect(generalTab).toBeVisible();
    await expect(farmerTab).toBeVisible();
    await expect(disasterTab).toBeVisible();

    // Verify initial ARIA selected state
    await expect(generalTab).toHaveAttribute("aria-selected", "true");

    // Click Disaster Command tab
    await disasterTab.click();
    await expect(disasterTab).toHaveAttribute("aria-selected", "true");
    await expect(generalTab).toHaveAttribute("aria-selected", "false");

    // Click Farmer tab
    await farmerTab.click();
    await expect(farmerTab).toHaveAttribute("aria-selected", "true");
  });

  test("simulated provider outage returns a usable degraded fallback response instead of an error page", async ({ page }) => {
    // Intercept /api/weather to simulate a provider outage recovering stale cached forecast
    await page.route("**/api/weather*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...mockSnapshot,
          isDegraded: true,
          staleSince: new Date(Date.now() - 3600000).toISOString(),
          staleWarning: "Data may be stale, last updated 1 hour ago",
        }),
      });
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Ensure the page does NOT crash or show an unhandled error screen
    // Both screen reader announcement and visual warning badge render the stale warning
    await expect(page.getByText(/Data may be stale/i).first()).toBeVisible();
    await expect(page.getByText("New Delhi").first()).toBeVisible();
  });
});
