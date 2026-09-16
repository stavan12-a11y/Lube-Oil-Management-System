import { useEffect, useState } from "react";
import type { Equipment } from "../types";
import { useLubeOil } from "../store";
import {
  getEquipmentStatus,
  getLastSampledDate,
  getScheduleInfo,
} from "../lib/derive";
import { equipmentToCsv, downloadCsv, slugify } from "../lib/csv";
import { formatDate } from "../lib/helpers";
import { EditableField, Select, StatusBadge, Warning } from "./ui";
import { SampleWorkflowPanel } from "./SampleWorkflowPanel";
import { HistoryTab } from "./HistoryTab";
import { ActivityLogContent } from "./ActivityLog";
import {
  AlertIcon,
  ArrowLeftIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  GaugeIcon,
  LayersIcon,
  MapPinIcon,
  TrashIcon,
} from "./icons";

type Tab = "overview" | "samples" | "changes";

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  samples: "Oil samples",
  changes: "Change history",
};

const TYPES = [
  "Centrifugal Pump",
  "Reciprocating Pump",
  "Screw Compressor",
  "Reciprocating Compressor",
  "Steam Turbine",
  "Gas Turbine",
  "Gearbox",
  "Electric Motor",
  "Blower / Fan",
  "Diesel Engine",
  "Hydraulic Power Unit",
  "Other",
];

const LUBRICANT_TYPES = [
  "Turbine Oil",
  "Gear Oil",
  "Compressor Oil",
  "Hydraulic Oil",
  "Engine Oil",
  "Circulating Oil",
  "Grease",
];

const CRITICALITY_OPTIONS: Equipment["criticality"][] = [
  "Critical",
  "Essential",
  "Non-Critical",
];

export function EquipmentDetail({
  equipment,
  onClose,
  onDuplicate,
}: {
  equipment: Equipment;
  onClose: () => void;
  onDuplicate: () => void;
}) {
  const { updateEquipmentField, removeEquipment, activity } = useLubeOil();
  const [tab, setTab] = useState<Tab>("overview");
  const status = getEquipmentStatus(equipment);
  const schedule = getScheduleInfo(equipment);
  const changeCount = activity.filter((e) => e.equipmentId === equipment.id).length;
  const lastSampled = getLastSampledDate(equipment);

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

  function exportEquipment() {
    downloadCsv(`${slugify(equipment.name)}-report.csv`, equipmentToCsv(equipment));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100">
      {/* Full-width header */}
      <header className="sticky top-0 z-10 shadow-md">
        {/* Oil-amber top bar */}
        <div className="bg-oil-900 text-white">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-oil-100 transition hover:bg-white/10"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Back to fleet</span>
              </button>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold sm:text-xl">
                  {equipment.name}
                </h2>
                <p className="truncate text-[11px] text-oil-200">
                  {equipment.type} · {equipment.location}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDuplicate}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                <CopyIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Duplicate</span>
              </button>
              <button
                type="button"
                onClick={exportEquipment}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                <DownloadIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* White sub-bar: status + tabs */}
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              {schedule.isOverdue && (
                <Warning tone="danger">
                  <AlertIcon className="h-3 w-3" />
                  Overdue by {schedule.daysOverdue} days
                </Warning>
              )}
              {schedule.isDueSoon && !schedule.isOverdue && (
                <Warning tone="warn">
                  <ClockIcon className="h-3 w-3" />
                  Due in {schedule.daysUntilDue} days
                </Warning>
              )}
            </div>

            {/* Tabs */}
            <div className="mt-3 flex gap-1">
              {(["overview", "samples", "changes"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                    tab === t
                      ? "bg-oil-100 text-oil-800"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {TAB_LABELS[t]}
                  {t === "samples" && equipment.history.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 text-[10px] text-slate-600">
                      {equipment.history.length}
                    </span>
                  )}
                  {t === "changes" && changeCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 text-[10px] text-slate-600">
                      {changeCount > 99 ? "99+" : changeCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
          {tab === "overview" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="card p-4">
                <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Equipment &amp; lubrication specs
                </h3>
                <div className="grid gap-1 sm:grid-cols-2">
                  <EditableField
                    label="Name / tag"
                    value={equipment.name}
                    onCommit={(v) => updateEquipmentField(equipment.id, "name", v)}
                  />
                  <Select
                    label="Type"
                    value={equipment.type}
                    options={TYPES.includes(equipment.type) ? TYPES : [equipment.type, ...TYPES]}
                    icon={<LayersIcon className="h-3 w-3" />}
                    onChange={(v) => updateEquipmentField(equipment.id, "type", v)}
                  />
                  <Select
                    label="Criticality"
                    value={equipment.criticality}
                    options={CRITICALITY_OPTIONS}
                    onChange={(v) =>
                      updateEquipmentField(
                        equipment.id,
                        "criticality",
                        v as Equipment["criticality"]
                      )
                    }
                  />
                  <Select
                    label="Lubricant type"
                    value={equipment.lubricantType}
                    options={
                      LUBRICANT_TYPES.includes(equipment.lubricantType)
                        ? LUBRICANT_TYPES
                        : [equipment.lubricantType, ...LUBRICANT_TYPES]
                    }
                    icon={<GaugeIcon className="h-3 w-3" />}
                    onChange={(v) =>
                      updateEquipmentField(equipment.id, "lubricantType", v)
                    }
                  />
                  <EditableField
                    label="Lubricant grade"
                    value={equipment.lubricantGrade}
                    onCommit={(v) =>
                      updateEquipmentField(equipment.id, "lubricantGrade", v)
                    }
                  />
                  <EditableField
                    label="Oil capacity"
                    value={equipment.oilCapacityLitres}
                    onCommit={(v) =>
                      updateEquipmentField(equipment.id, "oilCapacityLitres", v)
                    }
                  />
                  <EditableField
                    label="Manufacturer"
                    value={equipment.manufacturer}
                    onCommit={(v) =>
                      updateEquipmentField(equipment.id, "manufacturer", v)
                    }
                  />
                  <EditableField
                    label="Location"
                    value={equipment.location}
                    icon={<MapPinIcon className="h-3 w-3" />}
                    onCommit={(v) => updateEquipmentField(equipment.id, "location", v)}
                  />
                  <EditableField
                    label="Sampling interval (days)"
                    type="number"
                    value={String(equipment.samplingIntervalDays)}
                    onCommit={(v) => {
                      const n = Number(v);
                      if (Number.isFinite(n) && n > 0) {
                        updateEquipmentField(
                          equipment.id,
                          "samplingIntervalDays",
                          n
                        );
                      }
                    }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 px-3 text-xs text-slate-500">
                  <ClockIcon className="h-3.5 w-3.5 text-slate-400" />
                  Last sampled:{" "}
                  <span className="font-medium text-slate-700">
                    {lastSampled ? formatDate(lastSampled) : "Never"}
                  </span>
                  <span className="text-slate-300">·</span>
                  Next due:{" "}
                  <span className="font-medium text-slate-700">
                    {schedule.nextDueLabel}
                  </span>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remove "${equipment.name}" and all its sample data? This cannot be undone.`
                        )
                      ) {
                        removeEquipment(equipment.id);
                        onClose();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    Remove equipment
                  </button>
                </div>
              </section>

              <section>
                <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {equipment.activeSample ? "Active sample" : "Oil sample"}
                </h3>
                <SampleWorkflowPanel equipment={equipment} />
              </section>
            </div>
          ) : tab === "samples" ? (
            <div className="max-w-3xl">
              <HistoryTab equipment={equipment} />
            </div>
          ) : (
            <div className="max-w-3xl">
              <ActivityLogContent equipmentId={equipment.id} showEquipmentName={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
