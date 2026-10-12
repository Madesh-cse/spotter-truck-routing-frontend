"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ArrowRight,
  CloudRain,
  CloudSun,
  Route as RouteIcon,
  Snowflake,
  Wind,
} from "lucide-react";

import { useSavedRoutePlan } from "@/lib/routePlanStore";
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

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

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
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${riskStyles[key]}`}
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
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        {icon}
      </div>
      <div>
        <p className={eyebrow}>{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
          {value}
          <span className="ml-1 text-xs font-medium text-slate-500">
            {unit}
          </span>
        </p>
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

  const alerts = useMemo(() => {
    if (!route) return [];
    return route.checkpoints
      .filter((c) => (riskRank[c.risk.overall_risk] ?? 1) > 0)
      .sort(
        (a, b) =>
          (riskRank[b.risk.overall_risk] ?? 1) -
            (riskRank[a.risk.overall_risk] ?? 1) ||
          a.distance_from_start_miles - b.distance_from_start_miles,
      );
  }, [route]);

  /* ---------- Empty state: no planned route yet ---------- */
  if (!saved || !result || !route) {
    return (
      <div className="mx-auto max-w-400">
        <h1 className="text-2xl font-semibold tracking-tight">
          Weather Risk Center
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Monitor weather conditions and route alerts.
        </p>

        <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <CloudSun size={26} />
          </div>
          <h2 className="text-base font-semibold">No planned route yet</h2>
          <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-500">
            Plan a route first. The Weather Risk Center shows live radar and the
            forecast conditions at each checkpoint of your latest route plan.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            Open route planner
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const checkpoints = route.checkpoints;
  const active =
    checkpoints.find((c) => c.checkpoint_id === checkpointId) ??
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
            Weather Risk Center
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor weather conditions and route alerts.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
        >
          <RouteIcon size={15} />
          Edit route plan
        </Link>
      </div>

      {/* Trip context from the route planner */}
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

      {/* Summary */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<AlertTriangle size={18} />}
          label="Active alerts"
          value={String(alerts.length)}
          unit={`of ${checkpoints.length} checkpoints`}
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Map column */}
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
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-24 cursor-pointer accent-blue-700"
                />
              </label>
            )}
          </div>

          {!OWM_ENABLED && (
            <p className="text-xs text-slate-500">
              Radar is live and free. Precipitation, wind, temperature and cloud
              layers need an OpenWeather key in{" "}
              <code className="rounded bg-slate-200 px-1">
                NEXT_PUBLIC_OPENWEATHER_API_KEY
              </code>
              .
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
        </div>

        {/* Side panel */}
        <div className="min-w-0 space-y-5">
          {active && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
              <div className="border-b border-slate-200 px-5 py-4">
                <p className={eyebrow}>Selected checkpoint</p>
                <h2 className="mt-1 text-sm font-semibold tabular-nums">
                  {active.distance_from_start_miles.toFixed(1)} mi from start
                </h2>
                <p className="mt-0.5 text-xs tabular-nums text-slate-500">
                  ETA {formatDateTime(active.eta)}
                </p>
              </div>

              <dl className="divide-y divide-slate-100 px-5 text-sm">
                {[
                  [
                    "Wind",
                    `${active.weather.wind_mph.toFixed(1)} mph`,
                    active.risk.wind_risk,
                  ],
                  [
                    "Precipitation",
                    `${active.weather.precipitation_in_hr.toFixed(3)} in/hr`,
                    active.risk.rain_risk,
                  ],
                  [
                    "Snowfall",
                    `${active.weather.snowfall_in_hr.toFixed(3)} in/hr`,
                    active.risk.snow_risk,
                  ],
                ].map(([label, value, risk]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="flex items-center gap-3">
                      <span className="font-semibold tabular-nums">
                        {value}
                      </span>
                      <RiskPill risk={risk} />
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-600">
                Overall risk
                <RiskPill risk={active.risk.overall_risk} />
              </div>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Route alerts</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Checkpoints above low risk, most severe first
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                {alerts.length}
              </span>
            </div>

            {alerts.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                No weather alerts. All checkpoints on this route are low risk.
              </p>
            ) : (
              <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
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
                      <div>
                        <p className="text-sm font-medium tabular-nums">
                          {checkpoint.distance_from_start_miles.toFixed(1)} mi
                        </p>
                        <p className="mt-0.5 text-xs tabular-nums text-slate-500">
                          {checkpoint.weather.wind_mph.toFixed(0)} mph wind ·{" "}
                          {formatDateTime(checkpoint.eta)}
                        </p>
                      </div>
                      <RiskPill risk={checkpoint.risk.overall_risk} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
