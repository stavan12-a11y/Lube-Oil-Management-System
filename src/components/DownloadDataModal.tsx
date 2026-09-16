import { useEffect } from "react";
import type { Equipment, KpiFilterKey, KpiSnapshot } from "../types";
import {
  downloadCsv,
  fleetToCsv,
  kpiEquipmentToCsv,
  kpiTrendToCsv,
  slugify,
} from "../lib/csv";
import { filterEquipmentByKpi, KPI_FILTER_LABELS } from "../lib/kpi";
import { CloseIcon, DownloadIcon } from "./icons";

const CURRENT_DOWNLOADS: {
  key: KpiFilterKey | "fleet" | "complianceTrend";
  label: string;
  filename: string;
}[] = [
  { key: "fleet", label: "Full equipment register", filename: "equipment-register.csv" },
  {
    key: "compliant",
    label: "Compliant equipment",
    filename: "compliant-equipment.csv",
  },
  {
    key: "overdue",
    label: "Overdue samples",
    filename: "overdue-equipment.csv",
  },
  {
    key: "dueSoon",
    label: "Due within 15 days",
    filename: "due-soon-equipment.csv",
  },
  {
    key: "critical",
    label: "Abnormal / needs action",
    filename: "critical-equipment.csv",
  },
  {
    key: "complianceTrend",
    label: "Compliance rate trend",
    filename: "compliance-rate-trend.csv",
  },
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      {children}
    </div>
  );
}

export function DownloadDataModal({
  equipment,
  kpiHistory,
  onClose,
}: {
  equipment: Equipment[];
  kpiHistory: KpiSnapshot[];
  onClose: () => void;
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

  function downloadItem(key: KpiFilterKey | "fleet" | "complianceTrend") {
    if (key === "fleet") {
      downloadCsv("equipment-register.csv", fleetToCsv(equipment));
      return;
    }
    if (key === "complianceTrend") {
      downloadCsv(
        "compliance-rate-trend.csv",
        kpiTrendToCsv(kpiHistory, ["complianceRate"])
      );
      return;
    }
    const subset = filterEquipmentByKpi(equipment, key);
    const item = CURRENT_DOWNLOADS.find((d) => d.key === key);
    downloadCsv(
      item?.filename ?? `${slugify(KPI_FILTER_LABELS[key])}.csv`,
      kpiEquipmentToCsv(subset, key)
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Download data</h2>
            <p className="text-sm text-slate-500">
              Export equipment lists and daily compliance rate history.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <Field label="Downloads">
          <div className="grid gap-2 sm:grid-cols-2">
            {CURRENT_DOWNLOADS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => downloadItem(item.key)}
                className="inline-flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:border-oil-200 hover:bg-oil-50"
              >
                <span>{item.label}</span>
                <DownloadIcon className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}
