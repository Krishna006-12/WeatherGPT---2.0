/**
 * Internal Weather Intelligence Tool Interface.
 *
 * Defines the contract for deterministic tools called by the AI Orchestrator.
 * Each tool validates its input, calls authoritative services, and returns normalized application data.
 */

import { z } from "zod";
import type { Result } from "@/types/common";

export type WeatherToolName =
  | "search_location"
  | "get_weather"
  | "get_forecast"
  | "get_live_events"
  | "get_event_impact"
  | "get_weather_risk";

export interface WeatherIntelligenceTool<TInput, TOutput> {
  readonly name: WeatherToolName;
  readonly description: string;
  readonly schema: z.ZodType<TInput>;
  execute(input: TInput): Promise<Result<TOutput>>;
}
