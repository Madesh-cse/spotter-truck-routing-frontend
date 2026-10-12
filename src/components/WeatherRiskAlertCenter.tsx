"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock3,
  CloudRain,
  Filter,
  MapPin,
  ShieldAlert,
  Wind,
} from "lucide-react";

import type { RoutePlanResponse } from "@/types/routes";

type WeatherRiskAlertCenterProps = {
  result: RoutePlanResponse | null;
};

type AlertSeverity = "high" | "severe" | "no_travel";

type WeatherAlert = {
  id: string;
  routeId: string;
  routeRank: number;
  checkpointId: string;
  distance: number;
  eta: string;
  severity: AlertSeverity;
  reasons: string[];
  wind: number;
  rain: number;
  snow: number;
};

const severityConfig: Record<
  AlertSeverity,
  {
    label: string;
    description: string;
    badge: string;
    icon: string;
    priority: number;
  }
> = {
  no_travel: {
    label: "No travel",
    description: "Unsafe conditions identified",
    badge: "border-red-200 bg-red-50 text-red-800",
    icon: "bg-red-100 text-red-800",
    priority: 0,
  },
  severe: {
    label: "Severe",
    description: "Severe weather exposure",
    badge: "border-orange-200 bg-orange-50 text-orange-800",
    icon: "bg-orange-100 text-orange-800",
    priority: 1,
  },
  high: {
    label: "High",
    description: "Elevated weather risk",
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    icon: "bg-amber-100 text-amber-800",
    priority: 2,
  },
};

type FilterValue = "all" | AlertSeverity;

function formatETA(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  // Use UTC explicitly to avoid server/client locale hydration mismatches.
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function getWeatherReasons(
  checkpoint: WeatherAlert,
  risk: {
    wind_risk: string;
    rain_risk: string;
    snow_risk: string;
  },
) {
  const reasons: string[] = [];

  if (["high", "severe", "no_travel"].includes(risk.wind_risk)) {
    reasons.push(`Wind risk: ${checkpoint.wind.toFixed(1)} mph`);
  }

  if (["high", "severe", "no_travel"].includes(risk.rain_risk)) {
    reasons.push(`Rain risk: ${checkpoint.rain.toFixed(3)} in/hr`);
  }

  if (["high", "severe", "no_travel"].includes(risk.snow_risk)) {
    reasons.push(`Snow risk: ${checkpoint.snow.toFixed(3)} in/hr`);
  }

  return reasons.length > 0
    ? reasons
    : ["Multiple weather factors contribute to the overall risk."];
}

export default function WeatherRiskAlertCenter({
  result,
}: WeatherRiskAlertCenterProps) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [showAcknowledged, setShowAcknowledged] = useState(true);
  const [expandedAlerts, setExpandedAlerts] = useState<string[]>([]);

  const alerts = useMemo<WeatherAlert[]>(() => {
    if (!result) return [];

    return result.routes
      .flatMap((route) =>
        route.checkpoints.flatMap((checkpoint) => {
          const severity = checkpoint.risk.overall_risk;

          if (
            severity !== "high" &&
            severity !== "severe" &&
            severity !== "no_travel"
          ) {
            return [];
          }

          const alertBase: WeatherAlert = {
            id: `${route.route_id}:${checkpoint.checkpoint_id}`,
            routeId: route.route_id,
            routeRank: route.risk_summary.rank,
            checkpointId: checkpoint.checkpoint_id,
            distance: checkpoint.distance_from_start_miles,
            eta: checkpoint.eta,
            severity,
            reasons: [],
            wind: checkpoint.weather.wind_mph,
            rain: checkpoint.weather.precipitation_in_hr,
            snow: checkpoint.weather.snowfall_in_hr,
          };

          return [
            {
              ...alertBase,
              reasons: getWeatherReasons(alertBase, {
                wind_risk: checkpoint.risk.wind_risk,
                rain_risk: checkpoint.risk.rain_risk,
                snow_risk: checkpoint.risk.snow_risk,
              }),
            },
          ];
        }),
      )
      .sort((a, b) => {
        const priority =
          severityConfig[a.severity].priority -
          severityConfig[b.severity].priority;

        if (priority !== 0) return priority;

        return a.distance - b.distance;
      });
  }, [result]);

  const counts = {
    all: alerts.length,
    no_travel: alerts.filter((a) => a.severity === "no_travel").length,
    severe: alerts.filter((a) => a.severity === "severe").length,
    high: alerts.filter((a) => a.severity === "high").length,
  };

  const unacknowledgedCount = alerts.filter(
    (alert) => !acknowledged.includes(alert.id),
  ).length;

  const filteredAlerts = alerts.filter((alert) => {
    const matchesFilter =
      filter === "all" || alert.severity === filter;

    const isAcknowledged = acknowledged.includes(alert.id);

    return (
      matchesFilter &&
      (showAcknowledged || !isAcknowledged)
    );
  });

  function toggleAcknowledged(id: string) {
    setAcknowledged((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function acknowledgeAll() {
    setAcknowledged((current) => [
      ...new Set([...current, ...filteredAlerts.map((a) => a.id)]),
    ]);
  }

  function toggleExpanded(id: string) {
    setExpandedAlerts((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <section
      aria-label="Weather risk alert center"
      className="min-w-0 space-y-5"
    >
      {/* Section heading */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <ShieldAlert size={16} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Safety monitoring
            </span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Weather Risk Alert Center
          </h2>

          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            Review weather hazards along the currently analyzed truck routes.
          </p>
        </div>

        {result && (
          <div className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <span
              className={`h-2 w-2 rounded-full ${
                counts.no_travel > 0
                  ? "bg-red-600"
                  : counts.severe > 0
                    ? "bg-orange-500"
                    : counts.high > 0
                      ? "bg-amber-500"
                      : "bg-emerald-500"
              }`}
            />
            <span className="font-medium text-slate-700">
              {unacknowledgedCount} unreviewed
            </span>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard
          label="Total alerts"
          value={result ? counts.all : "—"}
          icon={<AlertTriangle size={18} />}
          className="bg-slate-50 text-slate-700"
        />

        <SummaryCard
          label="No travel"
          value={result ? counts.no_travel : "—"}
          icon={<ShieldAlert size={18} />}
          className="bg-red-50 text-red-800"
        />

        <SummaryCard
          label="Severe"
          value={result ? counts.severe : "—"}
          icon={<Wind size={18} />}
          className="bg-orange-50 text-orange-800"
        />

        <SummaryCard
          label="High risk"
          value={result ? counts.high : "—"}
          icon={<CloudRain size={18} />}
          className="bg-amber-50 text-amber-800"
        />
      </div>

      {/* Alerts panel */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-semibold text-slate-900">
                Weather alerts
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Sorted by severity, with the highest-priority alerts first.
              </p>
            </div>

            <button
              type="button"
              onClick={acknowledgeAll}
              disabled={
                filteredAlerts.length === 0 ||
                filteredAlerts.every((a) =>
                  acknowledged.includes(a.id),
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCheck size={16} />
              Acknowledge visible
            </button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Filter size={14} />
                Severity
              </span>

              {(
                [
                  ["all", "All alerts"],
                  ["no_travel", "No travel"],
                  ["severe", "Severe"],
                  ["high", "High"],
                ] as [FilterValue, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    filter === value
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                  {result && (
                    <span className="ml-1.5 opacity-70">
                      {counts[value]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={showAcknowledged}
                onChange={(event) =>
                  setShowAcknowledged(event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 accent-slate-900"
              />
              Show acknowledged
            </label>
          </div>
        </div>

        {!result ? (
          <EmptyState
            title="No route analysis available"
            description="Plan a route first. Alerts will be generated from its checkpoint weather assessments."
          />
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            title={
              alerts.length === 0
                ? "No elevated-risk checkpoints"
                : "No alerts match these filters"
            }
            description={
              alerts.length === 0
                ? "The current route results contain no high, severe, or no-travel checkpoint classifications."
                : "Change the severity filter or enable acknowledged alerts to see more results."
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAlerts.map((alert) => {
              const config = severityConfig[alert.severity];
              const isAcknowledged = acknowledged.includes(alert.id);
              const isExpanded = expandedAlerts.includes(alert.id);

              return (
                <article
                  key={alert.id}
                  className={`p-4 transition-colors sm:p-5 ${
                    isAcknowledged ? "bg-slate-50/60" : "bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.icon}`}
                    >
                      {alert.severity === "no_travel" ? (
                        <ShieldAlert size={19} />
                      ) : (
                        <AlertTriangle size={19} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md border px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${config.badge}`}
                        >
                          {config.label}
                        </span>

                        {isAcknowledged && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                            <Check size={12} />
                            Reviewed
                          </span>
                        )}
                      </div>

                      <h4 className="mt-2 wrap-break-words text-sm font-semibold text-slate-900">
                        {alert.severity === "no_travel"
                          ? "No-travel conditions detected"
                          : alert.severity === "severe"
                            ? "Severe weather exposure"
                            : "High weather risk detected"}
                      </h4>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Route {alert.routeRank} ·{" "}
                        {alert.distance.toFixed(1)} miles from start
                      </p>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <WeatherValue
                          icon={<Wind size={14} />}
                          label="Wind"
                          value={`${alert.wind.toFixed(1)} mph`}
                        />
                        <WeatherValue
                          icon={<CloudRain size={14} />}
                          label="Rain"
                          value={`${alert.rain.toFixed(3)} in/hr`}
                        />
                        <WeatherValue
                          icon={<CloudRain size={14} />}
                          label="Snow"
                          value={`${alert.snow.toFixed(3)} in/hr`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleExpanded(alert.id)}
                        aria-expanded={isExpanded}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800"
                      >
                        {isExpanded ? (
                          <>
                            Hide details <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                            View alert details <ChevronDown size={14} />
                          </>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                          <p className="text-xs font-semibold text-slate-700">
                            Contributing risk factors
                          </p>

                          <ul className="mt-2 space-y-1.5">
                            {alert.reasons.map((reason) => (
                              <li
                                key={reason}
                                className="flex items-start gap-2 text-xs leading-5 text-slate-600"
                              >
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                                {reason}
                              </li>
                            ))}
                          </ul>

                          <div className="mt-3 flex items-start gap-2 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
                            <Clock3
                              size={14}
                              className="mt-0.5 shrink-0"
                            />
                            <span>
                              Estimated checkpoint time:{" "}
                              <strong className="font-medium text-slate-700">
                                {formatETA(alert.eta)}
                              </strong>
                            </span>
                          </div>

                          <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-500">
                            <MapPin
                              size={14}
                              className="mt-0.5 shrink-0"
                            />
                            Checkpoint ID: {alert.checkpointId}
                          </p>

                          {alert.severity === "no_travel" && (
                            <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs font-medium leading-5 text-red-800">
                              Do not dispatch solely on this dashboard's
                              recommendation. Review current conditions
                              and follow your organization's safety
                              procedures.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleAcknowledged(alert.id)}
                      aria-label={
                        isAcknowledged
                          ? "Mark alert as unreviewed"
                          : "Acknowledge alert"
                      }
                      title={
                        isAcknowledged
                          ? "Mark as unreviewed"
                          : "Acknowledge alert"
                      }
                      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition ${
                        isAcknowledged
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Check size={14} />
                      <span className="hidden sm:inline">
                        {isAcknowledged ? "Reviewed" : "Acknowledge"}
                      </span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <p className="text-[11px] leading-5 text-slate-500">
            Alerts are derived from the current route-plan response.
            Acknowledgements are temporary and reset when this component
            is remounted or the page is refreshed. They do not represent
            a live emergency-monitoring service.
          </p>
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  className: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <span className={`rounded-lg p-2 ${className}`}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function WeatherValue({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
      <span className="text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <ShieldAlert size={21} />
      </span>
      <h4 className="mt-3 text-sm font-semibold text-slate-800">
        {title}
      </h4>
      <p className="mt-1.5 max-w-md text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}