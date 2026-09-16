import type { Equipment } from "../types";
import { getEquipmentStatus, getScheduleInfo, STATUS_META } from "../lib/derive";
import { Warning } from "./ui";
import {
  ArrowRightIcon,
  ClockIcon,
  CopyIcon,
  LayersIcon,
  MapPinIcon,
} from "./icons";

const BANNER: Record<ReturnType<typeof getEquipmentStatus>, string> = {
  critical: "bg-red-600",
  testing: "bg-amber-500",
  normal: "bg-emerald-600",
  none: "bg-slate-500",
};

function cardBannerClass(
  status: ReturnType<typeof getEquipmentStatus>,
  isOverdue: boolean
): string {
  if (status === "critical") return BANNER.critical;
  if (isOverdue) return "bg-yellow-500";
  return BANNER[status];
}

function cardRingClass(
  status: ReturnType<typeof getEquipmentStatus>,
  isOverdue: boolean
): string {
  if (status === "critical") return "ring-2 ring-red-500/40";
  if (isOverdue) return "ring-2 ring-yellow-400/50";
  if (status === "normal") return "ring-2 ring-emerald-500/50";
  return "";
}

export function EquipmentCard({
  equipment,
  onOpen,
  onDuplicate,
  showLocation = true,
}: {
  equipment: Equipment;
  onOpen: () => void;
  onDuplicate: () => void;
  showLocation?: boolean;
}) {
  const status = getEquipmentStatus(equipment);
  const meta = STATUS_META[status];
  const schedule = getScheduleInfo(equipment);
  const isOverdue = schedule.isOverdue;
  const bannerLabel =
    isOverdue && status !== "critical" ? "Overdue sample" : meta.label;

  return (
    <div
      className={`card group flex flex-col overflow-hidden transition-all hover:shadow-card-hover ${cardRingClass(status, isOverdue)}`}
    >
      <div
        className={`flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wide text-white ${cardBannerClass(status, isOverdue)}`}
      >
        <span>{bannerLabel}</span>
        {status === "testing" && !isOverdue && (
          <span className="rounded bg-white/20 px-1.5 py-0.5">In progress</span>
        )}
        {status === "normal" && !isOverdue && (
          <span className="rounded bg-white/20 px-1.5 py-0.5">Filed</span>
        )}
        {isOverdue && status !== "critical" && (
          <span className="rounded bg-white/20 px-1.5 py-0.5">
            {schedule.daysOverdue}d overdue
          </span>
        )}
      </div>

      <button
        onClick={onOpen}
        className="flex flex-1 flex-col px-4 py-3 text-left"
        aria-label={`Open ${equipment.name}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {equipment.criticality}
            </p>
            <h4 className="truncate text-lg font-bold text-slate-900">
              {equipment.name}
            </h4>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              <span className="font-medium text-slate-600">Lubricant:</span>{" "}
              {equipment.lubricantGrade || "—"}
            </p>
          </div>
          <ArrowRightIcon className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-oil-700" />
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-slate-600">
          <p className="flex items-center gap-1.5">
            <LayersIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{equipment.type || "—"}</span>
          </p>
          <p className="truncate pl-5">{equipment.manufacturer || "—"}</p>
          {showLocation && (
            <p className="flex items-center gap-1.5">
              <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{equipment.location || "—"}</span>
            </p>
          )}
        </div>
      </button>

      <div className="border-t border-slate-100 px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <ClockIcon className="h-3.5 w-3.5 text-slate-400" />
            Next sample:{" "}
            <span className="font-semibold text-slate-800">
              {schedule.nextDueLabel}
            </span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              title="Duplicate specs for similar equipment"
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:text-oil-700"
            >
              <CopyIcon className="h-3 w-3" />
              Duplicate
            </button>
            {schedule.isDueSoon && !isOverdue && (
              <Warning tone="warn">
                <ClockIcon className="h-3 w-3" />
                Due in {schedule.daysUntilDue}d
              </Warning>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
