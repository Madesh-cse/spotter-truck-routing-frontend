"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  Gauge,
  Route as RouteIcon,
  ShieldAlert,
  Wind,
} from "lucide-react";

import type { RoutePlanResponse } from "@/types/routes";

type FleetDashboardProps = {
  result: RoutePlanResponse | null;
  loading: boolean;
};

const riskConfig = [
  { key: "low", label: "Low", color: "bg-emerald-500", text: "text-emerald-700" },
  { key: "moderate", label: "Moderate", color: "bg-amber-400", text: "text-amber-700" },
  { key: "high", label: "High", color: "bg-orange-500", text: "text-orange-700" },
  { key: "severe", label: "Severe", color: "bg-red-500", text: "text-red-700" },
  { key: "no_travel", label: "No travel", color: "bg-red-900", text: "text-red-900" },
] as const;

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof Activity;
  iconClass: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </p>
        </div>

        <div className={`rounded-lg p-2.5 ${iconClass}`}>
          <Icon size={20} />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">{subtitle}</p>
    </article>
  );
}

export default function FleetDashboard({
  result,
  loading,
}: FleetDashboardProps) {
  const routes = result?.routes ?? [];

  const checkpoints = routes.flatMap((route) => route.checkpoints);

  const severeCheckpoints = checkpoints.filter(
    (checkpoint) =>
      checkpoint.risk.overall_risk === "severe",
  ).length;

  const noTravelCheckpoints = checkpoints.filter(
    (checkpoint) =>
      checkpoint.risk.overall_risk === "no_travel",
  ).length;

  const highRiskRoutes = routes.filter(
    (route) =>
      route.risk_summary.high_miles > 0 ||
      route.risk_summary.severe_miles > 0 ||
      route.risk_summary.has_no_travel,
  ).length;

  const recommendedRoute = routes.find(
    (route) => route.route_id === result?.recommended_route_id,
  );

  const totalMiles = routes.reduce(
    (sum, route) => sum + route.distance_miles,
    0,
  );

  const riskCounts = {
    low: checkpoints.filter((cp) => cp.risk.overall_risk === "low").length,
    moderate: checkpoints.filter((cp) => cp.risk.overall_risk === "moderate").length,
    high: checkpoints.filter((cp) => cp.risk.overall_risk === "high").length,
    severe: severeCheckpoints,
    no_travel: noTravelCheckpoints,
  };

  const totalRiskPoints = Object.values(riskCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <section className="mb-6 space-y-5" aria-label="Fleet operations dashboard">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Activity size={15} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              Operations overview
            </span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Fleet Operations Dashboard
          </h2>

          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
            Monitor route alternatives, weather exposure, and truck safety
            from your current route-planning session.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
          <span
            className={`h-2 w-2 rounded-full ${
              loading ? "animate-pulse bg-blue-500" : result ? "bg-emerald-500" : "bg-slate-300"
            }`}
          />
          {loading
            ? "Analyzing routes"
            : result
              ? "Analysis available"
              : "Awaiting route plan"}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Routes analyzed"
          value={result ? result.count : "—"}
          subtitle="Alternative routes returned by the routing service"
          icon={RouteIcon}
          iconClass="bg-blue-50 text-blue-700"
        />

        <MetricCard
          title="Routes with elevated risk"
          value={result ? highRiskRoutes : "—"}
          subtitle="Routes with high, severe, or no-travel exposure"
          icon={AlertTriangle}
          iconClass="bg-orange-50 text-orange-700"
        />

        <MetricCard
          title="Severe checkpoints"
          value={result ? severeCheckpoints : "—"}
          subtitle="Checkpoints assessed as severe across the alternatives"
          icon={Wind}
          iconClass="bg-red-50 text-red-700"
        />

        <MetricCard
          title="Recommended route"
          value={
            recommendedRoute
              ? `Route ${recommendedRoute.risk_summary.rank}`
              : "—"
          }
          subtitle={
            recommendedRoute
              ? `${recommendedRoute.distance_miles.toFixed(1)} miles · ${Math.round(recommendedRoute.duration_minutes)} min`
              : "Available after route analysis"
          }
          icon={CheckCircle2}
          iconClass="bg-emerald-50 text-emerald-700"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">
                Weather risk distribution
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Overall checkpoint classifications across analyzed routes
              </p>
            </div>

            <CloudRain size={19} className="text-slate-400" />
          </div>

          {!result || totalRiskPoints === 0 ? (
            <div className="mt-6 flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
              <Gauge size={23} className="text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-700">
                No risk data yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Plan a route to populate the risk distribution.
              </p>
            </div>
          ) : (
            <>
              <div
                className="mt-6 flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
                aria-label="Checkpoint risk distribution"
              >
                {riskConfig.map((risk) => {
                  const count = riskCounts[risk.key];
                  const percentage = (count / totalRiskPoints) * 100;

                  return count > 0 ? (
                    <div
                      key={risk.key}
                      className={`${risk.color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                      title={`${risk.label}: ${count} checkpoints`}
                    />
                  ) : null;
                })}
              </div>

              <div className="mt-5 space-y-3">
                {riskConfig.map((risk) => {
                  const count = riskCounts[risk.key];
                  const percentage = (count / totalRiskPoints) * 100;

                  return (
                    <div
                      key={risk.key}
                      className="flex items-center gap-3"
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${risk.color}`} />

                      <span className="flex-1 text-sm text-slate-600">
                        {risk.label}
                      </span>

                      <span className="w-8 text-right text-sm font-semibold tabular-nums text-slate-900">
                        {count}
                      </span>

                      <span className="w-12 text-right text-xs tabular-nums text-slate-400">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-400">
                Counts represent checkpoint observations, not unique
                geographic locations. The same area may appear on multiple
                alternative routes.
              </p>
            </>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">
                Fleet safety snapshot
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Current route-planning assessment
              </p>
            </div>

            <ShieldAlert size={19} className="text-slate-400" />
          </div>

          {!result ? (
            <div className="mt-6 flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
              <Activity size={23} className="text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-700">
                Waiting for analysis
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Safety insights will appear after planning.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-3">
                <span className="text-sm text-slate-600">
                  Combined alternative distance
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-900">
                  {totalMiles.toLocaleString("en-US", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  mi
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-red-50/70 px-3.5 py-3">
                <span className="text-sm text-red-800">
                  No-travel checkpoints
                </span>
                <span className="text-sm font-semibold tabular-nums text-red-800">
                  {noTravelCheckpoints}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-orange-50/70 px-3.5 py-3">
                <span className="text-sm text-orange-800">
                  Routes with elevated risk
                </span>
                <span className="text-sm font-semibold tabular-nums text-orange-800">
                  {highRiskRoutes}
                </span>
              </div>

              <div className="rounded-lg border border-slate-200 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Recommendation
                </p>

                {recommendedRoute ? (
                  <>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      Route {recommendedRoute.risk_summary.rank} is the
                      current recommendation
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {recommendedRoute.risk_summary.severe_miles.toFixed(1)}{" "}
                      severe miles ·{" "}
                      {recommendedRoute.risk_summary.high_miles.toFixed(1)}{" "}
                      high-risk miles ·{" "}
                      {Math.round(recommendedRoute.duration_minutes)} minutes
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm font-medium text-red-700">
                    No eligible recommended route is available. Review
                    safety conditions before dispatch.
                  </p>
                )}
              </div>

              <p className="text-xs leading-5 text-slate-400">
                Combined distance sums all alternatives; it is not the
                distance traveled by a single truck.
              </p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}