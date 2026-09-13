/**
 * get_voice_briefing tool.
 *
 * Deterministic voice briefing & speech intelligence tool for WeatherGPT Copilot 2.0.
 * Generates spoken-friendly briefings, speech normalization, and phonetic metrics.
 */

import { z } from "zod";
import type { Result } from "@/types/common";
import type { VoiceAssistantReport, VoiceLanguage } from "@/types/voice";
import { coordinatesSchema } from "@/schemas/weather";
import { voiceLanguageSchema } from "@/schemas/voice";
import { VoiceService, globalVoiceService } from "@/services/voice/voice-service";
import type { WeatherService } from "@/services/weather/weather-service";
import type { WeatherIntelligenceTool } from "./tool-interface";

export const getVoiceBriefingInputSchema = z.object({
  coordinates: coordinatesSchema.optional(),
  locationName: z.string().optional(),
  language: voiceLanguageSchema.optional(),
  customText: z.string().optional(),
});

export type GetVoiceBriefingInput = z.input<typeof getVoiceBriefingInputSchema>;

export interface GetVoiceBriefingToolOptions {
  voiceService?: VoiceService;
  weatherService?: WeatherService;
}

export class GetVoiceBriefingTool
  implements WeatherIntelligenceTool<GetVoiceBriefingInput, VoiceAssistantReport>
{
  readonly name = "get_voice_briefing" as const;
  readonly description =
    "Generate spoken-friendly weather briefings with phonetic unit expansion, duration metrics, and natural speech normalization for audio readout.";
  readonly schema = getVoiceBriefingInputSchema;

  private voiceService: VoiceService;
  private weatherService?: WeatherService;

  constructor(options?: GetVoiceBriefingToolOptions) {
    this.voiceService = options?.voiceService || globalVoiceService;
    this.weatherService = options?.weatherService;
  }

  async execute(input: GetVoiceBriefingInput): Promise<Result<VoiceAssistantReport>> {
    const parsed = this.schema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: new Error(`Invalid get_voice_briefing parameters: ${parsed.error.message}`),
      };
    }

    const { coordinates, locationName, language, customText } = parsed.data;

    if (customText) {
      const report = this.voiceService.generateBriefingFromText({
        text: customText,
        locationName: locationName || "Your Location",
        coordinates: coordinates || { latitude: 0, longitude: 0 },
        language: (language as VoiceLanguage) || "en-US",
      });
      return { success: true, data: report };
    }

    if (!coordinates) {
      return {
        success: false,
        error: new Error("Either coordinates or customText must be provided to get_voice_briefing"),
      };
    }

    if (this.weatherService) {
      const weatherRes = await this.weatherService.getWeather(coordinates);
      if (!weatherRes.success) {
        return {
          success: false,
          error: weatherRes.error,
        };
      }

      const report = this.voiceService.generateVoiceBriefing({
        weather: weatherRes.data,
        language: (language as VoiceLanguage) || "en-US",
      });
      return { success: true, data: report };
    }

    // If weather service not injected, generate from coordinates
    const fallbackReport = this.voiceService.generateBriefingFromText({
      text: `Weather briefing for ${locationName || "specified location"}.`,
      locationName: locationName || "Specified Location",
      coordinates,
      language: (language as VoiceLanguage) || "en-US",
    });

    return { success: true, data: fallbackReport };
  }
}
