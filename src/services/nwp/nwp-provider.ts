/**
 * NWP Provider interface and model metadata configurations.
 */

import type { Coordinates } from "@/types/common";
import type { NwpModelId, ModelForecast } from "@/types/nwp";

export interface NwpModelConfig {
  id: NwpModelId;
  name: string;
  organization: string;
  resolutionKm: number;
  openMeteoParam: string;
}

export const NWP_MODEL_CONFIGS: Record<NwpModelId, NwpModelConfig> = {
  ecmwf: {
    id: "ecmwf",
    name: "ECMWF IFS",
    organization: "European Centre for Medium-Range Weather Forecasts",
    resolutionKm: 25,
    openMeteoParam: "ecmwf_ifs025",
  },
  gfs: {
    id: "gfs",
    name: "GFS",
    organization: "NOAA / NCEP",
    resolutionKm: 25,
    openMeteoParam: "gfs_seamless",
  },
  icon: {
    id: "icon",
    name: "ICON",
    organization: "Deutscher Wetterdienst (DWD)",
    resolutionKm: 13,
    openMeteoParam: "icon_seamless",
  },
  gem: {
    id: "gem",
    name: "GEM Global",
    organization: "Canadian Meteorological Centre (CMC)",
    resolutionKm: 25,
    openMeteoParam: "gem_seamless",
  },
  meteofrance: {
    id: "meteofrance",
    name: "Météo-France ARPEGE",
    organization: "Météo-France",
    resolutionKm: 25,
    openMeteoParam: "meteofrance_seamless",
  },
};

export const DEFAULT_NWP_MODELS: NwpModelId[] = ["ecmwf", "gfs", "icon"];

export interface NwpProvider {
  readonly name: string;

  /**
   * Fetch multi-model forecast from the underlying weather provider.
   */
  getMultiModelForecast(
    coordinates: Coordinates,
    models?: NwpModelId[],
    timezone?: string
  ): Promise<ModelForecast[]>;
}
