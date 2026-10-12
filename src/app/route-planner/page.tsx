
"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  ChevronDown,
  CloudSun,
  Clock3,
  CloudRain,
  Gauge,
  LoaderCircle,
  MapPin,
  Navigation,
  Route as RouteIcon,
  ShieldCheck,
  SlidersHorizontal,
  Snowflake,
  Truck,
  Weight,
  Wind,
} from "lucide-react";
import dynamic from "next/dynamic";

import { createRoutePlan } from "@/lib/api";
import LocationAutocomplete, {
  type LocationSuggestion,
} from "@/components/LocationAutocomplete";
import type { RoutePlanResponse } from "@/types/routes";
import FleetDashboard from "@/components/FleetDashboard";
import WeatherRiskAlertCenter from "@/components/WeatherRiskAlertCenter";
import { saveRoutePlan } from "@/lib/routePlanStore";

const RouteMap = dynamic(() => import("@/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-105 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
      Loading route map...
    </div>
  ),
});

type TabId = "overview" | "routes" | "fleet";

const riskStyles: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  moderate: "bg-amber-50 text-amber-800 ring-amber-600/20",
  high: "bg-orange-50 text-orange-800 ring-orange-600/20",
  severe: "bg-red-50 text-red-700 ring-red-600/20",
  no_travel: "bg-red-700 text-white ring-red-800/30",
};

const riskDots: Record<string, string> = {
  low: "bg-emerald-500",
  moderate: "bg-amber-500",
  high: "bg-orange-500",
  severe: "bg-red-500",
  no_travel: "bg-white",
};

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);

  return hours > 0 ? `${hours}h ${remaining}m` : `${remaining}m`;
}

function formatRisk(risk: string) {
  return risk.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return (
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(date) + " UTC"
  );
}

const eyebrow =
  "text-[10px] font-semibold uppercase tracking-wider text-slate-500";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none transition hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";

function RiskPill({
  risk,
  label,
  prefix,
}: {
  risk: string;
  label?: string;
  prefix?: string;
}) {
  const key = riskStyles[risk] ? risk : "moderate";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${riskStyles[key]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${riskDots[key]}`} />
      {prefix ? `${prefix}: ` : ""}
      {label ?? formatRisk(risk)}
    </span>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        {icon}
      </div>
      <div className="min-w-0">
        <p className={eyebrow}>{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
          {value}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "text-slate-900",
  icon,
}: {
  label: string;
  value: ReactNode;
  tone?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="px-5 py-3.5">
      <p className={eyebrow}>{label}</p>
      <p
        className={`mt-1.5 flex items-center gap-1.5 text-base font-semibold tabular-nums ${tone}`}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [origin, setOrigin] = useState<LocationSuggestion | null>({
    label: "Manali, Himachal Pradesh, India",
    latitude: 32.2432,
    longitude: 77.1892,
  });

  const [destination, setDestination] = useState<LocationSuggestion | null>({
    label: "Leh, Ladakh, India",
    latitude: 34.1526,
    longitude: 77.5771,
  });

  const [departure, setDeparture] = useState("2026-10-11T08:00");
  const [loadWeight, setLoadWeight] = useState("35000");
  const [interval, setInterval] = useState<10 | 25 | 50>(10);
  const [forecastOffsetHours, setForecastOffsetHours] = useState(0);

  const [result, setResult] = useState<RoutePlanResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");

  const previewForecastTime = departure
    ? new Date(
        new Date(departure).getTime() + forecastOffsetHours * 60 * 60 * 1000,
      )
    : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      if (!origin || !destination) {
        throw new Error(
          "Select a valid starting point and destination from the suggestions.",
        );
      }

      if (!Number.isFinite(Number(loadWeight)) || loadWeight.trim() === "") {
        throw new Error("Enter a valid cargo load.");
      }

      if (Number(loadWeight) < 0 || Number(loadWeight) > 100000) {
        throw new Error("Load weight must be between 0 and 100,000 lb.");
      }

      if (!departure || Number.isNaN(new Date(departure).getTime())) {
        throw new Error("Select a valid departure date and time.");
      }

      if (
        origin.latitude === destination.latitude &&
        origin.longitude === destination.longitude
      ) {
        throw new Error(
          "Starting point and destination must be different locations.",
        );
      }

      const response = await createRoutePlan({
        origin: {
          latitude: origin.latitude,
          longitude: origin.longitude,
        },
        destination: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
        departure_time: new Date(departure).toISOString(),
        forecast_offset_hours: forecastOffsetHours,
        checkpoint_interval_miles: interval,
        load_weight_lb: Number(loadWeight),
      });

      setResult(response);

      saveRoutePlan({
        result: response,
        originLabel: origin.label,
        destinationLabel: destination.label,
        intervalMiles: interval,
        savedAt: new Date().toISOString(),
      });

      setTab("overview");
      setSelectedRouteId(
        response.recommended_route_id ?? response.routes[0]?.route_id ?? null,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to plan this route.",
      );
    } finally {
      setLoading(false);
    }
  }

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "routes", label: "Route details", count: result?.routes.length },
    { id: "fleet", label: "Fleet & alerts" },
  ];

  return (
    <div className="mx-auto max-w-400 antialiased">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Fleet operations <span className="mx-1 text-slate-300">/</span>
            <span className="text-slate-700">Route planner</span>
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">
            Route risk planner
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Compare truck routes using forecast weather, cargo weight, and
            checkpoint-level road risk.
          </p>
        </div>

        {result && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-xs">
            <Clock3 size={14} className="text-blue-700" />
            <span className="text-slate-500">Analysis time</span>
            <span className="font-semibold tabular-nums text-slate-900">
              {formatDateTime(result.departure_time)}
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="h-fit xl:sticky xl:top-24">
          <Panel
            title="Trip configuration"
            description="Set the journey and cargo"
            action={
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Navigation size={16} />
              </div>
            }
          >
            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div className="space-y-2">
                <LocationAutocomplete
                  label="Starting point"
                  placeholder="Search city, address, or place..."
                  value={origin}
                  onChange={setOrigin}
                />

                <div className="flex justify-center text-slate-400">
                  <ArrowDown size={16} />
                </div>

                <LocationAutocomplete
                  label="Destination"
                  placeholder="Search destination..."
                  value={destination}
                  onChange={setDestination}
                />
              </div>

              <div className="grid gap-4 border-t border-slate-100 pt-5">
                <label className="block text-sm font-medium text-slate-700">
                  Departure date and time
                  <input
                    required
                    type="datetime-local"
                    value={departure}
                    onChange={(event) => setDeparture(event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Cargo load (lb)
                  <input
                    required
                    type="number"
                    min="0"
                    max="100000"
                    step="any"
                    value={loadWeight}
                    onChange={(event) => setLoadWeight(event.target.value)}
                    className={`${fieldClass} tabular-nums`}
                  />
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    Used to evaluate load-related wind risk.
                  </span>
                </label>
              </div>

              <details className="group/adv rounded-lg border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <SlidersHorizontal size={15} className="text-slate-500" />
                    Advanced options
                  </span>
                  <span className="flex items-center gap-2 text-xs tabular-nums text-slate-500">
                    {forecastOffsetHours === 0
                      ? "Now"
                      : `+${forecastOffsetHours}h`}{" "}
                    · {interval} mi
                    <ChevronDown
                      size={15}
                      className="transition group-open/adv:rotate-180"
                    />
                  </span>
                </summary>

                <div className="space-y-5 border-t border-slate-200 p-4">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor="forecast-offset"
                        className="text-sm font-medium text-slate-700"
                      >
                        Forecast horizon
                      </label>

                      <span className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold tabular-nums text-white">
                        {forecastOffsetHours === 0
                          ? "Departure time"
                          : `+${forecastOffsetHours} hours`}
                      </span>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Analyze checkpoint weather and route risk at a future time
                      relative to your selected departure.
                    </p>

                    <input
                      id="forecast-offset"
                      type="range"
                      min={0}
                      max={48}
                      step={1}
                      value={forecastOffsetHours}
                      onChange={(event) =>
                        setForecastOffsetHours(Number(event.target.value))
                      }
                      aria-label="Forecast offset in hours"
                      aria-valuetext={`${forecastOffsetHours} hours after selected departure`}
                      className="mt-4 w-full cursor-pointer accent-blue-700"
                    />

                    <div className="mt-1 flex justify-between text-xs tabular-nums text-slate-400">
                      <span>0h</span>
                      <span>12h</span>
                      <span>24h</span>
                      <span>36h</span>
                      <span>48h</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                      <p className="text-xs text-slate-500">Forecast time</p>
                      <p className="text-xs font-medium tabular-nums text-slate-900">
                        {!mounted
                          ? "Loading forecast time..."
                          : previewForecastTime &&
                              !Number.isNaN(previewForecastTime.getTime())
                            ? formatDateTime(previewForecastTime.toISOString())
                            : "Select a departure time"}
                      </p>
                    </div>
                  </div>

                  <fieldset>
                    <legend className="mb-1.5 text-sm font-medium text-slate-700">
                      Checkpoint interval
                    </legend>

                    <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-200/70 p-1">
                      {([10, 25, 50] as const).map((miles) => (
                        <button
                          key={miles}
                          type="button"
                          onClick={() => setInterval(miles)}
                          aria-pressed={interval === miles}
                          className={`rounded-md px-2 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-blue-600 ${
                            interval === miles
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {miles} mi
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </details>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Analyzing routes...
                  </>
                ) : (
                  <>
                    <RouteIcon size={16} />
                    Find safer routes
                  </>
                )}
              </button>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  <div className="mb-0.5 flex items-center gap-2 font-semibold">
                    <AlertTriangle size={16} />
                    Route planning failed
                  </div>
                  {error}
                </div>
              )}
            </form>
          </Panel>
        </aside>

        <section className="min-w-0 space-y-5">
          {!result && !loading && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8">
              <div className="mx-auto flex max-w-xl flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <MapPin size={26} />
                </div>

                <h3 className="text-base font-semibold">
                  No route analysis yet
                </h3>

                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  Enter trip details and select Find safer routes to compare
                  alternatives and checkpoint weather risk.
                </p>
              </div>

              <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: <RouteIcon size={16} />,
                    title: "Compare routes",
                    text: "Alternatives ranked by safety, then duration.",
                  },
                  {
                    icon: <CloudSun size={16} />,
                    title: "Forecast weather",
                    text: "Checkpoint wind, rain and snow up to 48 hours ahead.",
                  },
                  {
                    icon: <ShieldCheck size={16} />,
                    title: "Load-aware risk",
                    text: "Cargo weight factors into wind risk scoring.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-blue-700 shadow-xs">
                      {item.icon}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="space-y-5" aria-busy="true">
              <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                <LoaderCircle
                  size={18}
                  className="animate-spin text-blue-700"
                />
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Analyzing your journey
                  </p>
                  <p className="text-xs text-blue-800">
                    Retrieving routes and checkpoint forecasts...
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <SkeletonBlock className="h-24" />
                <SkeletonBlock className="h-24" />
                <SkeletonBlock className="h-24" />
              </div>

              <SkeletonBlock className="h-105" />
            </div>
          )}

          {result && (
            <>
              <div
                role="tablist"
                aria-label="Route analysis sections"
                className="flex gap-1 border-b border-slate-200"
              >
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    id={`tab-${item.id}`}
                    aria-selected={tab === item.id}
                    aria-controls={`panel-${item.id}`}
                    onClick={() => setTab(item.id)}
                    className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-blue-600 ${
                      tab === item.id
                        ? "border-blue-700 text-blue-700"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {item.label}
                    {item.count !== undefined && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                          tab === item.id
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {tab === "overview" && (
                <div
                  role="tabpanel"
                  id="panel-overview"
                  aria-labelledby="tab-overview"
                  className="space-y-5"
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Kpi
                      icon={<RouteIcon size={18} />}
                      label="Routes returned"
                      value={result.count}
                      hint="From routing provider"
                    />
                    <Kpi
                      icon={<Gauge size={18} />}
                      label="Checkpoints"
                      value={result.routes.reduce(
                        (sum, route) => sum + route.checkpoints.length,
                        0,
                      )}
                      hint="Across returned routes"
                    />
                    <Kpi
                      icon={<Weight size={18} />}
                      label="Load weight"
                      value={`${result.load_weight_lb.toLocaleString()} lb`}
                      hint="Used for risk classification"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-900">
                    <span className="flex items-center gap-2 font-medium">
                      <Clock3 size={14} className="text-blue-700" />
                      {result.forecast_offset_hours === 0
                        ? "Forecast uses the selected departure time"
                        : `Forecast ${result.forecast_offset_hours} hours after the selected departure`}
                    </span>
                    <span className="tabular-nums">
                      {formatDateTime(result.departure_time)}
                    </span>
                  </div>

                  {result.warning && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                      {result.warning}
                    </div>
                  )}

                  <RouteMap
                    routes={result.routes}
                    recommendedRouteId={result.recommended_route_id}
                    selectedRouteId={selectedRouteId}
                    onSelectRoute={setSelectedRouteId}
                  />
                </div>
              )}

              {tab === "routes" && (
                <div
                  role="tabpanel"
                  id="panel-routes"
                  aria-labelledby="tab-routes"
                >
                  <div className="mb-3">
                    <h3 className="text-base font-semibold">
                      Route risk details
                    </h3>
                    <p className="text-sm text-slate-500">
                      Ranked by safety risk, then travel duration
                    </p>
                  </div>

                  {result.routes.length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
                      The routing provider returned no routes.
                    </div>
                  )}

                  <div className="space-y-4">
                    {result.routes.map((route) => {
                      const summary = route.risk_summary;
                      const isRecommended =
                        route.route_id === result.recommended_route_id;
                      const isSelected = route.route_id === selectedRouteId;

                      const headline = summary.has_no_travel
                        ? { risk: "no_travel", label: "No travel" }
                        : summary.severe_miles > 0
                          ? { risk: "severe", label: "Severe risk" }
                          : summary.high_miles > 0
                            ? { risk: "high", label: "High risk" }
                            : { risk: "low", label: "No severe/high risk" };

                      return (
                        <article
                          key={route.route_id}
                          className={`group overflow-hidden rounded-xl border bg-white shadow-sm shadow-slate-200/50 transition ${
                            isSelected
                              ? "border-blue-600 ring-1 ring-blue-600/30"
                              : "border-slate-200"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                <Truck size={18} />
                              </div>

                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-semibold">
                                    Route {summary.rank}
                                  </h4>

                                  {isRecommended && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                      <CheckCircle2 size={12} />
                                      Recommended
                                    </span>
                                  )}

                                  {summary.has_no_travel && (
                                    <RiskPill
                                      risk="no_travel"
                                      label="No travel"
                                    />
                                  )}
                                </div>

                                <p className="mt-0.5 font-mono text-xs text-slate-400">
                                  ID: {route.route_id}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {!summary.has_no_travel && (
                                <RiskPill
                                  risk={headline.risk}
                                  label={headline.label}
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRouteId(route.route_id);
                                  setTab("overview");
                                }}
                                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
                              >
                                <MapPin size={13} />
                                Show on map
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
                            <Metric
                              label="Distance"
                              value={`${route.distance_miles.toFixed(1)} mi`}
                            />
                            <Metric
                              label="Duration"
                              icon={
                                <Clock3 size={14} className="text-slate-400" />
                              }
                              value={formatDuration(route.duration_minutes)}
                            />
                            <Metric
                              label="Severe miles"
                              tone="text-red-700"
                              value={`${summary.severe_miles.toFixed(1)} mi`}
                            />
                            <Metric
                              label="High-risk miles"
                              tone="text-orange-700"
                              value={`${summary.high_miles.toFixed(1)} mi`}
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-xs text-slate-600">
                            <span>
                              Average risk score:{" "}
                              <strong className="tabular-nums text-slate-900">
                                {summary.average_risk.toFixed(2)}
                              </strong>
                            </span>
                            <span>
                              <strong className="tabular-nums text-slate-900">
                                {route.checkpoints.length}
                              </strong>{" "}
                              checkpoints
                            </span>
                          </div>

                          <details className="group/details border-t border-slate-200">
                            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-medium text-blue-700 hover:bg-slate-50 hover:text-blue-900 [&::-webkit-details-marker]:hidden">
                              View checkpoint weather and risk
                              <ChevronDown
                                size={16}
                                className="transition group-open/details:rotate-180"
                              />
                            </summary>

                            <div className="overflow-x-auto border-t border-slate-100">
                              <div className="min-w-180">
                                <div
                                  className={`grid grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_1.6fr] gap-3 bg-slate-50 px-5 py-2 ${eyebrow}`}
                                >
                                  <span>Checkpoint</span>
                                  <span>Wind</span>
                                  <span>Precipitation</span>
                                  <span>Snowfall</span>
                                  <span>Risk</span>
                                </div>

                                {route.checkpoints.map((checkpoint) => (
                                  <div
                                    key={checkpoint.checkpoint_id}
                                    className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_1.6fr] items-center gap-3 border-t border-slate-100 px-5 py-3 text-sm transition hover:bg-slate-50/70"
                                  >
                                    <div>
                                      <p className="font-medium tabular-nums">
                                        {checkpoint.distance_from_start_miles.toFixed(
                                          1,
                                        )}{" "}
                                        mi from start
                                      </p>
                                      <p className="mt-0.5 text-xs tabular-nums text-slate-500">
                                        ETA: {formatDateTime(checkpoint.eta)}
                                      </p>
                                    </div>

                                    <p className="flex items-center gap-1.5 tabular-nums">
                                      <Wind
                                        size={15}
                                        className="text-slate-400"
                                      />
                                      {checkpoint.weather.wind_mph.toFixed(1)}{" "}
                                      mph
                                    </p>

                                    <p className="flex items-center gap-1.5 tabular-nums">
                                      <CloudRain
                                        size={15}
                                        className="text-slate-400"
                                      />
                                      {checkpoint.weather.precipitation_in_hr.toFixed(
                                        3,
                                      )}{" "}
                                      in/hr
                                    </p>

                                    <p className="flex items-center gap-1.5 tabular-nums">
                                      <Snowflake
                                        size={15}
                                        className="text-slate-400"
                                      />
                                      {checkpoint.weather.snowfall_in_hr.toFixed(
                                        3,
                                      )}{" "}
                                      in/hr
                                    </p>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <RiskPill
                                        risk={checkpoint.risk.overall_risk}
                                        label={`Overall ${formatRisk(
                                          checkpoint.risk.overall_risk,
                                        )}`}
                                      />
                                      {[
                                        ["Wind", checkpoint.risk.wind_risk],
                                        ["Rain", checkpoint.risk.rain_risk],
                                        ["Snow", checkpoint.risk.snow_risk],
                                      ].map(([label, risk]) => (
                                        <RiskPill
                                          key={label}
                                          risk={risk}
                                          prefix={label}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </details>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}

              {tab === "fleet" && (
                <div
                  role="tabpanel"
                  id="panel-fleet"
                  aria-labelledby="tab-fleet"
                  className="space-y-5"
                >
                  <FleetDashboard result={result} loading={loading} />
                  <WeatherRiskAlertCenter result={result} />
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
