import { describe, it, expect, beforeEach } from "vitest";
import { EvaluationMetricsService } from "@/services/evaluation/evaluation-metrics-service";

describe("EvaluationMetricsService — Performance, Task Completion & Accuracy Pipeline", () => {
  let service: EvaluationMetricsService;

  beforeEach(() => {
    service = new EvaluationMetricsService({ autoSeed: false });
  });

  describe("1. Query-to-Response Latency Distribution", () => {
    it("accurately calculates p50, p90, and p95 percentiles across recorded sessions", () => {
      // Record 100 queries with known latencies: 10ms, 20ms, ..., 1000ms
      for (let i = 1; i <= 100; i++) {
        service.logQueryLatency({
          endpoint: "/api/weather",
          latencyMs: i * 10,
          persona: "farmer",
          language: "pa",
        });
      }

      const summary = service.getSummary();

      expect(summary.totalQueries).toBe(100);
      expect(summary.latency.p50).toBe(510); // 50th percentile
      expect(summary.latency.p90).toBe(910); // 90th percentile
      expect(summary.latency.p95).toBe(960); // 95th percentile
      expect(summary.latency.min).toBe(10);
      expect(summary.latency.max).toBe(1000);
      expect(summary.latency.avg).toBe(505);
    });

    it("returns zero metrics safely when no latency records exist", () => {
      const summary = service.getSummary();
      expect(summary.totalQueries).toBe(0);
      expect(summary.latency.p50).toBe(0);
      expect(summary.latency.p95).toBe(0);
    });
  });

  describe("2. Task Completion & Reliability Tracking", () => {
    it("evaluates direct answers vs. degraded fallback failovers vs. provider errors", () => {
      // 8 direct answers
      for (let i = 0; i < 8; i++) {
        service.logQueryLatency({
          endpoint: "/api/weather",
          latencyMs: 200,
          taskCompletion: "direct_answer",
          persona: "general_public",
        });
      }

      // 1 degraded fallback
      service.logQueryLatency({
        endpoint: "/api/weather",
        latencyMs: 450,
        taskCompletion: "degraded_fallback",
        persona: "disaster_manager",
      });

      // 1 provider error
      service.logQueryLatency({
        endpoint: "/api/weather",
        latencyMs: 800,
        taskCompletion: "provider_error",
        statusCode: 502,
        persona: "farmer",
      });

      const summary = service.getSummary();

      expect(summary.taskCompletion.directAnswer).toBe(8);
      expect(summary.taskCompletion.degradedFallback).toBe(1);
      expect(summary.taskCompletion.providerError).toBe(1);
      expect(summary.taskCompletion.directAnswerRate).toBe(0.8);
      expect(summary.taskCompletion.degradedFallbackRate).toBe(0.1);
      expect(summary.taskCompletion.errorRate).toBe(0.1);
    });
  });

  describe("3. Persona and Multilingual Language Distribution", () => {
    it("tracks usage breakdown across general public, farmers, and disaster managers", () => {
      service.logQueryLatency({ endpoint: "/api/weather", latencyMs: 210, persona: "farmer", language: "pa" });
      service.logQueryLatency({ endpoint: "/api/weather", latencyMs: 220, persona: "farmer", language: "hi" });
      service.logQueryLatency({ endpoint: "/api/weather", latencyMs: 190, persona: "disaster_manager", language: "en" });
      service.logQueryLatency({ endpoint: "/api/weather", latencyMs: 180, persona: "general_public", language: "en" });

      const summary = service.getSummary();

      expect(summary.personaDistribution.farmer).toBe(2);
      expect(summary.personaDistribution.disaster_manager).toBe(1);
      expect(summary.personaDistribution.general_public).toBe(1);

      expect(summary.languageDistribution.pa).toBe(1);
      expect(summary.languageDistribution.hi).toBe(1);
      expect(summary.languageDistribution.en).toBe(2);
    });
  });

  describe("4. Forecast vs. Later-Observed Accuracy Ground-Truth Tracking", () => {
    it("pairs forecast predictions with subsequent ground-truth station observations and calculates MAE", () => {
      // Forecast 1: 30°C predicted, 31.5°C observed (Error: 1.5°C)
      const rec1 = service.logForecastShown({
        locationName: "Ludhiana Farm Station",
        forecastTargetTime: "2026-10-01T12:00:00Z",
        leadTimeHours: 24,
        forecasted: { temperature: 30.0, precipitationSum: 0.0, windSpeed: 12.0 },
      });

      service.recordObservation(rec1.recordId, {
        temperature: 31.5,
        precipitationSum: 0.0,
        windSpeed: 14.0,
      });

      // Forecast 2: 24°C predicted, 24.5°C observed (Error: 0.5°C)
      const rec2 = service.logForecastShown({
        locationName: "Puri Coastal Observatory",
        forecastTargetTime: "2026-10-01T12:00:00Z",
        leadTimeHours: 24,
        forecasted: { temperature: 24.0, precipitationSum: 10.0, windSpeed: 30.0 },
      });

      service.recordObservation(rec2.recordId, {
        temperature: 24.5,
        precipitationSum: 12.0,
        windSpeed: 32.0,
      });

      const summary = service.getSummary();

      expect(summary.accuracy.totalEvaluated).toBe(2);
      // Mean Absolute Error: (1.5 + 0.5) / 2 = 1.0°C
      expect(summary.accuracy.temperatureMae).toBe(1.0);
      // Wind MAE: (2.0 + 2.0) / 2 = 2.0 km/h
      expect(summary.accuracy.windMae).toBe(2.0);
    });
  });

  describe("5. CSV and JSON Deliverable Exports", () => {
    it("exports query latency dataset conforming to RFC-4180 CSV standard", () => {
      service.logQueryLatency({
        endpoint: "/api/weather",
        latencyMs: 195,
        taskCompletion: "direct_answer",
        persona: "farmer",
        language: "pa",
        cacheHit: true,
      });

      const csv = service.exportLatencyCsv();
      const lines = csv.split("\n");

      expect(lines.length).toBe(2);
      expect(lines[0]).toBe(
        "Trace ID,Endpoint,Latency (ms),Status Code,Task Completion,Persona,Language,Cache Hit,Timestamp"
      );
      expect(lines[1]).toContain("/api/weather,195,200,direct_answer,farmer,pa,true");
    });

    it("exports forecast accuracy dataset conforming to CSV standards", () => {
      const rec = service.logForecastShown({
        locationName: "Bathinda Agronomy Plot",
        forecastTargetTime: "2026-10-02T06:00:00Z",
        leadTimeHours: 48,
        forecasted: { temperature: 33.0, precipitationSum: 5.0 },
      });

      service.recordObservation(rec.recordId, {
        temperature: 34.2,
        precipitationSum: 4.5,
      });

      const csv = service.exportAccuracyCsv();
      const lines = csv.split("\n");

      expect(lines.length).toBe(2);
      expect(lines[0]).toContain("Record ID,Location Name,Lead Time (Hours),Forecast Temp (C),Observed Temp (C)");
      expect(lines[1]).toContain('"Bathinda Agronomy Plot",48,33,34.2,1.2,5,4.5');
    });

    it("exports complete structured JSON payload", () => {
      service.logQueryLatency({ endpoint: "/api/weather", latencyMs: 250 });
      const exported = service.exportJson();

      expect(exported.summary).toBeDefined();
      expect(Array.isArray(exported.latencyRecords)).toBe(true);
      expect(Array.isArray(exported.accuracyRecords)).toBe(true);
      expect(exported.latencyRecords.length).toBe(1);
    });
  });

  describe("6. Real Baseline Pilot Session Seeding", () => {
    it("seeds realistic pilot session data when autoSeed is enabled", () => {
      const autoSeededService = new EvaluationMetricsService({ autoSeed: true });
      const summary = autoSeededService.getSummary();

      expect(summary.totalQueries).toBeGreaterThan(15);
      expect(summary.totalSessions).toBeGreaterThan(0);
      expect(summary.latency.p50).toBeGreaterThan(0);
      expect(summary.personaDistribution.farmer).toBeGreaterThan(0);
      expect(summary.personaDistribution.disaster_manager).toBeGreaterThan(0);
      expect(summary.accuracy.totalEvaluated).toBeGreaterThan(0);
      expect(summary.accuracy.temperatureMae).toBeGreaterThan(0);
    });
  });
});
