"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Route as RouteIcon } from "lucide-react";

import type { PlannedRoute } from "@/types/routes";
import { useSavedRoutePlan } from "@/lib/routePlanStore";
import {
  type Checkpoint,
  checkpointsToCsv,
  downloadCsv,
  getEtaMs,
  riskOf,
  riskRank,
} from "@/lib/Checkpointutils";

import CheckpointStats from "@/components/checkpoints/Checkpointstats";
import CheckpointFilters, {type MinRisk,} from "@/components/checkpoints/Checkpointfilters";
import CheckpointTable, { type SortKey,type SortState,} from "@/components/checkpoints/CheckPointTable";
import CheckpointDetailPanel from "@/components/checkpoints/Checkpointdetailpanel";
import CheckpointMapPanel from "@/components/checkpoints/CheckPointMapPanel";

/* Adjust if your RoutePlanResponse names the route list differently. */
function getRoutes(result: unknown): PlannedRoute[] {
  return ((result as { routes?: PlannedRoute[] } | undefined)?.routes ??
    []) as PlannedRoute[];
}

function sortValue(cp: Checkpoint, key: SortKey): number {
  switch (key) {
    case "distance":
      return cp.distance_from_start_miles;
    case "eta":
      return getEtaMs(cp) ?? Number.MAX_SAFE_INTEGER;
    case "wind":
      return cp.weather.wind_mph;
    case "risk":
      return riskRank(riskOf(cp));
  }
}

export default function CheckpointsPage() {
  const saved = useSavedRoutePlan();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [routeId, setRouteId] = useState<string | null>(null);
  const [checkpointId, setCheckpointId] = useState<string | null>(null);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [query, setQuery] = useState("");
  const [minRisk, setMinRisk] = useState<MinRisk>("all");
  const [sort, setSort] = useState<SortState>({ key: "distance", dir: "asc" });

  const routes = useMemo(() => getRoutes(saved?.result), [saved]);
  const route = routes.find((item) => item.route_id === routeId) ?? routes[0];
  const checkpoints = useMemo(() => route?.checkpoints ?? [], [route]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const threshold = minRisk === "all" ? 0 : riskRank(minRisk);

    return checkpoints
      .filter((cp) => riskRank(riskOf(cp)) >= threshold)
      .filter(
        (cp) =>
          !needle ||
          cp.checkpoint_id.toLowerCase().includes(needle) ||
          String(cp.distance_from_start_miles).includes(needle),
      )
      .sort((a, b) => {
        const diff = sortValue(a, sort.key) - sortValue(b, sort.key);
        return sort.dir === "asc" ? diff : -diff;
      });
  }, [checkpoints, query, minRisk, sort]);

  const selected =
    checkpoints.find((cp) => cp.checkpoint_id === checkpointId) ?? null;

  function selectCheckpoint(cp: Checkpoint) {
    setCheckpointId(cp.checkpoint_id);
    setFocus([cp.latitude, cp.longitude]); // new array each time re-triggers flyTo
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "risk" || key === "wind" ? "desc" : "asc" },
    );
  }

  function exportCsv() {
    downloadCsv(
      `checkpoints-${route?.route_id ?? "route"}.csv`,
      checkpointsToCsv(rows),
    );
  }

  if (!mounted) {
    return (
      <main className="mx-auto max-w-7xl space-y-4 p-6">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
      </main>
    );
  }

  if (!saved || !route) {
    return (
      <main className="mx-auto flex max-w-7xl flex-col items-center p-6 py-24 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <RouteIcon size={22} />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">
          No route planned yet
        </h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Plan a route first. Its checkpoints and weather risk will appear here
          automatically.
        </p>
        <Link
          href="/"
          className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Plan a route
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Header and route context */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Checkpoint Intelligence
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {saved.originLabel} to {saved.destinationLabel}, checkpoints every{" "}
            {saved.intervalMiles} mi. Assessed{" "}
            {new Date(saved.savedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            .
          </p>
        </div>

        {routes.length > 1 && (
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            Route
            <select
              value={route.route_id}
              onChange={(event) => {
                setRouteId(event.target.value);
                setCheckpointId(null);
                setFocus(null);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              {routes.map((item, index) => (
                <option key={item.route_id} value={item.route_id}>
                  Route {index + 1}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      <CheckpointStats checkpoints={checkpoints} />

      {/* Map and detail panel */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <CheckpointMapPanel
          routes={routes}
          selectedRouteId={route.route_id}
          selectedCheckpointId={checkpointId}
          focus={focus}
          onSelectCheckpoint={(id) => {
            const cp = checkpoints.find((item) => item.checkpoint_id === id);
            if (cp) selectCheckpoint(cp);
          }}
        />
        <CheckpointDetailPanel
          checkpoint={selected}
          onClose={() => setCheckpointId(null)}
        />
      </div>

      {/* Data grid */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CheckpointFilters
          query={query}
          onQuery={setQuery}
          minRisk={minRisk}
          onMinRisk={setMinRisk}
          shown={rows.length}
          total={checkpoints.length}
          onExport={exportCsv}
        />
        <CheckpointTable
          rows={rows}
          selectedId={checkpointId}
          onSelect={selectCheckpoint}
          sort={sort}
          onSort={toggleSort}
        />
      </section>
    </main>
  );
}