import { MapPin, X } from "lucide-react";
import {
  type Checkpoint,
  RISK_META,
  formatEta,
  formatMiles,
  riskOf,
} from "@/lib/Checkpointutils";

function RiskBadge({ level }: { level: ReturnType<typeof riskOf> }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${RISK_META[level].badge}`}
    >
      {RISK_META[level].label}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium tabular-nums text-slate-900">{children}</dd>
    </div>
  );
}

export default function CheckpointDetailPanel({
  checkpoint,
  onClose,
}: {
  checkpoint: Checkpoint | null;
  onClose: () => void;
}) {
  if (!checkpoint) {
    return (
      <aside className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <MapPin size={22} className="text-slate-400" />
        <p className="mt-3 text-sm font-medium text-slate-800">
          No checkpoint selected
        </p>
        <p className="mt-1 max-w-56 text-xs text-slate-500">
          Select a map marker or a table row to see its forecast, risk factors
          and recommended action.
        </p>
      </aside>
    );
  }

  const overall = riskOf(checkpoint);
  const weather = checkpoint.weather;

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {checkpoint.checkpoint_id}
          </h3>
          <p className="text-xs text-slate-500">
            {formatMiles(checkpoint.distance_from_start_miles)} from origin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={overall} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-4 px-4 py-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Recommended action</p>
          <p className="mt-1 text-sm text-slate-900">
            {RISK_META[overall].action}
          </p>
        </div>

        <section>
          <h4 className="text-xs font-semibold text-slate-500">Location and timing</h4>
          <dl className="divide-y divide-slate-100">
            <Row label="Coordinates">
              {checkpoint.latitude.toFixed(4)}, {checkpoint.longitude.toFixed(4)}
            </Row>
            <Row label="Forecast time (ETA)">{formatEta(checkpoint)}</Row>
          </dl>
        </section>

        <section>
          <h4 className="text-xs font-semibold text-slate-500">Risk factors</h4>
          <dl className="divide-y divide-slate-100">
            <Row label="Wind">
              <RiskBadge level={riskOf(checkpoint, "wind")} />
            </Row>
            <Row label="Rain">
              <RiskBadge level={riskOf(checkpoint, "rain")} />
            </Row>
            <Row label="Snow">
              <RiskBadge level={riskOf(checkpoint, "snow")} />
            </Row>
          </dl>
        </section>

        <section>
          <h4 className="text-xs font-semibold text-slate-500">Weather measurements</h4>
          <dl className="divide-y divide-slate-100">
            <Row label="Wind speed">{weather.wind_mph.toFixed(1)} mph</Row>
            <Row label="Rainfall">
              {weather.precipitation_in_hr.toFixed(3)} in/hr
            </Row>
            <Row label="Snowfall">
              {weather.snowfall_in_hr.toFixed(3)} in/hr
            </Row>
          </dl>
        </section>
      </div>
    </aside>
  );
}