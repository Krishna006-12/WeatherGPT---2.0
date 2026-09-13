/**
 * NWP Service — Central service orchestrator for multi-model NWP intelligence.
 *
 * Coordinates multi-model forecast ingestion from NwpProvider,
 * evaluates consensus via ConsensusEngine, and caches results
 * to minimize redundant upstream requests.
 */

import type { Coordinates, Result } from "@/types/common";
import type { ModelConsensusReport, NwpModelId } from "@/types/nwp";
import type { NwpProvider } from "./nwp-provider";
import { globalOpenMeteoNwpProvider } from "./open-meteo-nwp-provider";
import { ConsensusEngine, globalConsensusEngine } from "./consensus-engine";
import { MemoryCache } from "@/lib/cache";
import { AppError } from "@/lib/errors";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface NwpServiceConfig {
  provider?: NwpProvider;
  consensusEngine?: ConsensusEngine;
  cacheTtlMs?: number;
}

export class NwpService {
  private provider: NwpProvider;
  private engine: ConsensusEngine;
  private cache: MemoryCache<ModelConsensusReport>;

  constructor(config: NwpServiceConfig = {}) {
    this.provider = config.provider || globalOpenMeteoNwpProvider;
    this.engine = config.consensusEngine || globalConsensusEngine;
    this.cache = new MemoryCache<ModelConsensusReport>({
      defaultTtlMs: config.cacheTtlMs || DEFAULT_CACHE_TTL_MS,
      maxEntries: 100,
    });
  }

  /**
   * Evaluate multi-model consensus report for given coordinates and parameters.
   */
  async getConsensusReport(
    coordinates: Coordinates,
    options: {
      targetDate?: string;
      models?: NwpModelId[];
      timezone?: string;
      locationName?: string;
    } = {}
  ): Promise<Result<ModelConsensusReport>> {
    // Validate coordinates
    if (
      coordinates.latitude < -90 ||
      coordinates.latitude > 90 ||
      coordinates.longitude < -180 ||
      coordinates.longitude > 180
    ) {
      return {
        success: false,
        error: new AppError(
          "INVALID_LOCATION",
          `Coordinates out of range: lat (${coordinates.latitude}), lon (${coordinates.longitude})`,
          400
        ),
      };
    }

    const tz = options.timezone || "auto";
    const modelsKey = (options.models || []).sort().join(",") || "default";
    const targetDateKey = options.targetDate || "all";
    const cacheKey = `${coordinates.latitude.toFixed(2)}_${coordinates.longitude.toFixed(2)}_${tz}_${modelsKey}_${targetDateKey}`;

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    try {
      const forecasts = await this.provider.getMultiModelForecast(
        coordinates,
        options.models,
        options.timezone
      );

      const location = {
        name: options.locationName || `${coordinates.latitude.toFixed(2)}, ${coordinates.longitude.toFixed(2)}`,
        region: "",
        country: "",
        coordinates,
        timezone: options.timezone || "UTC",
      };

      const report = this.engine.evaluate({
        location,
        forecasts,
        targetDate: options.targetDate,
        provenance: [
          {
            provider: this.provider.name,
            retrievedAt: new Date().toISOString(),
            dataType: "forecast",
            timezone: options.timezone,
          },
        ],
      });

      this.cache.set(cacheKey, report);
      return { success: true, data: report };
    } catch (err) {
      if (err instanceof AppError) {
        return { success: false, error: err };
      }
      return {
        success: false,
        error: new AppError(
          "WEATHER_PROVIDER_UNAVAILABLE",
          err instanceof Error ? err.message : "Failed to generate NWP model consensus",
          502
        ),
      };
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const globalNwpService = new NwpService();
