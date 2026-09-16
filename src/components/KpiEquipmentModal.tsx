import { useEffect, useMemo } from "react";
import type { Equipment, KpiFilterKey } from "../types";
import {
  getEquipmentStatus,
  getScheduleInfo,
  sampleDurationMs,
  STATUS_META,
} from "../lib/derive";
import { filterEquipmentByKpi, KPI_FILTER_LABELS } from "../lib/kpi";
import { formatAverageDuration, formatDuration } from "../lib/helpers";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  LayersIcon,
  MapPinIcon,
  WrenchIcon,
} from "./icons";

function lastCompletedSample(equipment: Equipment) {
  const completed = [...equipment.history];
  if (equipment.activeSample?.status === "completed") {
    completed.push(equipment.activeSample);
  }
  return (
    completed
      .filter((s) => sampleDurationMs(s) !== null && s.completedAt)
      .sort(
        (a, b) =>
          new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
      )[0] ?? null
  );
}

function kpiBadge(equipment: Equipment, kpi: KpiFilterKey) {
  const status = getEquipmentStatus(equipment);
  const schedule = getScheduleInfo(equipment);

  switch (kpi) {
    case "overdue":
      return {
        label: `${schedule.daysOverdue}d overdue`,
        className: "bg-rose-100 text-rose-700",
        icon: <AlertIcon className="h-3 w-3" />,
      };
    case "dueSoon":
      return {
        label: `${schedule.daysUntilDue}d remaining`,
        className: "bg-amber-100 text-amber-700",
        icon: <ClockIcon className="h-3 w-3" />,
      };
    case "critical": {
      const actions = equipment.activeSample?.actions.length ?? 0;
      return {
        label: `${actions} ${actions === 1 ? "action" : "actions"}`,
        className: "bg-rose-100 text-rose-700",
        icon: <WrenchIcon className="h-3 w-3" />,
      };
    }
    case "compliant":
      return {
        label: `${schedule.daysUntilDue}d remaining`,
        className: "bg-emerald-100 text-emerald-700",
        icon: <CheckIcon className="h-3 w-3" />,
      };
    case "withTurnaround": {
      const smp = lastCompletedSample(equipment);
      const ms = smp ? sampleDurationMs(smp) : null;
      return {
        label: ms !== null ? formatAverageDuration([ms]) : "—",
        className: "bg-sky-100 text-sky-700",
        icon: <ClockIcon className="h-3 w-3" />,
      };
    }
    case "all":
    default: {
      if (schedule.isOverdue) {
        return {
          label: `${schedule.daysOverdue}d overdue`,
          className: "bg-rose-100 text-rose-700",
          icon: <AlertIcon className="h-3 w-3" />,
        };
      }
      if (status === "critical") {
        return {
          label: STATUS_META.critical.label,
          className: "bg-rose-100 text-rose-700",
          icon: <WrenchIcon className="h-3 w-3" />,
        };
      }
      return {
        label: `${schedule.daysUntilDue}d remaining`,
        className: schedule.isDueSoon
          ? "bg-amber-100 text-amber-700"
          : "bg-slate-100 text-slate-600",
        icon: <ClockIcon className="h-3 w-3" />,
      };
    }
  }
}

function detailLine(equipment: Equipment, kpi: KpiFilterKey): string | null {
  const status = getEquipmentStatus(equipment);
  const schedule = getScheduleInfo(equipment);

  switch (kpi) {
    case "critical":
      return `Status: ${STATUS_META[status].label}`;
    case "compliant":
      return `Status: ${STATUS_META.normal.label} · Next sample ${schedule.nextDueLabel}`;
    case "withTurnaround": {
      const smp = lastCompletedSample(equipment);
      if (!smp?.completedAt) return "No measurable turnaround";
      return `Last turnaround: ${formatDuration(smp.startedAt, smp.completedAt)}`;
    }
    case "overdue":
      return `Next sample was due ${schedule.nextDueLabel}`;
    case "dueSoon":
      return `Next sample due ${schedule.nextDueLabel}`;
    case "all":
      return `Status: ${STATUS_META[status].label}`;
    default:
      return null;
  }
}

function EquipmentRow({
  equipment,
  kpi,
  onSelect,
}: {
  equipment: Equipment;
  kpi: KpiFilterKey;
  onSelect: (id: string) => void;
}) {
  const schedule = getScheduleInfo(equipment);
  const badge = kpiBadge(equipment, kpi);
  const detail = detailLine(equipment, kpi);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(equipment.id)}
        className="group flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-oil-200 hover:bg-oil-50/40"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">
              {equipment.name}
            </p>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
            >
              {badge.icon}
              {badge.label}
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-600">
            <span className="font-medium text-slate-500">Lubricant:</span>{" "}
            {equipment.lubricantGrade || "—"}
          </p>

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 min-w-0">
              <LayersIcon className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{equipment.type || "—"}</span>
            </span>
            <span className="inline-flex items-center gap-1 min-w-0">
              <MapPinIcon className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{equipment.location || "—"}</span>
            </span>
            {kpi !== "overdue" && kpi !== "dueSoon" && kpi !== "compliant" && (
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="h-3 w-3 shrink-0 text-slate-400" />
                Next sample {schedule.nextDueLabel}
              </span>
            )}
          </div>

          {detail ? (
            <p className="mt-1 text-[11px] text-slate-400">{detail}</p>
          ) : null}
        </div>
        <ArrowRightIcon className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-oil-700" />
      </button>
    </li>
  );
}

function EquipmentList({
  equipment,
  kpi,
  emptyMessage,
  onSelect,
}: {
  equipment: Equipment[];
  kpi: KpiFilterKey;
  emptyMessage: string;
  onSelect: (id: string) => void;
}) {
  if (equipment.length === 0) {
    return (
      <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {equipment.map((e) => (
        <EquipmentRow key={e.id} equipment={e} kpi={kpi} onSelect={onSelect} />
      ))}
    </ul>
  );
}

function sortBySchedule(equipment: Equipment[]): Equipment[] {
  return [...equipment].sort(
    (a, b) => getScheduleInfo(a).daysUntilDue - getScheduleInfo(b).daysUntilDue
  );
}

function sortByName(equipment: Equipment[]): Equipment[] {
  return [...equipment].sort((a, b) => a.name.localeCompare(b.name));
}

export function KpiEquipmentModal({
  equipment,
  kpi,
  onClose,
  onSelect,
}: {
  equipment: Equipment[];
  kpi: KpiFilterKey;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const overdue = useMemo(
    () => sortBySchedule(filterEquipmentByKpi(equipment, "overdue")),
    [equipment]
  );
  const dueSoon = useMemo(
    () => sortBySchedule(filterEquipmentByKpi(equipment, "dueSoon")),
    [equipment]
  );
  const filtered = useMemo(() => {
    const list = filterEquipmentByKpi(equipment, kpi);
    if (kpi === "overdue" || kpi === "dueSoon") return sortBySchedule(list);
    return sortByName(list);
  }, [equipment, kpi]);

  const showScheduleSections = kpi === "overdue";
  const title = showScheduleSections
    ? "Due & overdue samples"
    : KPI_FILTER_LABELS[kpi];
  const subtitle = showScheduleSections
    ? `${overdue.length} overdue · ${dueSoon.length} due within 15 days`
    : `${filtered.length} ${filtered.length === 1 ? "item" : "items"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kpi-equipment-title"
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id="kpi-equipment-title" className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {showScheduleSections ? (
            <div className="space-y-5">
              <section>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-rose-500">
                  Overdue ({overdue.length})
                </h3>
                <EquipmentList
                  equipment={overdue}
                  kpi="overdue"
                  emptyMessage="No overdue samples."
                  onSelect={onSelect}
                />
              </section>
              <section>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-500">
                  Due within 15 days ({dueSoon.length})
                </h3>
                <EquipmentList
                  equipment={dueSoon}
                  kpi="dueSoon"
                  emptyMessage="No equipment due within 15 days."
                  onSelect={onSelect}
                />
              </section>
            </div>
          ) : (
            <EquipmentList
              equipment={filtered}
              kpi={kpi}
              emptyMessage="No equipment matches this KPI."
              onSelect={onSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
}
