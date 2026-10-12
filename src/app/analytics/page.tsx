
"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CloudLightning,
  MapPin,
  Route as RouteIcon,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { useSavedRoutePlan } from "@/lib/routePlanStore";
import type { PlannedRoute } from "@/types/routes";
import RoutePerformanceOverview from "@/components/analytics/RoutePerformanceOverview";

const RISK_ORDER = {
  low: 0,
  moderate: 1,
  high: 2,
  severe: 3,
  no_travel: 4,
} as const;

const RISK_STYLES: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-700",
  moderate: "bg-amber-50 text-amber-700",
  high: "bg-orange-50 text-orange-700",
  severe: "bg-red-50 text-red-700",
  no_travel: "bg-red-100 text-red-900",
};

const RISK_COLORS: Record<string, string> = {
  low: "bg-emerald-500",
  moderate: "bg-amber-400",
  high: "bg-orange-500",
  severe: "bg-red-500",
  no_travel: "bg-red-900",
};

const RISK_LEVELS = [
  "low",
  "moderate",
  "high",
  "severe",
  "no_travel",
] as const;

function getRisk(route: PlannedRoute) {
  if (route.risk_summary.has_no_travel) return "no_travel";

  return route.checkpoints.reduce<string>((highest, checkpoint) => {
    const risk = checkpoint.risk.overall_risk;

    return RISK_ORDER[risk] >
      RISK_ORDER[highest as keyof typeof RISK_ORDER]
      ? risk
      : highest;
  }, "low");
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);

  if (hours === 0) return `${remaining} min`;
  return `${hours}h ${remaining}m`;
}

function formatDistance(miles: number) {
  return `${miles.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  })} mi`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return (
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date) + " UTC"
  );
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  accent = "blue",
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof RouteIcon;
  accent?: "blue" | "green" | "orange" | "red";
}) {
  const accents = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div className={`rounded-xl p-2.5 ${accents[accent]}`}>
          <Icon size={20} />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </article>
  );
}

export default function RouteAnalyticsPage() {
  const saved = useSavedRoutePlan();
  const result = saved?.result;
  const routes = result?.routes ?? [];

  const recommended =
    routes.find(
      (route) =>
        route.route_id === result?.recommended_route_id,
    ) ??
    routes.find((route) => route.risk_summary.recommended);

  const highRiskRoutes = routes.filter((route) =>
    route.checkpoints.some((checkpoint) =>
      ["high", "severe", "no_travel"].includes(
        checkpoint.risk.overall_risk,
      ),
    ),
  ).length;

  const totalSevereCheckpoints = routes.reduce(
    (total, route) =>
      total +
      route.checkpoints.filter((checkpoint) =>
        ["severe", "no_travel"].includes(
          checkpoint.risk.overall_risk,
        ),
      ).length,
    0,
  );

  const riskCounts = RISK_LEVELS.map((risk) => ({
    risk,
    count: routes.reduce(
      (total, route) =>
        total +
        route.checkpoints.filter(
          (checkpoint) =>
            checkpoint.risk.overall_risk === risk,
        ).length,
      0,
    ),
  }));

  const totalCheckpoints = riskCounts.reduce(
    (total, item) => total + item.count,
    0,
  );

  const totalSevereMiles = routes.reduce(
    (total, route) =>
      total + route.risk_summary.severe_miles,
    0,
  );

  const totalHighMiles = routes.reduce(
    (total, route) =>
      total + route.risk_summary.high_miles,
    0,
  );

  const safeRoutes = routes.filter(
    (route) => !route.risk_summary.has_no_travel,
  ).length;

  const bestDuration = routes.length
    ? Math.min(...routes.map((route) => route.duration_minutes))
    : 0;

  const bestDistance = routes.length
    ? Math.min(...routes.map((route) => route.distance_miles))
    : 0;

  if (!saved || !result || routes.length === 0) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-sm font-medium text-blue-700">
            FLEET INTELLIGENCE
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Route Analytics
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Compare route performance, weather exposure, and safety.
          </p>
        </header>

        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Activity size={26} />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-slate-900">
            No route assessment available
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Plan a route first. Your distance, travel time, checkpoint
            risks, and alternative comparisons will appear here
            automatically.
          </p>

          <Link
            href="/route-planner"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            Open route planner <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-blue-700">
            FLEET INTELLIGENCE
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Route Analytics
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Analyze route efficiency, checkpoint hazards, and safety
            trade-offs.
          </p>
        </div>

        <Link
          href="/route-planner"
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RouteIcon size={16} />
          Plan another route
        </Link>
      </header>

      {/* Current route context */}
      <section className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
            <MapPin size={18} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {saved.originLabel}
              <ArrowRight className="mx-1 inline" size={14} />
              {saved.destinationLabel}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Departure: {formatDate(result.departure_time)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600">
            {result.checkpoint_interval_miles} mi checkpoint interval
          </span>

          <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600">
            {result.load_weight_lb.toLocaleString()} lb cargo
          </span>

          <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600">
            Forecast +{result.forecast_offset_hours}h
          </span>
        </div>
      </section>

      {/* Route performance map and metrics */}
      <RoutePerformanceOverview result={result} />

      {/* Analytics KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Route alternatives"
          value={String(routes.length)}
          description="Available options in this assessment"
          icon={RouteIcon}
        />

        <StatCard
          label="Routes with elevated risk"
          value={String(highRiskRoutes)}
          description="Routes containing high, severe, or no-travel checkpoints"
          icon={ShieldAlert}
          accent="orange"
        />

        <StatCard
          label="Severe / no-travel checkpoints"
          value={String(totalSevereCheckpoints)}
          description="Count across alternatives; checkpoints may occur on multiple routes"
          icon={CloudLightning}
          accent="red"
        />

        <StatCard
          label="Routes without no-travel"
          value={`${safeRoutes} / ${routes.length}`}
          description="Routes not flagged with a no-travel summary"
          icon={ShieldCheck}
          accent="green"
        />
      </section>

      {/* Risk distribution and recommended route */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-semibold text-slate-900">
              Checkpoint risk distribution
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Risk classifications across all route alternatives.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            {riskCounts.map(({ risk, count }) => {
              const percentage = totalCheckpoints
                ? (count / totalCheckpoints) * 100
                : 0;

              return (
                <div key={risk}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="capitalize text-slate-700">
                      {risk.replaceAll("_", " ")}
                    </span>

                    <span className="font-medium tabular-nums text-slate-900">
                      {count}{" "}
                      <span className="font-normal text-slate-400">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${RISK_COLORS[risk]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
            Totals count checkpoints across alternatives, not unique
            geographic locations.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">
                Recommended route
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Recommendation from the route planner.
              </p>
            </div>

            <CheckCircle2 className="text-emerald-600" size={22} />
          </div>

          {recommended ? (
            <>
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">
                    {recommended.route_id}
                  </span>

                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Recommended
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Distance</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">
                      {formatDistance(recommended.distance_miles)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Estimated duration
                    </p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">
                      {formatDuration(recommended.duration_minutes)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Severe exposure</p>
                    <p className="mt-1 font-semibold text-red-700">
                      {formatDistance(
                        recommended.risk_summary.severe_miles,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      High-risk exposure
                    </p>
                    <p className="mt-1 font-semibold text-orange-700">
                      {formatDistance(recommended.risk_summary.high_miles)}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                A recommendation is not a guarantee of safe conditions.
                Review current forecasts and all no-travel alerts before
                dispatch.
              </p>
            </>
          ) : (
            <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              No recommended route was provided by the current assessment.
              Review each alternative before dispatch.
            </div>
          )}
        </article>
      </section>

      {/* Alternative route comparison */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">
              Alternative route comparison
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Compare travel efficiency and weather exposure side by side.
            </p>
          </div>

          <span className="w-fit rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
            {routes.length} alternatives
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-225 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Route</th>
                <th className="px-5 py-3 font-medium">Distance</th>
                <th className="px-5 py-3 font-medium">Duration</th>
                <th className="px-5 py-3 font-medium">Severe miles</th>
                <th className="px-5 py-3 font-medium">High-risk miles</th>
                <th className="px-5 py-3 font-medium">Risk level</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {[...routes]
                .sort(
                  (a, b) =>
                    a.risk_summary.rank - b.risk_summary.rank,
                )
                .map((route) => {
                  const risk = getRisk(route);

                  const isRecommended =
                    route.risk_summary.recommended ||
                    route.route_id === result.recommended_route_id;

                  return (
                    <tr
                      key={route.route_id}
                      className={
                        isRecommended
                          ? "bg-emerald-50/40"
                          : "hover:bg-slate-50"
                      }
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {route.route_id}

                        {isRecommended && (
                          <span className="mt-1 block text-xs font-normal text-emerald-700">
                            Recommended option
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 tabular-nums text-slate-700">
                        {formatDistance(route.distance_miles)}
                      </td>

                      <td className="px-5 py-4 tabular-nums text-slate-700">
                        {formatDuration(route.duration_minutes)}
                      </td>

                      <td className="px-5 py-4 font-medium tabular-nums text-red-700">
                        {formatDistance(route.risk_summary.severe_miles)}
                      </td>

                      <td className="px-5 py-4 font-medium tabular-nums text-orange-700">
                        {formatDistance(route.risk_summary.high_miles)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${RISK_STYLES[risk]}`}
                        >
                          {risk.replaceAll("_", " ")}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {isRecommended ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 size={14} />
                            Recommended
                          </span>
                        ) : route.risk_summary.has_no_travel ? (
                          <span className="text-xs font-medium text-red-700">
                            Do not dispatch
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Alternative
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Efficiency summary */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <TrendingUp size={17} />
            Shortest alternative
          </div>

          <p className="mt-2 text-xl font-semibold text-slate-900">
            {formatDistance(bestDistance)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock3 size={17} />
            Fastest alternative
          </div>

          <p className="mt-2 text-xl font-semibold text-slate-900">
            {formatDuration(bestDuration)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CloudLightning size={17} />
            Combined exposure
          </div>

          <p className="mt-2 text-xl font-semibold text-slate-900">
            {formatDistance(totalSevereMiles + totalHighMiles)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Severe plus high-risk miles across alternatives; not unique road
            miles.
          </p>
        </div>
      </section>

      <footer className="flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>Latest assessment saved {formatDate(saved.savedAt)}</span>

        <Link
          href="/weather-risk"
          className="inline-flex items-center gap-1 font-medium text-blue-700 hover:text-blue-900"
        >
          Review weather risk <ArrowRight size={14} />
        </Link>
      </footer>
    </div>
  );
}
