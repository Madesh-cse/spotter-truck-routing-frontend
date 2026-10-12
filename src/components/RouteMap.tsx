"use client";

import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import {
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  CloudSnow,
  Gauge,
  MapPinned,
  Navigation,
  Route as RouteIcon,
  ShieldCheck,
  Wind,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

import type { PlannedRoute } from "@/types/routes";

type RouteMapProps = {
  routes: PlannedRoute[];
  recommendedRouteId: string | null;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
};

const riskColors: Record<string, string> = {
  low: "#16a34a",
  moderate: "#d97706",
  high: "#ea580c",
  severe: "#dc2626",
  no_travel: "#7f1d1d",
};

const riskStyles: Record<string, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  moderate: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  severe: "border-red-200 bg-red-50 text-red-700",
  no_travel: "border-red-300 bg-red-100 text-red-900",
};

// Regex replace instead of replaceAll: works without the ES2021 TS lib target
function formatRisk(risk: string) {
  return risk.replace(/_/g, " ");
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} hr`;

  return `${hours} hr ${remainingMinutes} min`;
}

/* Leaflet must not be created during React's simulated unmount/remount
   (StrictMode / React 19 ref cleanup). Render the map only after the final
   mount, otherwise it throws "Map container is being reused" and
   "appendChild" errors. */
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
        ([longitude, latitude]) =>
          [latitude, longitude] as [number, number],
      ),
    );

    if (coordinates.length === 0) return;

    // Leaflet must re-measure its container before fitting, otherwise the
    // route is fitted to a stale size and ends up off-center or clipped.
    const fit = () => {
      map.invalidateSize();
      map.fitBounds(coordinates, {
        padding: [40, 40],
        maxZoom: 12,
      });
    };

    const frame = requestAnimationFrame(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(map.getContainer());

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [routes, map]);

  return null;
}

function RiskBadge({ risk }: { risk: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${riskStyles[risk] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: riskColors[risk] ?? "#64748b" }}
      />
      {formatRisk(risk)}
    </span>
  );
}

export default function RouteMap({
  routes,
  recommendedRouteId,
  selectedRouteId,
  onSelectRoute,
}: RouteMapProps) {
  const ready = useMapReady();

  const firstPoint = routes[0]?.geometry[0];

  const center: [number, number] = firstPoint
    ? [firstPoint[1], firstPoint[0]]
    : [37.7749, -122.4194];

  const selectedRoute =
    routes.find((route) => route.route_id === selectedRouteId) ?? null;

  const recommendedRoute =
    routes.find((route) => route.route_id === recommendedRouteId) ?? null;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
      {/* Enterprise header */}
      <div className="bg-slate-950 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10">
              <MapPinned className="h-5 w-5 text-blue-300" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Route intelligence
                </h2>

                <span className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                  Live analysis
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-400">
                Compare route alternatives, weather exposure, and checkpoint
                risk.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:self-auto">
            <RouteIcon className="h-4 w-4 text-blue-300" />
            <span className="text-sm font-medium text-white">
              {routes.length} {routes.length === 1 ? "route" : "routes"}
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-500" />
            <span className="text-xs text-slate-400">Available alternatives</span>
          </div>
        </div>

        {/* Risk legend */}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Risk levels
          </span>

          {Object.entries(riskColors).map(([risk, color]) => (
            <span key={risk} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full ring-2 ring-white/10"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs capitalize text-slate-300">
                {formatRisk(risk)}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Selected route summary */}
      {selectedRoute && (
        <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-4">
          <div className="bg-white px-4 py-4 sm:px-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Selected route
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Navigation className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-semibold text-slate-900">
                Route {selectedRoute.risk_summary.rank}
              </span>
            </div>
          </div>

          <div className="bg-white px-4 py-4 sm:px-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Total distance
            </p>
            <p className="mt-2 text-lg font-semibold tabular-nums text-slate-900">
              {selectedRoute.distance_miles.toFixed(1)}
              <span className="ml-1 text-xs font-medium text-slate-500">
                mi
              </span>
            </p>
          </div>

          <div className="bg-white px-4 py-4 sm:px-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Estimated duration
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {formatDuration(selectedRoute.duration_minutes)}
            </p>
          </div>

          <div className="bg-white px-4 py-4 sm:px-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Route assessment
            </p>
            <div className="mt-2">
              {selectedRoute.risk_summary.has_no_travel ? (
                <RiskBadge risk="no_travel" />
              ) : selectedRoute.route_id === recommendedRouteId ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  Recommended
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
                  <Gauge className="h-4 w-4" />
                  Alternative
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="relative bg-slate-100 p-2 sm:p-3">
        <div className="relative isolate z-0 overflow-hidden rounded-xl border border-slate-200">
          {!ready ? (
            <div className="h-90 w-full bg-slate-100 sm:h-115 lg:h-130" />
          ) : (
            <MapContainer
              center={center}
              zoom={9}
              scrollWheelZoom
              className="h-90 w-full sm:h-115 lg:h-130"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitRoutes routes={routes} />

              {routes.map((route) => {
                const isSelected = route.route_id === selectedRouteId;
                const isRecommended = route.route_id === recommendedRouteId;
                const hasNoTravel = route.risk_summary.has_no_travel;

                return (
                  <Polyline
                    key={route.route_id}
                    positions={route.geometry.map(
                      ([longitude, latitude]) =>
                        [latitude, longitude] as [number, number],
                    )}
                    pathOptions={{
                      color: hasNoTravel
                        ? riskColors.no_travel
                        : isSelected
                          ? "#2563eb"
                          : isRecommended
                            ? "#16a34a"
                            : "#94a3b8",
                      weight: isSelected ? 7 : isRecommended ? 5 : 4,
                      opacity: isSelected ? 1 : isRecommended ? 0.9 : 0.65,
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                    eventHandlers={{
                      click: () => onSelectRoute(route.route_id),
                    }}
                  >
                    <Popup>
                      <div className="min-w-42.5 space-y-2">
                        <div className="font-semibold text-slate-900">
                          Route {route.risk_summary.rank}
                        </div>

                        <div className="text-sm text-slate-600">
                          {route.distance_miles.toFixed(1)} miles
                          <br />
                          {formatDuration(route.duration_minutes)}
                        </div>

                        <div className="text-xs font-semibold">
                          {hasNoTravel
                            ? "No-travel risk detected"
                            : isRecommended
                              ? "Recommended route"
                              : "Select to compare"}
                        </div>
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}

              {routes
                .filter((route) => route.route_id === selectedRouteId)
                .flatMap((route) =>
                  route.checkpoints.map((checkpoint) => (
                    <CircleMarker
                      key={`${route.route_id}-${checkpoint.checkpoint_id}`}
                      center={[checkpoint.latitude, checkpoint.longitude]}
                      radius={8}
                      pathOptions={{
                        color: "#ffffff",
                        weight: 2.5,
                        fillColor:
                          riskColors[checkpoint.risk.overall_risk] ??
                          "#64748b",
                        fillOpacity: 1,
                      }}
                    >
                      <Popup>
                        <div className="min-w-47.5 space-y-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                              Checkpoint
                            </p>
                            <p className="mt-1 font-semibold text-slate-900">
                              {checkpoint.distance_from_start_miles.toFixed(1)}{" "}
                              miles from start
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              ETA: {new Date(checkpoint.eta).toLocaleString()}
                            </p>
                          </div>

                          <div>
                            <p className="mb-1.5 text-xs font-medium text-slate-500">
                              Overall risk
                            </p>
                            <RiskBadge risk={checkpoint.risk.overall_risk} />
                          </div>

                          <div className="space-y-2 border-t border-slate-200 pt-2">
                            <div className="flex items-center justify-between gap-4 text-xs">
                              <span className="flex items-center gap-1.5 text-slate-600">
                                <Wind className="h-3.5 w-3.5" />
                                Wind
                              </span>
                              <span className="font-semibold text-slate-900">
                                {checkpoint.weather.wind_mph.toFixed(1)} mph
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-4 text-xs">
                              <span className="flex items-center gap-1.5 text-slate-600">
                                <CloudRain className="h-3.5 w-3.5" />
                                Rain
                              </span>
                              <span className="font-semibold text-slate-900">
                                {checkpoint.weather.precipitation_in_hr.toFixed(
                                  3,
                                )}{" "}
                                in/hr
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-4 text-xs">
                              <span className="flex items-center gap-1.5 text-slate-600">
                                <CloudSnow className="h-3.5 w-3.5" />
                                Snow
                              </span>
                              <span className="font-semibold text-slate-900">
                                {checkpoint.weather.snowfall_in_hr.toFixed(3)}{" "}
                                in/hr
                              </span>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  )),
                )}
            </MapContainer>
          )}

          {/* Map overlay */}
          <div className="pointer-events-none absolute right-3 top-3 z-400 hidden sm:block">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-slate-700">
                Route analysis view
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1 pt-3">
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <MapPinned className="h-3.5 w-3.5" />
            Select a route or checkpoint to inspect its details.
          </p>

          <p className="text-xs text-slate-500">
            Map data © OpenStreetMap contributors
          </p>
        </div>
      </div>

      {/* Route comparison */}
      <div className="border-t border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 sm:px-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Route alternatives
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Select a route to inspect its weather checkpoints.
            </p>
          </div>

          {recommendedRoute && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Best eligible route
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
          {routes.map((route) => {
            const isSelected = route.route_id === selectedRouteId;
            const isRecommended = route.route_id === recommendedRouteId;
            const hasNoTravel = route.risk_summary.has_no_travel;
            const { severe_miles, high_miles } = route.risk_summary;

            return (
              <button
                key={route.route_id}
                type="button"
                onClick={() => onSelectRoute(route.route_id)}
                aria-pressed={isSelected}
                className={`group relative rounded-xl border p-4 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/60 shadow-sm ring-1 ring-blue-600/10"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                {isSelected && (
                  <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-blue-600" />
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        isSelected
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                      }`}
                    >
                      <RouteIcon className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Route {route.risk_summary.rank}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {route.checkpoints.length} checkpoints
                      </p>
                    </div>
                  </div>

                  {isRecommended ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Recommended
                    </span>
                  ) : hasNoTravel ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">
                      <AlertTriangle className="h-3 w-3" />
                      No travel
                    </span>
                  ) : (
                    <span
                      className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                        isSelected
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isSelected ? "Selected" : "Alternative"}
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200/80 pt-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Distance
                    </p>
                    <p className="mt-1 text-base font-semibold tabular-nums text-slate-900">
                      {route.distance_miles.toFixed(1)}
                      <span className="ml-1 text-xs font-medium text-slate-500">
                        mi
                      </span>
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Duration
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {formatDuration(route.duration_minutes)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {severe_miles > 0 && (
                    <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                      {severe_miles.toFixed(1)} mi severe
                    </span>
                  )}

                  {high_miles > 0 && (
                    <span className="rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">
                      {high_miles.toFixed(1)} mi high risk
                    </span>
                  )}

                  {severe_miles === 0 && high_miles === 0 && !hasNoTravel && (
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      No severe or high-risk miles
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}