import { useState, type ReactNode } from "react";
import type { Equipment, KpiFilterKey } from "../types";
import { getFleetStats } from "../lib/derive";
import { complianceRate, countCompliant } from "../lib/kpi";
import { formatAverageDuration } from "../lib/helpers";
import { AlertIcon, CheckIcon, ClockIcon, LayersIcon } from "./icons";
import { KpiEquipmentModal } from "./KpiEquipmentModal";

function Card({
  label,
  value,
  hint,
  icon,
  accent,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card flex w-full items-center gap-4 p-4 text-left transition hover:shadow-card-hover hover:ring-2 hover:ring-oil-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oil-400"
      aria-label={`View equipment for ${label}`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none text-slate-900">{value}</p>
        <p className="mt-1 truncate text-xs font-medium text-slate-500">
          {label}
        </p>
        {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-oil-700/70">
          View equipment
        </p>
      </div>
    </button>
  );
}

export function SummaryCards({
  equipment,
  onSelectEquipment,
}: {
  equipment: Equipment[];
  onSelectEquipment: (id: string) => void;
}) {
  const [activeKpi, setActiveKpi] = useState<KpiFilterKey | null>(null);
  const stats = getFleetStats(equipment);
  const rate = complianceRate(equipment);
  const avgTurnaround = formatAverageDuration(stats.completedDurations);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Card
          label="Total equipment"
          value={stats.total}
          icon={<LayersIcon className="h-5 w-5 text-slate-700" />}
          accent="bg-slate-100"
          onClick={() => setActiveKpi("all")}
        />
        <Card
          label="Compliance rate"
          value={`${rate}%`}
          hint={`${countCompliant(equipment)} compliant (not overdue)`}
          icon={<CheckIcon className="h-5 w-5 text-emerald-600" />}
          accent="bg-emerald-50"
          onClick={() => setActiveKpi("compliant")}
        />
        <Card
          label="Overdue samples"
          value={stats.overdue}
          hint={
            stats.dueSoon > 0
              ? `${stats.dueSoon} due within 15 days`
              : undefined
          }
          icon={<ClockIcon className="h-5 w-5 text-yellow-600" />}
          accent="bg-yellow-50"
          onClick={() => setActiveKpi("overdue")}
        />
        <Card
          label="Abnormal / needs action"
          value={stats.critical}
          icon={<AlertIcon className="h-5 w-5 text-red-600" />}
          accent="bg-red-50"
          onClick={() => setActiveKpi("critical")}
        />
        <Card
          label="Avg. lab turnaround"
          value={avgTurnaround}
          hint={`${stats.completedDurations.length} completed rounds`}
          icon={<ClockIcon className="h-5 w-5 text-sky-600" />}
          accent="bg-sky-50"
          onClick={() => setActiveKpi("withTurnaround")}
        />
      </div>

      {activeKpi && (
        <KpiEquipmentModal
          equipment={equipment}
          kpi={activeKpi}
          onClose={() => setActiveKpi(null)}
          onSelect={(id) => {
            setActiveKpi(null);
            onSelectEquipment(id);
          }}
        />
      )}
    </>
  );
}
