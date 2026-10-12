import { Download, Search } from "lucide-react";
import type { RiskLevel } from "@/lib/Checkpointutils";

export type MinRisk = "all" | Exclude<RiskLevel, "low">;

const OPTIONS: { value: MinRisk; label: string }[] = [
  { value: "all", label: "All risk levels" },
  { value: "moderate", label: "Moderate and above" },
  { value: "high", label: "High and above" },
  { value: "severe", label: "Severe and above" },
  { value: "no_travel", label: "No travel only" },
];

type Props = {
  query: string;
  onQuery: (value: string) => void;
  minRisk: MinRisk;
  onMinRisk: (value: MinRisk) => void;
  shown: number;
  total: number;
  onExport: () => void;
};

export default function CheckpointFilters({
  query,
  onQuery,
  minRisk,
  onMinRisk,
  shown,
  total,
  onExport,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
      <div className="relative min-w-52 flex-1 sm:max-w-xs">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search checkpoint ID or mile"
          aria-label="Search checkpoints"
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        />
      </div>

      <select
        value={minRisk}
        onChange={(event) => onMinRisk(event.target.value as MinRisk)}
        aria-label="Filter by risk"
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <p className="text-xs text-slate-500">
        Showing {shown} of {total}
      </p>

      <button
        type="button"
        onClick={onExport}
        disabled={shown === 0}
        className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <Download size={14} />
        Export CSV
      </button>
    </div>
  );
}