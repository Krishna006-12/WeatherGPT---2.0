/**
 * Weather Tool Registry.
 *
 * Central registry managing internal weather intelligence tools:
 * - search_location
 * - get_weather
 * - get_forecast
 * - get_live_events
 * - get_event_impact
 * - get_weather_risk
 */

import type { LocationService } from "@/services/location/location-service";
import type { WeatherService } from "@/services/weather/weather-service";
import type { EventRepository } from "@/services/storage/repository-interfaces";
import type { ImpactEngine } from "@/services/impact/impact-engine";

import { SearchLocationTool } from "./search-location-tool";
import { GetWeatherTool } from "./get-weather-tool";
import { GetForecastTool } from "./get-forecast-tool";
import { GetLiveEventsTool } from "./get-live-events-tool";
import { GetEventImpactTool } from "./get-event-impact-tool";
import { GetWeatherRiskTool } from "./get-weather-risk-tool";
import { GetRiskTool } from "./get-risk-tool";
import { GetAgricultureRiskTool } from "./get-agriculture-risk-tool";
import { GetModelConsensusTool } from "./get-model-consensus-tool";
import { GetActivitySuitabilityTool } from "./get-activity-suitability-tool";
import { GetVoiceBriefingTool } from "./get-voice-briefing-tool";
import type { AgricultureService } from "@/services/agriculture/agriculture-service";
import type { NwpService } from "@/services/nwp/nwp-service";
import type { ActivityService } from "@/services/activity/activity-service";
import type { VoiceService } from "@/services/voice/voice-service";

export interface WeatherToolRegistryServices {
  locationService: LocationService;
  weatherService: WeatherService;
  eventRepository: EventRepository;
  impactEngine: ImpactEngine;
  agricultureService?: AgricultureService;
  nwpService?: NwpService;
  activityService?: ActivityService;
  voiceService?: VoiceService;
}

export class WeatherToolRegistry {
  readonly searchLocationTool: SearchLocationTool;
  readonly getWeatherTool: GetWeatherTool;
  readonly getForecastTool: GetForecastTool;
  readonly getLiveEventsTool: GetLiveEventsTool;
  readonly getEventImpactTool: GetEventImpactTool;
  readonly getWeatherRiskTool: GetWeatherRiskTool;
  readonly getRiskTool: GetRiskTool;
  readonly getAgricultureRiskTool: GetAgricultureRiskTool;
  readonly getModelConsensusTool: GetModelConsensusTool;
  readonly getActivitySuitabilityTool: GetActivitySuitabilityTool;
  readonly getVoiceBriefingTool: GetVoiceBriefingTool;

  constructor(services: WeatherToolRegistryServices) {
    this.searchLocationTool = new SearchLocationTool(services.locationService);
    this.getWeatherTool = new GetWeatherTool(services.weatherService);
    this.getForecastTool = new GetForecastTool(services.weatherService);
    this.getLiveEventsTool = new GetLiveEventsTool(services.eventRepository);
    this.getEventImpactTool = new GetEventImpactTool(services.impactEngine);
    this.getWeatherRiskTool = new GetWeatherRiskTool();
    this.getRiskTool = new GetRiskTool({ eventRepository: services.eventRepository });
    this.getAgricultureRiskTool = new GetAgricultureRiskTool({
      locationService: services.locationService,
      weatherService: services.weatherService,
    });
    this.getModelConsensusTool = new GetModelConsensusTool({
      nwpService: services.nwpService,
    });
    this.getActivitySuitabilityTool = new GetActivitySuitabilityTool({
      activityService: services.activityService,
    });
    this.getVoiceBriefingTool = new GetVoiceBriefingTool({
      voiceService: services.voiceService,
      weatherService: services.weatherService,
    });
  }
}
