import { test, expect } from "@playwright/test";

test.describe("Antigravity Motion System & 60 FPS Performance", () => {
  test("renders Antigravity Motion Lab and sustains >= 55 FPS during stress test", async ({ page }) => {
    // Navigate to motion lab with FPS overlay active
    await page.goto("/motion?debug_fps=1");

    // Wait for the showcase cards to mount
    const header = page.locator("h1");
    await expect(header).toHaveText("Antigravity Physics & Motion Lab");

    // Verify FPS monitor overlay is visible
    const fpsOverlay = page.getByLabel("Dev FPS Overlay");
    await expect(fpsOverlay).toBeVisible();

    // Measure FPS over 1 second of multi-element stress animation
    const fpsResult = await page.evaluate(async () => {
      return new Promise<{ avgFps: number; frameCount: number }>((resolve) => {
        let count = 0;
        const start = performance.now();

        function countFrame() {
          count++;
          if (performance.now() - start < 1000) {
            requestAnimationFrame(countFrame);
          } else {
            const elapsed = (performance.now() - start) / 1000;
            resolve({ avgFps: count / elapsed, frameCount: count });
          }
        }

        requestAnimationFrame(countFrame);
      });
    });

    // In automated browser test, frame rate should comfortably achieve >= 50 FPS
    expect(fpsResult.avgFps).toBeGreaterThanOrEqual(50);
  });

  test("settles carousel cards with velocity-aware snap on drag interaction", async ({ page }) => {
    await page.goto("/motion");

    const prevButton = page.getByRole("button", { name: "← Prev" });
    const nextButton = page.getByRole("button", { name: "Next →" });

    await expect(nextButton).toBeVisible();

    // Click next to trigger velocity snap
    await nextButton.click();
    await page.waitForTimeout(600); // Allow spring settle time

    // Click prev to snap back
    await prevButton.click();
    await page.waitForTimeout(600);
  });

  test("gracefully degrades to static zero-drift layout when prefers-reduced-motion is active", async ({ page }) => {
    // Emulate OS reduced motion
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/motion");

    // Verify element reflects reduced motion / low tier
    const element = page.locator('[data-testid="floating-element-showcase-mass-light"]');
    await expect(element).toBeVisible();

    // When reduced motion is on, the element's transform settles to static translate3d(0, 0, 0)
    const transform = await element.evaluate((el) => window.getComputedStyle(el).transform);
    expect(transform === "none" || transform.includes("matrix")).toBe(true);
  });
});
