
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CloudLightning,
  MapPin,
  Route as RouteIcon,
  ShieldAlert,
} from "lucide-react";

import type { RoutePlanResponse, PlannedRoute } from "@/types/routes";

const RouteMap = dynamic(
  () => import("@/components/RouteMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-115 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
        Loading interactive route map...
      </div>
    ),
  },
);

function formatDistance(miles: number) {
  return `${miles.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  })} mi`;
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  return hours ? `${hours}h ${mins}m` : `${mins} min`;
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof RouteIcon;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Icon size={16} />
        {label}
      </div>
      <p className="mt-2 wrap-break-words text-xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

export default function RoutePerformanceOverview({
  result,
}: {
  result: RoutePlanResponse;
}) {
  const routes = result.routes ?? [];

  const recommendedRoute =
    routes.find((route) => route.route_id === result.recommended_route_id) ??
    routes.find((route) => route.risk_summary.recommended) ??
    null;

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(
    recommendedRoute?.route_id ?? routes[0]?.route_id ?? null,
  );

  useEffect(() => {
    setSelectedRouteId(
      recommendedRoute?.route_id ?? routes[0]?.route_id ?? null,
    );
  }, [result, recommendedRoute?.route_id, routes]);

  const selectedRoute: PlannedRoute | null =
    routes.find((route) => route.route_id === selectedRouteId) ??
    recommendedRoute ??
    routes[0] ??
    null;

  if (!routes.length) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">
          Route Performance Overview
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          No route alternatives are available for this assessment.
        </p>
      </section>
    );
  }

  const severeMiles = selectedRoute?.risk_summary.severe_miles ?? 0;
  const highMiles = selectedRoute?.risk_summary.high_miles ?? 0;
  const highRiskExposure = severeMiles + highMiles;

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-medium text-blue-700">
          ROUTE INTELLIGENCE
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
          Route Performance Overview
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Explore route alternatives and compare travel efficiency with weather
          risk exposure.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
        {/* Interactive route map */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Route map
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Select a route to view its performance metrics.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {routes.length} alternatives
            </span>
          </div>

          <div className="h-105 min-w-0 sm:h-125">
            <RouteMap
              routes={routes}
              recommendedRouteId={result.recommended_route_id}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
            />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Low risk
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              Moderate
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
              High
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
              Severe / no travel
            </span>
          </div>
        </div>

        {/* Performance metrics */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-slate-500">
                  Currently selected route
                </p>
                <h3 className="mt-1 wrap-break-words text-xl font-semibold text-slate-950">
                  {selectedRoute?.route_id ?? "Unavailable"}
                </h3>
              </div>
              {selectedRoute?.route_id === recommendedRoute?.route_id && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 size={14} />
                  Recommended
                </span>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric
                label="Alternatives"
                value={String(routes.length)}
                icon={RouteIcon}
              />
              <Metric
                label="Distance"
                value={
                  selectedRoute
                    ? formatDistance(selectedRoute.distance_miles)
                    : "—"
                }
                icon={MapPin}
              />
              <Metric
                label="Estimated duration"
                value={
                  selectedRoute
                    ? formatDuration(selectedRoute.duration_minutes)
                    : "—"
                }
                icon={Clock3}
              />
              <Metric
                label="High-risk exposure"
                value={formatDistance(highRiskExposure)}
                icon={ShieldAlert}
              />
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              High-risk exposure combines the selected route&apos;s high-risk
              and severe-risk miles. It excludes no-travel miles unless the
              backend already includes them in those summary fields.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CloudLightning size={18} className="text-orange-600" />
              <h3 className="font-semibold text-slate-900">
                Weather risk exposure
              </h3>
            </div>

            {selectedRoute ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-slate-600">High-risk miles</span>
                    <span className="font-semibold text-orange-700">
                      {formatDistance(highMiles)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{
                        width: `${
                          selectedRoute.distance_miles > 0
                            ? Math.min(
                                100,
                                (highMiles / selectedRoute.distance_miles) *
                                  100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-slate-600">Severe-risk miles</span>
                    <span className="font-semibold text-red-700">
                      {formatDistance(severeMiles)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-red-600"
                      style={{
                        width: `${
                          selectedRoute.distance_miles > 0
                            ? Math.min(
                                100,
                                (severeMiles / selectedRoute.distance_miles) *
                                  100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {selectedRoute.risk_summary.has_no_travel && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    This route has a no-travel risk. Do not dispatch without
                    resolving the hazard and reassessing conditions.
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Select a route to view its risk exposure.
              </p>
            )}
          </div>

          {recommendedRoute && (
            <button
              type="button"
              onClick={() => setSelectedRouteId(recommendedRoute.route_id)}
              className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
            >
              <span>
                <span className="block">View recommended route</span>
                <span className="mt-1 block text-xs font-normal text-emerald-700">
                  {recommendedRoute.route_id} ·{" "}
                  {formatDistance(recommendedRoute.distance_miles)}
                </span>
              </span>
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
