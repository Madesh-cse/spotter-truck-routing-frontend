"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CloudLightning,
  Clock3,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  ShieldAlert,
  ShieldCheck,
  Wind,
} from "lucide-react";

import { useSavedRoutePlan } from "@/lib/routePlanStore";
import type {
  CheckpointRisk,
  PlannedRoute,
} from "@/types/routes";

const riskOrder = {
  low: 0,
  moderate: 1,
  high: 2,
  severe: 3,
  no_travel: 4,
} as const;

type RiskLevel = keyof typeof riskOrder;

const riskStyles: Record<RiskLevel, string> = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  moderate: "bg-amber-50 text-amber-700 ring-amber-200",
  high: "bg-orange-50 text-orange-700 ring-orange-200",
  severe: "bg-red-50 text-red-700 ring-red-200",
  no_travel: "bg-rose-100 text-rose-800 ring-rose-300",
};

function formatRisk(risk: string) {
  return risk.replace("_", " ").replace(/\b\w/g, (char) =>
    char.toUpperCase(),
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown time";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
}

function getRouteRisk(route: PlannedRoute): RiskLevel {
  if (route.risk_summary.has_no_travel) return "no_travel";

  const risks = route.checkpoints.map(
    (checkpoint) => checkpoint.risk.overall_risk,
  );

  if (risks.includes("no_travel")) return "no_travel";
  if (risks.includes("severe")) return "severe";
  if (risks.includes("high")) return "high";
  if (risks.includes("moderate")) return "moderate";

  return "low";
}

function getRiskCounts(routes: PlannedRoute[]) {
  const counts: Record<RiskLevel, number> = {
    low: 0,
    moderate: 0,
    high: 0,
    severe: 0,
    no_travel: 0,
  };

  routes.forEach((route) => {
    counts[getRouteRisk(route)] += 1;
  });

  return counts;
}

function getCheckpointAlerts(routes: PlannedRoute[]) {
  return routes
    .flatMap((route) =>
      route.checkpoints.map((checkpoint) => ({
        ...checkpoint,
        routeId: route.route_id,
        routeRisk: getRouteRisk(route),
      })),
    )
    .filter((checkpoint) =>
      ["high", "severe", "no_travel"].includes(
        checkpoint.risk.overall_risk,
      ),
    )
    .sort(
      (a, b) =>
        riskOrder[b.risk.overall_risk] -
        riskOrder[a.risk.overall_risk],
    );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: typeof Route;
  tone: "blue" | "red" | "amber" | "green";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${tones[tone]}`}>
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${riskStyles[risk]}`}
    >
      {formatRisk(risk)}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Navigation size={26} />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">
        No route assessments yet
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Plan a truck route to see real weather forecasts, checkpoint
        risks, route alternatives, and safety recommendations here.
      </p>
      <Link
        href="/route-planner"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        Plan your first route <ArrowRight size={16} />
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const savedPlan = useSavedRoutePlan();

  const routes = savedPlan?.result.routes ?? [];
  const riskCounts = getRiskCounts(routes);
  const alerts = getCheckpointAlerts(routes);

  const highRiskRoutes = routes.filter((route) =>
    ["high", "severe", "no_travel"].includes(getRouteRisk(route)),
  ).length;

  const severeCheckpoints = routes.reduce(
    (total, route) =>
      total +
      route.checkpoints.filter((checkpoint) =>
        ["severe", "no_travel"].includes(
          checkpoint.risk.overall_risk,
        ),
      ).length,
    0,
  );

  const recommendedRoute =
    routes.find((route) => route.risk_summary.recommended) ??
    routes.find(
      (route) =>
        route.route_id === savedPlan?.result.recommended_route_id,
    ) ??
    null;

  const totalDistance = routes.reduce(
    (total, route) => total + route.distance_miles,
    0,
  );

  const safeRoutes = routes.filter(
    (route) => !route.risk_summary.has_no_travel,
  ).length;

  const riskDistribution = (
    Object.entries(riskCounts) as [RiskLevel, number][]
  ).filter(([, count]) => count > 0);

  const maxRiskCount = Math.max(
    1,
    ...riskDistribution.map(([, count]) => count),
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Fleet operations
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Operations Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Monitor truck route safety and weather-related travel risks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {savedPlan && (
            <span className="text-xs text-slate-500">
              Updated {formatDate(savedPlan.savedAt)} UTC
            </span>
          )}
          <Link
            href="/route-planner"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Route size={17} />
            Plan a route
          </Link>
        </div>
      </section>

      {!savedPlan || routes.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {savedPlan.result.warning && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertTriangle size={19} className="mt-0.5 shrink-0" />
              <p>{savedPlan.result.warning}</p>
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Routes Assessed"
              value={routes.length}
              description="Alternatives in the latest assessment"
              icon={Route}
              tone="blue"
            />
            <MetricCard
              label="High-Risk Routes"
              value={highRiskRoutes}
              description="Routes rated high, severe, or no travel"
              icon={ShieldAlert}
              tone="red"
            />
            <MetricCard
              label="Severe Checkpoints"
              value={severeCheckpoints}
              description="Severe or no-travel checkpoints"
              icon={CloudLightning}
              tone="amber"
            />
            <MetricCard
              label="Routes Without No-Travel"
              value={`${safeRoutes}/${routes.length}`}
              description="Alternatives not marked no-travel"
              icon={ShieldCheck}
              tone="green"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Route risk distribution
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Risk classification across the latest alternatives
                  </p>
                </div>
                <Activity size={20} className="text-slate-400" />
              </div>

              <div className="mt-7 space-y-5">
                {riskDistribution.map(([risk, count]) => (
                  <div key={risk}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {formatRisk(risk)}
                      </span>
                      <span className="tabular-nums text-slate-500">
                        {count} {count === 1 ? "route" : "routes"}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          risk === "low"
                            ? "bg-emerald-500"
                            : risk === "moderate"
                              ? "bg-amber-400"
                              : risk === "high"
                                ? "bg-orange-500"
                                : risk === "severe"
                                  ? "bg-red-500"
                                  : "bg-rose-800"
                        }`}
                        style={{
                          width: `${(count / maxRiskCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">Total alternative miles</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {totalDistance.toLocaleString("en-US", {
                      maximumFractionDigits: 1,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Checkpoint interval</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {savedPlan.intervalMiles} mi
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-xs text-slate-500">Cargo load</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {savedPlan.result.load_weight_lb.toLocaleString("en-US")} lb
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Recommended route
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Based on the backend recommendation
                  </p>
                </div>
                <CheckCircle2 size={21} className="text-emerald-600" />
              </div>

              {recommendedRoute ? (
                <div className="mt-6 space-y-5">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-emerald-900">
                        {recommendedRoute.route_id}
                      </span>
                      <span className="text-xs font-semibold text-emerald-700">
                        Rank #{recommendedRoute.risk_summary.rank}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-emerald-800">
                      {recommendedRoute.risk_summary.has_no_travel
                        ? "This route is marked no-travel. Review the alternatives and safety warnings before proceeding."
                        : "Selected by the route planner's risk-based recommendation."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Distance</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {recommendedRoute.distance_miles.toFixed(1)}
                        <span className="ml-1 text-sm font-medium text-slate-500">
                          mi
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Driving time</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {(recommendedRoute.duration_minutes / 60).toFixed(1)}
                        <span className="ml-1 text-sm font-medium text-slate-500">
                          hr
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                      Severe miles:{" "}
                      {recommendedRoute.risk_summary.severe_miles.toFixed(1)}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                      High-risk miles:{" "}
                      {recommendedRoute.risk_summary.high_miles.toFixed(1)}
                    </span>
                  </div>

                  <Link
                    href="/route-planner"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View route alternatives <ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <p className="mt-6 text-sm text-slate-500">
                  No recommended route was returned for this assessment.
                </p>
              )}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
                <div>
                  <h2 className="font-bold text-slate-900">Latest route assessment</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {savedPlan.originLabel} → {savedPlan.destinationLabel}
                  </p>
                </div>
                <MapPin size={20} className="shrink-0 text-slate-400" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Route</th>
                      <th className="px-5 py-3 font-semibold">Distance</th>
                      <th className="px-5 py-3 font-semibold">Duration</th>
                      <th className="px-5 py-3 font-semibold">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {routes.map((route) => (
                      <tr key={route.route_id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-800">
                            {route.route_id}
                          </div>
                          {route.risk_summary.recommended && (
                            <span className="mt-1 inline-block text-xs text-emerald-600">
                              Recommended
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {route.distance_miles.toFixed(1)} mi
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {Math.round(route.duration_minutes)} min
                        </td>
                        <td className="px-5 py-4">
                          <RiskBadge risk={getRouteRisk(route)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
                <div>
                  <h2 className="font-bold text-slate-900">Weather risk alerts</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    High-priority checkpoint conditions
                  </p>
                </div>
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                  {alerts.length} alerts
                </span>
              </div>

              <div className="max-h-105 divide-y divide-slate-100 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle2 className="mx-auto text-emerald-500" size={28} />
                    <p className="mt-3 text-sm font-semibold text-slate-800">
                      No high-priority alerts
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      No checkpoints in this assessment are rated high, severe, or no-travel.
                    </p>
                  </div>
                ) : (
                  alerts.slice(0, 8).map((checkpoint) => (
                    <div key={`${checkpoint.routeId}-${checkpoint.checkpoint_id}`} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-lg p-2 ${
                          checkpoint.risk.overall_risk === "no_travel"
                            ? "bg-rose-100 text-rose-800"
                            : checkpoint.risk.overall_risk === "severe"
                              ? "bg-red-50 text-red-600"
                              : "bg-orange-50 text-orange-600"
                        }`}>
                          {checkpoint.risk.overall_risk === "no_travel" ? (
                            <ShieldAlert size={17} />
                          ) : (
                            <Wind size={17} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800">
                              {checkpoint.checkpoint_id}
                            </p>
                            <RiskBadge risk={checkpoint.risk.overall_risk} />
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Route {checkpoint.routeId} ·{" "}
                            {checkpoint.distance_from_start_miles.toFixed(1)} mi from start
                          </p>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <Wind size={13} />
                              {checkpoint.weather.wind_mph.toFixed(1)} mph
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <CloudLightning size={13} />
                              {checkpoint.weather.precipitation_in_hr.toFixed(2)} in/hr rain
                            </span>
                          </div>
                          <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400">
                            <Clock3 size={12} />
                            ETA {formatDate(checkpoint.eta)} UTC
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-100 p-4">
                <Link
                  href="/weather-risk"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Open weather risk center <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Assessment details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Inputs used for the most recent route planning request.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                <RefreshCw size={14} />
                Updates when a new plan is saved
              </span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Origin</p>
                <p className="mt-2 wrap-break-words text-sm font-semibold text-slate-800">
                  {savedPlan.originLabel}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Destination</p>
                <p className="mt-2 wrap-break-words text-sm font-semibold text-slate-800">
                  {savedPlan.destinationLabel}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Departure</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {formatDate(savedPlan.result.departure_time)} UTC
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Forecast offset</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {savedPlan.result.forecast_offset_hours} hours
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}