import {
  type Checkpoint,
  formatEta,
  getEtaMs,
  riskOf,
  riskRank,
} from "@/lib/Checkpointutils";
function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${tone}`} />
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export default function CheckpointStats({
  checkpoints,
}: {
  checkpoints: Checkpoint[];
}) {
  const total = checkpoints.length;
  const highRisk = checkpoints.filter(
    (cp) => riskRank(riskOf(cp)) >= riskRank("high"),
  ).length;
  const severe = checkpoints.filter(
    (cp) => riskRank(riskOf(cp)) >= riskRank("severe"),
  ).length;

  const now = Date.now();
  const next = checkpoints
    .filter((cp) => (getEtaMs(cp) ?? 0) >= now)
    .sort((a, b) => (getEtaMs(a) ?? 0) - (getEtaMs(b) ?? 0))[0];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Total checkpoints"
        value={String(total)}
        hint="On the selected route"
        tone="bg-blue-600"
      />
      <StatCard
        label="High-risk checkpoints"
        value={String(highRisk).padStart(2, "0")}
        hint="High, severe or no travel"
        tone="bg-orange-500"
      />
      <StatCard
        label="Severe checkpoints"
        value={String(severe).padStart(2, "0")}
        hint="Safety review needed"
        tone="bg-red-600"
      />
      <StatCard
        label="Next checkpoint ETA"
        value={next ? formatEta(next) : "—"}
        hint={next ? next.checkpoint_id : "No upcoming ETA in route data"}
        tone="bg-slate-400"
      />
    </div>
  );
}