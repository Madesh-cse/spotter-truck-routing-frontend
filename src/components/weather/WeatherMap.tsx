"use client";

import { useEffect, useState } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import {
  Pause,
  Play,
  Radio,
  CloudRain,
  Wind,
  Thermometer,
  Cloud,
  Layers3,
  MapPin,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

import type { PlannedRoute } from "@/types/routes";

export type WeatherLayer =
  | "radar"
  | "precipitation"
  | "wind"
  | "temperature"
  | "clouds"
  | "none";

export type RiskMetric = "overall" | "wind" | "rain" | "snow";

type Checkpoint = PlannedRoute["checkpoints"][number];

type WeatherMapProps = {
  routes: PlannedRoute[];
  selectedRouteId: string | null;
  selectedCheckpointId: string | null;
  focus: [number, number] | null;
  layer: WeatherLayer;
  metric: RiskMetric;
  opacity: number;
  onSelectCheckpoint: (checkpointId: string) => void;
  onLayerChange: (layer: WeatherLayer) => void;
};

type StationWeather = {
  checkpointId: string;
  latitude: number;
  longitude: number;
  temperature: number | null;
  windSpeed: number | null;
  precipitation: number | null;
  weatherCode: number | null;
  observedAt: string | null;
};

type RadarFrame = {
  time: number;
  path: string;
};

export const riskColors: Record<string, string> = {
  low: "#16a34a",
  moderate: "#eab308",
  high: "#f97316",
  severe: "#dc2626",
  no_travel: "#7f1d1d",
};

const OWM_CODES: Partial<Record<WeatherLayer, string>> = {
  precipitation: "precipitation_new",
  wind: "wind_new",
  temperature: "temp_new",
  clouds: "clouds_new",
};

const OWM_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

const LAYER_OPTIONS: {
  id: WeatherLayer;
  label: string;
  icon: typeof CloudRain;
}[] = [
  { id: "radar", label: "Radar", icon: Radio },
  { id: "precipitation", label: "Rain", icon: CloudRain },
  { id: "wind", label: "Wind", icon: Wind },
  { id: "temperature", label: "Temperature", icon: Thermometer },
  { id: "clouds", label: "Clouds", icon: Cloud },
  { id: "none", label: "Base map", icon: Layers3 },
];

function riskFor(checkpoint: Checkpoint, metric: RiskMetric) {
  const risk = checkpoint.risk as unknown as Record<string, string>;

  return (
    risk[metric === "overall" ? "overall_risk" : `${metric}_risk`] ?? "low"
  ).toLowerCase();
}

function intensity(checkpoint: Checkpoint, metric: RiskMetric) {
  const weather = checkpoint.weather;

  const value =
    metric === "wind"
      ? weather.wind_mph / 4
      : metric === "rain"
        ? weather.precipitation_in_hr * 40
        : metric === "snow"
          ? weather.snowfall_in_hr * 40
          : 0;

  return Math.min(10, Math.max(0, value));
}

function formatRisk(risk: string) {
  return risk.replaceAll("_", " ");
}

function formatFrameTime(unixSeconds: number) {
  return (
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(new Date(unixSeconds * 1000)) + " UTC"
  );
}

/* RainViewer radar frames */
function useRadar(enabled: boolean) {
  const [host, setHost] = useState("");
  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || frames.length > 0) return;

    let cancelled = false;

    async function loadRadar() {
      setLoading(true);
      setFailed(false);

      try {
        const response = await fetch(
          "https://api.rainviewer.com/public/weather-maps.json",
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("Radar request failed");
        }

        const data = await response.json();

        if (cancelled) return;

        const past: RadarFrame[] = data.radar?.past ?? [];
        const nowcast: RadarFrame[] = data.radar?.nowcast ?? [];
        const allFrames = [...past, ...nowcast];

        if (!data.host || allFrames.length === 0) {
          throw new Error("No radar frames returned");
        }

        setHost(data.host);
        setFrames(allFrames);
        setIndex(Math.max(0, past.length - 1));
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRadar();

    return () => {
      cancelled = true;
    };
  }, [enabled, frames.length]);

  useEffect(() => {
    if (!enabled) {
      setPlaying(false);
      return;
    }

    if (!playing || frames.length < 2) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % frames.length);
    }, 700);

    return () => window.clearInterval(timer);
  }, [playing, enabled, frames.length]);

  return {
    host,
    frames,
    index,
    setIndex,
    playing,
    setPlaying,
    loading,
    failed,
  };
}

/* Fetch coordinate-based current weather for selected-route checkpoints.
   These readings are not guaranteed to be physical weather-station reports. */
function useStationWeather(route: PlannedRoute | undefined) {
  const [stations, setStations] = useState<StationWeather[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!route || route.checkpoints.length === 0) {
      setStations([]);
      return;
    }

    let cancelled = false;

    async function loadWeather() {
      setLoading(true);
      setFailed(false);

      try {
        // Limit requests to avoid excessive API calls on long routes.
        const checkpoints = route!.checkpoints.slice(0, 12);

        const results = await Promise.allSettled(
          checkpoints.map(async (checkpoint): Promise<StationWeather> => {
            const params = new URLSearchParams({
              latitude: String(checkpoint.latitude),
              longitude: String(checkpoint.longitude),
              current:
                "temperature_2m,precipitation,wind_speed_10m,weather_code",
              timezone: "UTC",
            });

            const response = await fetch(
              `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
              { cache: "no-store" },
            );

            if (!response.ok) {
              throw new Error("Weather request failed");
            }

            const data = await response.json();
            const current = data.current;

            return {
              checkpointId: checkpoint.checkpoint_id,
              latitude: checkpoint.latitude,
              longitude: checkpoint.longitude,
              temperature: current?.temperature_2m ?? null,
              windSpeed: current?.wind_speed_10m ?? null,
              precipitation: current?.precipitation ?? null,
              weatherCode: current?.weather_code ?? null,
              observedAt: current?.time ?? null,
            };
          }),
        );

        if (cancelled) return;

        const successful = results.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        );

        setStations(successful);
        setFailed(successful.length === 0);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadWeather();

    return () => {
      cancelled = true;
    };
  }, [route, refreshKey]);

  return {
    stations,
    loading,
    failed,
    refresh: () => setRefreshKey((value) => value + 1),
  };
}

/* Leaflet mount guard */
function useMapReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    return () => setReady(false);
  }, []);

  return ready;
}

function FitRoutes({ routes }: { routes: PlannedRoute[] }) {
  const map = useMap();

  useEffect(() => {
    const coordinates = routes.flatMap((route) =>
      route.geometry.map(
        ([longitude, latitude]) => [latitude, longitude] as [number, number],
      ),
    );

    if (coordinates.length === 0) return;

    const fit = () => {
      map.invalidateSize();

      if (coordinates.length === 1) {
        map.setView(coordinates[0], 10);
      } else {
        map.fitBounds(coordinates, {
          padding: [45, 45],
          maxZoom: 11,
        });
      }
    };

    const frame = window.requestAnimationFrame(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(map.getContainer());

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [routes, map]);

  return null;
}

function FlyToFocus({ focus }: { focus: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (focus) {
      map.flyTo(focus, Math.max(map.getZoom(), 10), {
        duration: 0.6,
      });
    }
  }, [focus, map]);

  return null;
}

function weatherDescription(code: number | null) {
  if (code === null) return "Condition unavailable";
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Variable conditions";
}

function isStormCode(code: number | null) {
  return code !== null && [95, 96, 99].includes(code);
}

export default function WeatherMap({
  routes,
  selectedRouteId,
  selectedCheckpointId,
  focus,
  layer,
  metric,
  opacity,
  onSelectCheckpoint,
  onLayerChange,
}: WeatherMapProps) {
  const ready = useMapReady();
  const radar = useRadar(layer === "radar");

  const selectedRoute = routes.find(
    (route) => route.route_id === selectedRouteId,
  );

  const { stations, loading, failed, refresh } =
    useStationWeather(selectedRoute);

  const frame = radar.frames[radar.index];
  const owmCode = OWM_CODES[layer];
  const overlayOpacity = Math.max(0, Math.min(1, opacity));

  const nowIndex = radar.frames.findIndex(
    (item) => item.time * 1000 > Date.now(),
  );

  const isForecast = nowIndex !== -1 && radar.index >= nowIndex;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Radio size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Weather Surveillance
            </h3>
            <p className="text-xs text-slate-500">
              Radar, weather observations and route hazards
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              layer === "radar" && frame && !radar.failed
                ? "animate-pulse bg-emerald-500"
                : "bg-slate-400"
            }`}
          />
          <span className="text-xs font-medium text-slate-600">
            {layer === "radar"
              ? radar.failed
                ? "Radar unavailable"
                : radar.loading
                  ? "Loading radar"
                  : "Radar imagery"
              : layer === "none"
                ? "Base map"
                : `${layer} layer`}
          </span>
        </div>
      </div>

      {/* Working layer selector */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-3 py-3">
        {LAYER_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = layer === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onLayerChange(option.id)}
              aria-pressed={active}
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                active
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              <Icon size={15} />
              {option.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="ml-auto flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh weather
        </button>
      </div>

      {/* Map */}
      <div className="relative isolate z-0">
        {!ready ? (
          <div className="h-105 w-full animate-pulse bg-slate-100 sm:h-130" />
        ) : (
          <MapContainer
            center={[37.7749, -122.4194]}
            zoom={7}
            scrollWheelZoom
            className="h-120 w-full sm:h-140 lg:h-155"
            style={{ minHeight: "480px" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              zIndex={100}
            />

            {/* Animated precipitation radar */}
            {layer === "radar" && frame && radar.host && (
              <TileLayer
                key={frame.path}
                url={`${radar.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`}
                opacity={overlayOpacity}
                maxNativeZoom={7}
                maxZoom={18}
                zIndex={250}
                attribution="Radar &copy; RainViewer"
              />
            )}

            {/* OpenWeather imagery layers */}
            {owmCode && OWM_KEY && (
              <TileLayer
                key={owmCode}
                attribution="Weather &copy; OpenWeather"
                url={`https://tile.openweathermap.org/map/${owmCode}/{z}/{x}/{y}.png?appid=${OWM_KEY}`}
                opacity={overlayOpacity}
                maxZoom={18}
                zIndex={250}
              />
            )}

            <FitRoutes routes={routes} />
            <FlyToFocus focus={focus} />

            {/* Route-risk segments */}
            {routes.map((route) => {
              const selected = route.route_id === selectedRouteId;
              const coordinates = route.geometry.map(
                ([longitude, latitude]) =>
                  [latitude, longitude] as [number, number],
              );

              if (!selected || coordinates.length < 2) {
                return (
                  <Polyline
                    key={route.route_id}
                    positions={coordinates}
                    pathOptions={{
                      color: selected ? "#1d4ed8" : "#64748b",
                      weight: selected ? 5 : 3,
                      opacity: selected ? 0.95 : 0.45,
                    }}
                  />
                );
              }

              // Color the selected route by checkpoint risk.
              // Geometry points are divided into sections along the route.
              return coordinates.slice(0, -1).map((point, index) => {
                const next = coordinates[index + 1];
                const checkpointIndex = Math.min(
                  route.checkpoints.length - 1,
                  Math.floor(
                    (index / Math.max(1, coordinates.length - 1)) *
                      route.checkpoints.length,
                  ),
                );

                const checkpoint = route.checkpoints[checkpointIndex];
                const risk = checkpoint ? riskFor(checkpoint, metric) : "low";

                return (
                  <Polyline
                    key={`${route.route_id}-${index}`}
                    positions={[point, next]}
                    pathOptions={{
                      color: riskColors[risk] ?? "#1d4ed8",
                      weight: 5,
                      opacity: 0.9,
                    }}
                  />
                );
              });
            })}

            {/* Risk zones and checkpoint markers */}
            {selectedRoute?.checkpoints.map((checkpoint) => {
              const risk = riskFor(checkpoint, metric);
              const active = checkpoint.checkpoint_id === selectedCheckpointId;
              const color = riskColors[risk] ?? "#64748b";
              const halo = intensity(checkpoint, metric);
              const hazardous = ["high", "severe", "no_travel"].includes(risk);

              return (
                <span key={checkpoint.checkpoint_id}>
                  {/* Illustrative checkpoint-derived risk zone,
                      not an official storm boundary. */}
                  {hazardous && (
                    <Circle
                      center={[checkpoint.latitude, checkpoint.longitude]}
                      radius={risk === "no_travel" ? 18000 : 10000}
                      pathOptions={{
                        color,
                        weight: 1,
                        opacity: 0.6,
                        fillColor: color,
                        fillOpacity: 0.12,
                      }}
                    />
                  )}

                  {halo > 0 && (
                    <CircleMarker
                      center={[checkpoint.latitude, checkpoint.longitude]}
                      radius={9 + halo}
                      interactive={false}
                      pathOptions={{
                        stroke: false,
                        fillColor: color,
                        fillOpacity: 0.22,
                      }}
                    />
                  )}

                  <CircleMarker
                    center={[checkpoint.latitude, checkpoint.longitude]}
                    radius={active ? 10 : 7}
                    eventHandlers={{
                      click: () => onSelectCheckpoint(checkpoint.checkpoint_id),
                    }}
                    pathOptions={{
                      color: active ? "#0f172a" : "#ffffff",
                      weight: active ? 3 : 2,
                      fillColor: color,
                      fillOpacity: 1,
                    }}
                  >
                    <Popup>
                      <div className="min-w-44 space-y-1 text-xs">
                        <p className="text-sm font-semibold">
                          Checkpoint ·{" "}
                          {checkpoint.distance_from_start_miles.toFixed(1)} mi
                        </p>
                        <p className="capitalize">
                          Risk: <strong>{formatRisk(risk)}</strong>
                        </p>
                        <p>
                          Wind: {checkpoint.weather.wind_mph.toFixed(1)} mph
                        </p>
                        <p>
                          Rain:{" "}
                          {checkpoint.weather.precipitation_in_hr.toFixed(3)}{" "}
                          in/hr
                        </p>
                        <p>
                          Snow: {checkpoint.weather.snowfall_in_hr.toFixed(3)}{" "}
                          in/hr
                        </p>
                        {hazardous && (
                          <p className="mt-1 font-semibold text-red-700">
                            <AlertTriangle size={13} className="mr-1 inline" />
                            Elevated route risk
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            onSelectCheckpoint(checkpoint.checkpoint_id)
                          }
                          className="mt-2 rounded-md bg-blue-700 px-3 py-1.5 font-medium text-white"
                        >
                          View checkpoint
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                </span>
              );
            })}

            {/* Weather observation markers */}
            {stations.map((station) => {
              const storm = isStormCode(station.weatherCode);

              return (
                <CircleMarker
                  key={`station-${station.checkpointId}`}
                  center={[station.latitude, station.longitude]}
                  radius={storm ? 9 : 6}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 2,
                    fillColor: storm ? "#7c3aed" : "#0891b2",
                    fillOpacity: 1,
                  }}
                >
                  <Popup>
                    <div className="min-w-44 space-y-1 text-xs">
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        <MapPin size={14} />
                        Weather observation
                      </p>
                      <p>{weatherDescription(station.weatherCode)}</p>
                      <p>
                        Temperature:{" "}
                        {station.temperature === null
                          ? "N/A"
                          : `${station.temperature.toFixed(1)} °C`}
                      </p>
                      <p>
                        Wind:{" "}
                        {station.windSpeed === null
                          ? "N/A"
                          : `${station.windSpeed.toFixed(1)} km/h`}
                      </p>
                      <p>
                        Precipitation:{" "}
                        {station.precipitation === null
                          ? "N/A"
                          : `${station.precipitation.toFixed(1)} mm`}
                      </p>
                      <p className="text-slate-500">
                        {station.observedAt
                          ? `Data time: ${station.observedAt} UTC`
                          : "Time unavailable"}
                      </p>
                      <p className="text-slate-500">
                        Coordinate-based weather data, not a verified physical
                        station reading.
                      </p>
                      {storm && (
                        <p className="font-semibold text-violet-700">
                          Thunderstorm condition reported
                        </p>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}

        {/* Risk legend */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-400 flex max-w-[calc(100%-24px)] flex-wrap gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 text-[11px] capitalize text-slate-700 shadow-md backdrop-blur">
          {Object.entries(riskColors).map(([risk, color]) => (
            <span key={risk} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {formatRisk(risk)}
            </span>
          ))}
        </div>

        {/* Map overlays legend */}
        <div className="pointer-events-none absolute right-3 top-3 z-400 space-y-2 rounded-xl border border-slate-200 bg-white/95 p-3 text-[11px] text-slate-700 shadow-md backdrop-blur">
          <p className="font-semibold uppercase tracking-wide text-slate-500">
            Map layers
          </p>
          <p>
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-cyan-600" />
            Weather observations
          </p>
          <p>
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-violet-600" />
            Thunderstorm conditions
          </p>
          <p>
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
            Elevated route risk
          </p>
        </div>
      </div>

      {/* Timeline and data status */}
      <div className="space-y-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
        {layer === "radar" ? (
          radar.failed ? (
            <p className="text-xs text-amber-800">
              Radar imagery is unavailable. Route risk and weather markers
              remain available when their data sources respond.
            </p>
          ) : radar.loading || radar.frames.length === 0 ? (
            <p className="text-xs text-slate-500">
              Loading precipitation radar...
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => radar.setPlaying(!radar.playing)}
                aria-label={radar.playing ? "Pause radar" : "Play radar"}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white hover:bg-blue-800"
              >
                {radar.playing ? <Pause size={16} /> : <Play size={16} />}
              </button>

              <div className="min-w-40 flex-1">
                <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                  <span>Radar timeline</span>
                  <span>
                    {radar.index + 1} / {radar.frames.length}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={radar.frames.length - 1}
                  value={radar.index}
                  onChange={(event) => {
                    radar.setPlaying(false);
                    radar.setIndex(Number(event.target.value));
                  }}
                  aria-label="Radar timeline"
                  className="w-full cursor-pointer accent-blue-700"
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-800">
                  {frame ? formatFrameTime(frame.time) : "--"}
                </p>
                <p className="text-[10px] font-medium uppercase text-slate-500">
                  {isForecast ? "Forecast frame" : "Radar frame"}
                </p>
              </div>
            </div>
          )
        ) : layer === "none" ? (
          <p className="text-xs text-slate-500">
            Weather tile overlay is off. Route risks and observation markers
            remain displayed.
          </p>
        ) : !OWM_KEY ? (
          <p className="text-xs text-amber-700">
            OpenWeather tile layer needs NEXT_PUBLIC_OPENWEATHER_API_KEY.
            Weather observation markers use Open-Meteo separately.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Displaying the {layer} tile overlay, subject to API access.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>
            {loading
              ? "Updating coordinate-based weather data..."
              : failed
                ? "Weather data could not be loaded."
                : `${stations.length} weather observation markers loaded`}
          </span>
          <span>
            Storm zones are checkpoint-derived risk indicators, not official
            warning boundaries.
          </span>
        </div>
      </div>
    </div>
  );
}
