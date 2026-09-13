import { describe, it, expect } from "vitest";
import { HistoricalWeatherProvider } from "@/services/weather/historical-weather-provider";

describe("HistoricalWeatherProvider", () => {
  it("fetches and synthesizes historical archive report with climate anomaly", async () => {
    const provider = new HistoricalWeatherProvider();
    const result = await provider.fetchHistoricalArchive(
      { latitude: 26.46, longitude: 80.34 },
      "2023-09-01",
      "2023-09-07",
      "Asia/Kolkata"
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.records.length).toBeGreaterThanOrEqual(7);
      expect(result.data.summary.averageMaxTemp).toBeGreaterThan(0);
      expect(result.data.climatologicalAnomaly.baselinePeriod).toContain("1991–2020");
      expect(result.data.climatologicalAnomaly.characterization).toBeDefined();
    }
  });
});
