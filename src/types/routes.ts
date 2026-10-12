
export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type RoutePlanRequest = {
  origin: Coordinates;
  destination: Coordinates;
  departure_time: string;
  forecast_offset_hours: number;
  checkpoint_interval_miles: 10 | 25 | 50;
  load_weight_lb: number;
};

export type CheckpointWeather = {
  checkpoint_id: string;
  forecast_time: string;
  eta: string;
  wind_mph: number;
  precipitation_in_hr: number;
  snowfall_in_hr: number;
};

export type CheckpointRisk = {
  checkpoint_id: string;
  wind_risk: "low" | "moderate" | "high" | "severe" | "no_travel";
  rain_risk: "low" | "moderate" | "high" | "severe" | "no_travel";
  snow_risk: "low" | "moderate" | "high" | "severe" | "no_travel";
  overall_risk: "low" | "moderate" | "high" | "severe" | "no_travel";
  load_weight_lb: number;
};

export type PlannedCheckpoint = {
  checkpoint_id: string;
  latitude: number;
  longitude: number;
  distance_from_start_miles: number;
  segment_miles: number;
  eta: string;
  weather: CheckpointWeather;
  risk: CheckpointRisk;
};

export type RouteRiskSummary = {
  route_id: string;
  has_no_travel: boolean;
  severe_miles: number;
  high_miles: number;
  average_risk: number;
  duration_minutes: number;
  recommended: boolean;
  rank: number;
};

export type PlannedRoute = {
  route_id: string;
  distance_miles: number;
  duration_minutes: number;
  geometry: [number, number][];
  checkpoints: PlannedCheckpoint[];
  risk_summary: RouteRiskSummary;
};

export type RoutePlanResponse = {
  departure_time: string;
  forecast_offset_hours: number;
  checkpoint_interval_miles: number;
  load_weight_lb: number;
  routes: PlannedRoute[];
  count: number;
  recommended_route_id: string | null;
  warning: string | null;
};