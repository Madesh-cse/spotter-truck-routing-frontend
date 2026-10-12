import type { PlannedRoute } from "@/types/routes";

export type Checkpoint = PlannedRoute["checkpoints"][number];
export type RiskLevel = "low" | "moderate" | "high" | "severe" | "no_travel";
export type RiskFactor = "overall" | "wind" | "rain" | "snow";

export const RISK_LEVELS: RiskLevel[] = [
  "low",
  "moderate",
  "high",
  "severe",
  "no_travel",
];

export const RISK_META: Record<
  RiskLevel,
  { label: string; badge: string; action: string }
> = {
  low: {
    label: "Low",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    action: "No action required. Continue on the planned route.",
  },
  moderate: {
    label: "Moderate",
    badge: "bg-yellow-50 text-yellow-800 ring-yellow-600/30",
    action: "Monitor conditions and brief the driver before this checkpoint.",
  },
  high: {
    label: "High",
    badge: "bg-orange-50 text-orange-700 ring-orange-600/20",
    action:
      "Notify the driver, reduce speed, and consider a delay or alternate route.",
  },
  severe: {
    label: "Severe",
    badge: "bg-red-50 text-red-700 ring-red-600/20",
    action:
      "Safety review required before dispatch. Consider holding departure or rerouting.",
  },
  no_travel: {
    label: "No travel",
    badge: "bg-red-900 text-white ring-red-900",
    action:
      "Do not route through this checkpoint. Select an alternate route or delay departure.",
  },
};

export function riskRank(level: RiskLevel) {
  return RISK_LEVELS.indexOf(level);
}

/* Reads the backend's risk classification. Never recalculates it. */
export function riskOf(
  checkpoint: Checkpoint,
  factor: RiskFactor = "overall",
): RiskLevel {
  const risk = checkpoint.risk as unknown as Record<string, string>;
  const raw = (
    risk[factor === "overall" ? "overall_risk" : `${factor}_risk`] ?? "low"
  ).toLowerCase();

  return (RISK_LEVELS as string[]).includes(raw) ? (raw as RiskLevel) : "low";
}

/* ETA lives in one place so a backend field rename is a one-line change.
   Adjust the keys below to match your PlannedRoute checkpoint type. */
export function getEtaRaw(checkpoint: Checkpoint): string | null {
  const c = checkpoint as unknown as Record<string, unknown>;
  const weather = (c.weather ?? {}) as Record<string, unknown>;
  const raw =
    c.eta ??
    c.estimated_arrival ??
    c.arrival_time ??
    c.forecast_time ??
    weather.forecast_time ??
    null;

  return typeof raw === "string" ? raw : null;
}

export function getEtaMs(checkpoint: Checkpoint): number | null {
  const raw = getEtaRaw(checkpoint);
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function formatEta(checkpoint: Checkpoint): string {
  const raw = getEtaRaw(checkpoint);
  if (!raw) return "—";
  const ms = new Date(raw).getTime();
  if (Number.isNaN(ms)) return raw;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(ms));
}

export function formatMiles(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)} mi`;
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function checkpointsToCsv(rows: Checkpoint[]) {
  const header = [
    "checkpoint_id",
    "latitude",
    "longitude",
    "distance_from_start_miles",
    "eta",
    "wind_mph",
    "rain_in_hr",
    "snow_in_hr",
    "overall_risk",
    "wind_risk",
    "rain_risk",
    "snow_risk",
  ];

  const lines = rows.map((cp) =>
    [
      cp.checkpoint_id,
      cp.latitude,
      cp.longitude,
      cp.distance_from_start_miles,
      getEtaRaw(cp) ?? "",
      cp.weather.wind_mph,
      cp.weather.precipitation_in_hr,
      cp.weather.snowfall_in_hr,
      riskOf(cp, "overall"),
      riskOf(cp, "wind"),
      riskOf(cp, "rain"),
      riskOf(cp, "snow"),
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}