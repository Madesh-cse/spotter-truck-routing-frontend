import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  type Checkpoint,
  RISK_META,
  formatEta,
  formatMiles,
  riskOf,
} from "@/lib/Checkpointutils";

export type SortKey = "distance" | "eta" | "wind" | "risk";
export type SortState = { key: SortKey; dir: "asc" | "desc" };

type Props = {
  rows: Checkpoint[];
  selectedId: string | null;
  onSelect: (checkpoint: Checkpoint) => void;
  sort: SortState;
  onSort: (key: SortKey) => void;
};

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={
        active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
      }
      className={`px-4 py-2.5 text-left font-medium ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1.5 hover:text-slate-900"
      >
        {label}
        <Icon size={12} className={active ? "text-blue-700" : "text-slate-400"} />
      </button>
    </th>
  );
}

export default function CheckpointTable({
  rows,
  selectedId,
  onSelect,
  sort,
  onSort,
}: Props) {
  const selectedRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  if (rows.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-slate-500">
        No checkpoints match these filters. Clear the search or lower the risk
        threshold.
      </p>
    );
  }

  return (
    <div className="max-h-105 overflow-auto">
      <table className="w-full min-w-170 border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-slate-500">
          <tr className="border-b border-slate-200">
            <th scope="col" className="px-4 py-2.5 text-left font-medium">
              Checkpoint
            </th>
            <SortHeader label="Distance" sortKey="distance" sort={sort} onSort={onSort} />
            <SortHeader label="ETA" sortKey="eta" sort={sort} onSort={onSort} />
            <SortHeader label="Wind" sortKey="wind" sort={sort} onSort={onSort} />
            <th scope="col" className="px-4 py-2.5 text-left font-medium">
              Rain
            </th>
            <th scope="col" className="px-4 py-2.5 text-left font-medium">
              Snow
            </th>
            <SortHeader label="Overall risk" sortKey="risk" sort={sort} onSort={onSort} />
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((cp) => {
            const selected = cp.checkpoint_id === selectedId;
            const risk = riskOf(cp);

            return (
              <tr
                key={cp.checkpoint_id}
                ref={selected ? selectedRef : null}
                aria-selected={selected}
                onClick={() => onSelect(cp)}
                className={`cursor-pointer border-b border-slate-100 tabular-nums ${
                  selected ? "bg-blue-50" : "hover:bg-slate-50"
                }`}
              >
                <td className="px-4 py-2.5 font-medium text-slate-900">
                  {cp.checkpoint_id}
                </td>
                <td className="px-4 py-2.5 text-slate-700">
                  {formatMiles(cp.distance_from_start_miles)}
                </td>
                <td className="px-4 py-2.5 text-slate-700">{formatEta(cp)}</td>
                <td className="px-4 py-2.5 text-slate-700">
                  {cp.weather.wind_mph.toFixed(0)} mph
                </td>
                <td className="px-4 py-2.5 text-slate-700">
                  {cp.weather.precipitation_in_hr.toFixed(2)} in/hr
                </td>
                <td className="px-4 py-2.5 text-slate-700">
                  {cp.weather.snowfall_in_hr.toFixed(2)} in/hr
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${RISK_META[risk].badge}`}
                  >
                    {RISK_META[risk].label}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(cp);
                    }}
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    Details
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}