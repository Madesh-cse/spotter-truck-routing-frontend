
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  CloudRain,
  CloudSun,
  LoaderCircle,
  Route as RouteIcon,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Wind,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

import { useSavedRoutePlan } from "@/lib/routePlanStore";
import { askRouteAssistant } from "@/lib/api";
import type {
  RiskMetric,
  WeatherLayer,
} from "../../components/weather/WeatherMap";

const WeatherMap = dynamic(
  () => import("../../components/weather/WeatherMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-105 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
        Loading weather map...
      </div>
    ),
  },
);

const riskStyles: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  moderate: "bg-amber-50 text-amber-800 ring-amber-600/20",
  high: "bg-orange-50 text-orange-800 ring-orange-600/20",
  severe: "bg-red-50 text-red-700 ring-red-600/20",
  no_travel: "bg-red-700 text-white ring-red-800/30",
};

const riskRank: Record<string, number> = {
  low: 0,
  moderate: 1,
  high: 2,
  severe: 3,
  no_travel: 4,
};

const eyebrow =
  "text-[10px] font-semibold uppercase tracking-wider text-slate-500";

const OWM_ENABLED = Boolean(process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY);

function formatRisk(risk: string) {
  return risk.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getRiskExplanation(label: string, risk: string, value: string) {
  switch (risk) {
    case "no_travel":
      return `${label} is classified as No Travel by the backend. Treat this checkpoint as a route restriction and review it before dispatch.`;
    case "severe":
      return `${label} is classified as Severe by the backend. This checkpoint requires urgent review before the vehicle reaches it.`;
    case "high":
      return `${label} is classified as High risk by the backend. Review this condition and consider safer routing options.`;
    case "moderate":
      return `${label} is classified as Moderate risk by the backend. Monitor the forecast and reassess conditions near the estimated arrival time.`;
    case "low":
      return `${label} is classified as Low risk by the backend. The recorded measurement is ${value}.`;
    default:
      return `${label}: ${value}. The backend returned the risk classification "${risk}".`;
  }
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
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(date) + " UTC"
  );
}

function RiskPill({ risk, prefix }: { risk: string; prefix?: string }) {
  const key = riskStyles[risk] ? risk : "moderate";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${riskStyles[key]}`}
    >
      {prefix ? `${prefix}: ` : ""}
      {formatRisk(risk)}
    </span>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className={`${eyebrow} mb-1.5`}>{label}</p>

      <div
        role="group"
        aria-label={label}
        className="flex flex-wrap gap-1 rounded-lg bg-slate-200/70 p-1"
      >
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={option.disabled}
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 ${
              value === option.id
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        {icon}
      </div>

      <div className="min-w-0">
        <p className={eyebrow}>{label}</p>
        <p className="mt-1 wrap-break-words text-xl font-semibold tabular-nums text-slate-900">
          {value}
        </p>
        <p className="mt-0.5 text-xs font-medium text-slate-500">{unit}</p>
      </div>
    </div>
  );
}

export default function WeatherRiskCenterPage() {
  const saved = useSavedRoutePlan();

  const [routeId, setRouteId] = useState<string | null>(null);
  const [checkpointId, setCheckpointId] = useState<string | null>(null);
  const [layer, setLayer] = useState<WeatherLayer>("radar");
  const [metric, setMetric] = useState<RiskMetric>("overall");
  const [opacity, setOpacity] = useState(0.7);

  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const result = saved?.result ?? null;

  const route = useMemo(() => {
    if (!result) return null;

    return (
      result.routes.find((r) => r.route_id === routeId) ??
      result.routes.find((r) => r.route_id === result.recommended_route_id) ??
      result.routes[0] ??
      null
    );
  }, [result, routeId]);

  const checkpoints = route?.checkpoints ?? [];

  const alerts = useMemo(() => {
    if (!route) return [];

    return route.checkpoints
      .filter(
        (checkpoint) =>
          (riskRank[checkpoint.risk.overall_risk] ?? 1) > 0,
      )
      .sort(
        (a, b) =>
          (riskRank[b.risk.overall_risk] ?? 1) -
            (riskRank[a.risk.overall_risk] ?? 1) ||
          a.distance_from_start_miles - b.distance_from_start_miles,
      );
  }, [route]);

  const active =
    checkpoints.find(
      (checkpoint) => checkpoint.checkpoint_id === checkpointId,
    ) ??
    alerts[0] ??
    checkpoints[0] ??
    null;

  const maxWind = Math.max(0, ...checkpoints.map((c) => c.weather.wind_mph));

  const maxRain = Math.max(
    0,
    ...checkpoints.map((c) => c.weather.precipitation_in_hr),
  );

  const maxSnow = Math.max(
    0,
    ...checkpoints.map((c) => c.weather.snowfall_in_hr),
  );

  const noTravelCount = checkpoints.filter(
    (c) => c.risk.overall_risk === "no_travel",
  ).length;

  const severeCount = checkpoints.filter(
    (c) => c.risk.overall_risk === "severe",
  ).length;

  const highCount = checkpoints.filter(
    (c) => c.risk.overall_risk === "high",
  ).length;

  const moderateCount = checkpoints.filter(
    (c) => c.risk.overall_risk === "moderate",
  ).length;

  const overallRisk = checkpoints.reduce(
    (worst, checkpoint) =>
      (riskRank[checkpoint.risk.overall_risk] ?? 0) >
      (riskRank[worst] ?? 0)
        ? checkpoint.risk.overall_risk
        : worst,
    "low",
  );

  const layerOptions: {
    id: WeatherLayer;
    label: string;
    disabled?: boolean;
  }[] = [
    { id: "radar", label: "Radar" },
    { id: "precipitation", label: "Precip", disabled: !OWM_ENABLED },
    { id: "wind", label: "Wind", disabled: !OWM_ENABLED },
    { id: "temperature", label: "Temp", disabled: !OWM_ENABLED },
    { id: "clouds", label: "Clouds", disabled: !OWM_ENABLED },
    { id: "none", label: "Off" },
  ];

  async function generateAiSummary() {
    if (!result || !route || aiLoading) return;

    setAiLoading(true);
    setAiError(null);
    setAiSummary("");

    try {
      const selectedRouteData = {
        ...result,
        routes: [route],
        recommended_route_id: result.recommended_route_id,
        count: 1,
      };

      const response = await askRouteAssistant(
        "Summarize the weather risks for this selected route. Identify the highest-risk and no-travel checkpoints, explain the supplied weather measurements, and recommend next steps based only on the provided data. Format the answer using clear Markdown headings, short paragraphs, bullet points, bold labels, and numbered recommendations. Do not return one large paragraph.",
        selectedRouteData,
      );

      setAiSummary(response.answer);
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : "Unable to generate the AI weather risk summary.",
      );
    } finally {
      setAiLoading(false);
    }
  }

  if (!saved || !result || !route) {
    return (
      <div className="mx-auto max-w-400 antialiased">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Weather Risk Center
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          Monitor weather conditions, checkpoint risks, and route alerts.
        </p>

        <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <CloudSun size={26} />
          </div>

          <h2 className="text-base font-semibold text-slate-900">
            No planned route yet
          </h2>

          <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-500">
            Generate a route plan first. The Weather Risk Center uses its
            checkpoints, forecast measurements, and backend risk classifications
            to display route intelligence.
          </p>

          <Link
            href="/route-planner"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            Open route planner
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-400 antialiased">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Fleet operations <span className="mx-1 text-slate-300">/</span>
            <span className="text-slate-700">Weather Risk Center</span>
          </p>

          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">
            Weather Risk Intelligence
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Analyze checkpoint weather, identify hazardous sections, and review
            route-level risk.
          </p>
        </div>

        <Link
          href="/route-planner"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
        >
          <RouteIcon size={15} />
          Edit route plan
        </Link>
      </div>

      {/* Route context */}
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <span className="font-semibold">
          {saved.originLabel.split(",")[0]}
          <ArrowRight size={14} className="mx-1.5 inline text-blue-700" />
          {saved.destinationLabel.split(",")[0]}
        </span>

        <span className="text-xs">
          Departure{" "}
          <strong className="tabular-nums">
            {formatDateTime(result.departure_time)}
          </strong>
        </span>

        <span className="text-xs">
          Forecast{" "}
          <strong>
            {result.forecast_offset_hours === 0
              ? "at departure"
              : `+${result.forecast_offset_hours}h`}
          </strong>
        </span>

        <span className="text-xs">
          Load{" "}
          <strong className="tabular-nums">
            {result.load_weight_lb.toLocaleString()} lb
          </strong>
        </span>

        <span className="text-xs">
          Checkpoints every <strong>{saved.intervalMiles} mi</strong>
        </span>
      </div>

      {/* Risk overview */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          icon={<AlertTriangle size={18} />}
          label="Active alerts"
          value={String(alerts.length)}
          unit={`of ${checkpoints.length} checkpoints`}
        />

        <Stat
          icon={<ShieldCheck size={18} />}
          label="Highest route risk"
          value={formatRisk(overallRisk)}
          unit="worst checkpoint"
        />

        <Stat
          icon={<Wind size={18} />}
          label="Peak wind"
          value={maxWind.toFixed(1)}
          unit="mph"
        />

        <Stat
          icon={<CloudRain size={18} />}
          label="Peak precipitation"
          value={maxRain.toFixed(3)}
          unit="in/hr"
        />

        <Stat
          icon={<Snowflake size={18} />}
          label="Peak snowfall"
          value={maxSnow.toFixed(3)}
          unit="in/hr"
        />
      </div>

      {/* High-risk and no-travel alert */}
      {alerts.length > 0 && (
        <section
          className={`mb-5 rounded-xl border p-4 ${
            noTravelCount > 0
              ? "border-red-300 bg-red-50"
              : severeCount > 0
                ? "border-orange-300 bg-orange-50"
                : highCount > 0
                  ? "border-amber-300 bg-amber-50"
                  : "border-slate-200 bg-slate-50"
          }`}
          role="status"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`mt-0.5 shrink-0 ${
                noTravelCount > 0
                  ? "text-red-700"
                  : severeCount > 0
                    ? "text-orange-700"
                    : "text-amber-700"
              }`}
              size={20}
            />

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-slate-900">
                {noTravelCount > 0
                  ? "No-travel checkpoints detected"
                  : severeCount > 0
                    ? "Severe weather risk detected"
                    : highCount > 0
                      ? "High-risk checkpoints detected"
                      : "Moderate-risk checkpoints detected"}
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-700">
                This route has {noTravelCount} no-travel, {severeCount} severe,{" "}
                {highCount} high-risk, and {moderateCount} moderate-risk
                checkpoints. Select an alert to inspect its recorded weather
                conditions and risk classification.
              </p>

              {noTravelCount > 0 && (
                <p className="mt-2 text-sm font-medium text-red-800">
                  Review the no-travel checkpoints before dispatch. The route
                  should not be treated as safe for passage through those
                  locations.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* AI Weather Risk Summary */}
      <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Sparkles size={21} />
            </div>

            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                Spotter AI Analysis
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Weather intelligence for your selected route
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={generateAiSummary}
            disabled={aiLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {aiLoading ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {aiLoading ? "Analyzing route..." : aiSummary ? "Regenerate analysis" : "Generate AI summary"}
          </button>
        </div>

        <div className="px-5 py-6 sm:px-7">
          {!aiSummary && !aiError && !aiLoading && (
            <div className="mx-auto max-w-xl py-7 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
                <Bot size={25} />
              </div>

              <h3 className="text-base font-semibold text-slate-900">
                Understand your route at a glance
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Get an AI-generated breakdown of checkpoint risks, weather
                measurements, critical locations, and practical next steps.
              </p>
            </div>
          )}

          {aiLoading && (
            <div
              role="status"
              className="mx-auto flex max-w-xl items-center gap-3 py-10"
            >
              <LoaderCircle
                size={21}
                className="shrink-0 animate-spin text-emerald-600"
              />
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Analyzing your route
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Reviewing checkpoint classifications and available weather
                  measurements...
                </p>
              </div>
            </div>
          )}

          {aiError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
            >
              <AlertTriangle
                size={19}
                className="mt-0.5 shrink-0 text-red-600"
              />
              <div>
                <p className="text-sm font-semibold text-red-900">
                  Unable to generate summary
                </p>
                <p className="mt-1 text-sm leading-6 text-red-800">
                  {aiError}
                </p>
                <p className="mt-2 text-xs leading-5 text-red-700">
                  Check your backend status, OpenAI configuration, and API logs.
                </p>
              </div>
            </div>
          )}

          {aiSummary && !aiLoading && (
            <article className="mx-auto max-w-4xl text-[15px] leading-7 text-slate-700">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h2 className="mb-4 mt-2 text-xl font-semibold tracking-tight text-slate-950">
                      {children}
                    </h2>
                  ),

                  h2: ({ children }) => (
                    <h2 className="mb-3 mt-8 border-b border-slate-100 pb-2 text-lg font-semibold tracking-tight text-slate-900 first:mt-0">
                      {children}
                    </h2>
                  ),

                  h3: ({ children }) => (
                    <h3 className="mb-2 mt-5 text-base font-semibold text-slate-900">
                      {children}
                    </h3>
                  ),

                  p: ({ children }) => (
                    <p className="mb-4 leading-7 text-slate-700 last:mb-0">
                      {children}
                    </p>
                  ),

                  ul: ({ children }) => (
                    <ul className="mb-5 mt-2 list-disc space-y-2.5 pl-6 marker:text-emerald-600">
                      {children}
                    </ul>
                  ),

                  ol: ({ children }) => (
                    <ol className="mb-5 mt-2 list-decimal space-y-3 pl-6 marker:font-semibold marker:text-emerald-700">
                      {children}
                    </ol>
                  ),

                  li: ({ children }) => (
                    <li className="ps-1 leading-7 text-slate-700">
                      {children}
                    </li>
                  ),

                  strong: ({ children }) => (
                    <strong className="font-semibold text-slate-950">
                      {children}
                    </strong>
                  ),

                  em: ({ children }) => (
                    <em className="text-slate-600">{children}</em>
                  ),

                  blockquote: ({ children }) => (
                    <blockquote className="my-5 border-l-4 border-emerald-500 bg-emerald-50/60 px-4 py-3 text-slate-700">
                      {children}
                    </blockquote>
                  ),

                  hr: () => (
                    <hr className="my-6 border-slate-200" />
                  ),

                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900"
                    >
                      {children}
                    </a>
                  ),

                  code: ({ children }) => (
                    <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800">
                      {children}
                    </code>
                  ),
                }}
              >
                {aiSummary}
              </ReactMarkdown>

              <div className="mt-8 flex items-start gap-2.5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
                <ShieldCheck
                  size={15}
                  className="mt-0.5 shrink-0 text-emerald-700"
                />
                <p>
                  This analysis is based on the route data provided to Spotter
                  AI. Verify current weather and road conditions before
                  dispatch. AI recommendations do not replace backend risk
                  classifications or operational safety procedures.
                </p>
              </div>
            </article>
          )}
        </div>
      </section>

      {/* Map and checkpoint details */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Weather map */}
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
            <Segmented
              label="Weather layer"
              value={layer}
              onChange={setLayer}
              options={layerOptions}
            />

            <Segmented
              label="Checkpoint colour"
              value={metric}
              onChange={setMetric}
              options={[
                { id: "overall", label: "Overall" },
                { id: "wind", label: "Wind" },
                { id: "rain", label: "Rain" },
                { id: "snow", label: "Snow" },
              ]}
            />

            {result.routes.length > 1 && (
              <Segmented
                label="Route"
                value={route.route_id}
                onChange={(id) => {
                  setRouteId(id);
                  setCheckpointId(null);
                  setAiSummary("");
                  setAiError(null);
                }}
                options={result.routes.map((r) => ({
                  id: r.route_id,
                  label: `Route ${r.risk_summary.rank}`,
                }))}
              />
            )}

            {layer !== "none" && (
              <label className="ml-auto flex items-center gap-2 text-xs text-slate-600">
                Opacity
                <input
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.1}
                  value={opacity}
                  onChange={(event) => setOpacity(Number(event.target.value))}
                  className="w-24 cursor-pointer accent-blue-700"
                />
              </label>
            )}
          </div>

          {!OWM_ENABLED && (
            <p className="text-xs leading-5 text-slate-500">
              Additional OpenWeather precipitation, wind, temperature, and cloud
              layers require{" "}
              <code className="rounded bg-slate-200 px-1">
                NEXT_PUBLIC_OPENWEATHER_API_KEY
              </code>
              . Available map layers depend on your WeatherMap implementation
              and configured providers.
            </p>
          )}

          <WeatherMap
            routes={result.routes}
            selectedRouteId={route.route_id}
            selectedCheckpointId={active?.checkpoint_id ?? null}
            focus={active ? [active.latitude, active.longitude] : null}
            layer={layer}
            metric={metric}
            opacity={opacity}
            onSelectCheckpoint={setCheckpointId}
            onLayerChange={setLayer}
          />

          {/* Risk legend */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Risk classification
            </h2>

            <div className="mt-3 flex flex-wrap gap-2">
              {(
                ["low", "moderate", "high", "severe", "no_travel"] as const
              ).map((risk) => (
                <RiskPill key={risk} risk={risk} />
              ))}
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              Risk levels are supplied by the route-planning backend. Weather
              overlays show map-layer data and may not represent the exact
              forecast at every checkpoint.
            </p>
          </section>
        </div>

        {/* Checkpoint intelligence */}
        <aside className="min-w-0 space-y-5">
          {active && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
              <div className="border-b border-slate-200 px-5 py-4">
                <p className={eyebrow}>Selected checkpoint</p>

                <div className="mt-2 flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold tabular-nums text-slate-900">
                    {active.distance_from_start_miles.toFixed(1)} mi
                    <span className="ml-1 text-sm font-normal text-slate-500">
                      from start
                    </span>
                  </h2>

                  <RiskPill risk={active.risk.overall_risk} />
                </div>

                <p className="mt-1 text-xs tabular-nums text-slate-500">
                  ETA {formatDateTime(active.eta)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Checkpoint ID: {active.checkpoint_id}
                </p>
              </div>

              <dl className="divide-y divide-slate-100 px-5 text-sm">
                {[
                  {
                    label: "Wind",
                    value: `${active.weather.wind_mph.toFixed(1)} mph`,
                    risk: active.risk.wind_risk,
                  },
                  {
                    label: "Precipitation",
                    value: `${active.weather.precipitation_in_hr.toFixed(3)} in/hr`,
                    risk: active.risk.rain_risk,
                  },
                  {
                    label: "Snowfall",
                    value: `${active.weather.snowfall_in_hr.toFixed(3)} in/hr`,
                    risk: active.risk.snow_risk,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <dt className="text-slate-500">{item.label}</dt>
                    <dd className="flex flex-wrap items-center justify-end gap-2">
                      <span className="font-semibold tabular-nums text-slate-900">
                        {item.value}
                      </span>
                      <RiskPill risk={item.risk} />
                    </dd>
                  </div>
                ))}
              </dl>

              {/* Checkpoint explanations */}
              <div className="space-y-3 border-t border-slate-100 px-5 py-4">
                <h3 className={eyebrow}>Checkpoint risk assessment</h3>

                {[
                  {
                    label: "Wind",
                    risk: active.risk.wind_risk,
                    value: `${active.weather.wind_mph.toFixed(1)} mph`,
                  },
                  {
                    label: "Rain",
                    risk: active.risk.rain_risk,
                    value: `${active.weather.precipitation_in_hr.toFixed(3)} in/hr`,
                  },
                  {
                    label: "Snow",
                    risk: active.risk.snow_risk,
                    value: `${active.weather.snowfall_in_hr.toFixed(3)} in/hr`,
                  },
                ]
                  .filter((item) => item.risk !== "low")
                  .map((item) => (
                    <div key={item.label} className="text-sm">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-800">
                          {item.label}
                        </span>
                        <RiskPill risk={item.risk} />
                      </div>

                      <p className="text-xs leading-5 text-slate-600">
                        {getRiskExplanation(item.label, item.risk, item.value)}
                      </p>
                    </div>
                  ))}

                {[
                  active.risk.wind_risk,
                  active.risk.rain_risk,
                  active.risk.snow_risk,
                ].every((risk) => risk === "low") && (
                  <p className="text-sm leading-6 text-slate-600">
                    Wind, rain, and snow are all classified as low risk by the
                    backend at this checkpoint.
                  </p>
                )}

                {active.risk.overall_risk !== "low" && (
                  <div
                    className={`rounded-lg border p-3 ${
                      active.risk.overall_risk === "no_travel"
                        ? "border-red-200 bg-red-50"
                        : active.risk.overall_risk === "severe"
                          ? "border-orange-200 bg-orange-50"
                          : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-900">
                      Overall assessment:{" "}
                      {formatRisk(active.risk.overall_risk)}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-700">
                      This overall classification comes from the backend. Review
                      the component risks and the forecast near the estimated
                      arrival time.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-600">
                Overall risk
                <RiskPill risk={active.risk.overall_risk} />
              </div>
            </section>
          )}

          {/* Route alert list */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Route alerts
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Moderate and higher risk, most severe first
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                {alerts.length}
              </span>
            </div>

            {alerts.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm leading-6 text-slate-500">
                No elevated-risk checkpoints were returned for this route. All
                checkpoints are classified as low risk.
              </p>
            ) : (
              <ul className="max-h-105 divide-y divide-slate-100 overflow-y-auto">
                {alerts.map((checkpoint) => (
                  <li key={checkpoint.checkpoint_id}>
                    <button
                      type="button"
                      onClick={() => setCheckpointId(checkpoint.checkpoint_id)}
                      aria-pressed={
                        checkpoint.checkpoint_id === active?.checkpoint_id
                      }
                      className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 ${
                        checkpoint.checkpoint_id === active?.checkpoint_id
                          ? "bg-blue-50/60"
                          : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium tabular-nums text-slate-900">
                          {checkpoint.distance_from_start_miles.toFixed(1)} mi
                        </p>

                        <p className="mt-0.5 text-xs tabular-nums text-slate-500">
                          {checkpoint.weather.wind_mph.toFixed(1)} mph wind ·{" "}
                          {formatDateTime(checkpoint.eta)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {checkpoint.checkpoint_id}
                        </p>
                      </div>

                      <RiskPill risk={checkpoint.risk.overall_risk} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Data source context */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
            <h2 className="text-sm font-semibold text-slate-900">
              Forecast context
            </h2>

            <p className="mt-2 text-xs leading-5 text-slate-600">
              Checkpoint measurements and risk classifications come from the
              saved route plan. The selected weather map overlay is a separate
              visualization layer.
            </p>

            <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500">
              <ShieldCheck size={15} className="mt-0.5 shrink-0" />
              <p>
                Use backend risk classifications for route review. Do not assume
                missing forecast information means conditions are safe.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
