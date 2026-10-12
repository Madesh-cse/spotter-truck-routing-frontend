"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { PlannedRoute } from "@/types/routes";
import type {
  RiskMetric,
  WeatherLayer,
} from "@/components/weather/WeatherMap";

// Leaflet touches `window`, so the map is client-only.
const WeatherMap = dynamic(() => import("@/components/weather/WeatherMap"), {
  ssr: false,
  loading: () => (
    <div className="h-155 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
  ),
});

const METRICS: { id: RiskMetric; label: string }[] = [
  { id: "overall", label: "Overall risk" },
  { id: "wind", label: "Wind risk" },
  { id: "rain", label: "Rain risk" },
  { id: "snow", label: "Snow risk" },
];

type Props = {
  routes: PlannedRoute[];
  selectedRouteId: string | null;
  selectedCheckpointId: string | null;
  focus: [number, number] | null;
  onSelectCheckpoint: (checkpointId: string) => void;
};

export default function CheckpointMapPanel({
  routes,
  selectedRouteId,
  selectedCheckpointId,
  focus,
  onSelectCheckpoint,
}: Props) {
  const [layer, setLayer] = useState<WeatherLayer>("radar");
  const [metric, setMetric] = useState<RiskMetric>("overall");
  const [opacity, setOpacity] = useState(0.7);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          Color route by
          <select
            value={metric}
            onChange={(event) => setMetric(event.target.value as RiskMetric)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
          >
            {METRICS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          Overlay opacity
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(event) => setOpacity(Number(event.target.value))}
            className="w-28 accent-blue-700"
          />
        </label>
      </div>

      <WeatherMap
        routes={routes}
        selectedRouteId={selectedRouteId}
        selectedCheckpointId={selectedCheckpointId}
        focus={focus}
        layer={layer}
        metric={metric}
        opacity={opacity}
        onSelectCheckpoint={onSelectCheckpoint}
        onLayerChange={setLayer}
      />
    </div>
  );
}