import type { Equipment, KpiSnapshot, KpiTrendMetric, OilSample } from "../types";
import { getEquipmentStatus, getLastSampledDate, STATUS_META } from "./derive";
import { KPI_FILTER_LABELS, KPI_TREND_LABELS, snapshotMetricValue } from "./kpi";
import { formatDate } from "./helpers";

function esc(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cells: unknown[]): string {
  return cells.map(esc).join(",");
}

function sampleRows(equipment: Equipment, sample: OilSample, kind: string): string[] {
  const lines: string[] = [];
  lines.push(
    row([
      "Sample",
      kind,
      equipment.name,
      `Date: ${sample.date}`,
      `Result: ${sample.result}`,
      `Status: ${sample.status}`,
      `Lab report #: ${sample.labReportNumber}`,
      `Started: ${sample.startedAt}`,
      `Completed: ${sample.completedAt ?? ""}`,
      `Notes: ${sample.notes}`,
    ])
  );
  lines.push(
    row([
      "",
      "Readings",
      `Visc@40C: ${sample.readings.viscosity40}`,
      `Visc@100C: ${sample.readings.viscosity100}`,
      `VI: ${sample.readings.viscosityIndex}`,
      `Water ppm: ${sample.readings.waterPpm}`,
      `TAN: ${sample.readings.tan}`,
      `ISO 4406: ${sample.readings.isoCleanliness}`,
      `Fe wear ppm: ${sample.readings.ferrousWearPpm}`,
      `Flash pt C: ${sample.readings.flashPointC}`,
    ])
  );
  for (const step of sample.steps) {
    lines.push(
      row([
        "",
        "Step",
        step.label,
        step.completed ? "completed" : "pending",
        `Timestamp: ${step.completedAt ?? ""}`,
        `Notes: ${step.notes}`,
      ])
    );
  }
  for (const act of sample.actions) {
    lines.push(
      row(["", "Corrective action", `Logged: ${act.loggedAt}`, `Detail: ${act.description}`])
    );
  }
  return lines;
}

/** Build a detailed per-equipment CSV report. */
export function equipmentToCsv(equipment: Equipment): string {
  const status = getEquipmentStatus(equipment);
  const lines: string[] = [];

  lines.push("Section,Field,Value");
  lines.push(row(["Specs", "Name / Tag", equipment.name]));
  lines.push(row(["Specs", "Type", equipment.type]));
  lines.push(row(["Specs", "Manufacturer", equipment.manufacturer]));
  lines.push(row(["Specs", "Location", equipment.location]));
  lines.push(row(["Specs", "Criticality", equipment.criticality]));
  lines.push(row(["Specs", "Lubricant Type", equipment.lubricantType]));
  lines.push(row(["Specs", "Lubricant Grade", equipment.lubricantGrade]));
  lines.push(row(["Specs", "Oil Capacity", equipment.oilCapacityLitres]));
  lines.push(
    row(["Specs", "Sampling Interval (days)", equipment.samplingIntervalDays])
  );
  lines.push(row(["Specs", "Current Status", STATUS_META[status].label]));
  lines.push(
    row(["Specs", "Last Sampled", getLastSampledDate(equipment) ?? "Never"])
  );

  lines.push("");
  lines.push("Type,Kind,A,B,C,D,E,F,G,H,I,J");

  if (equipment.activeSample) {
    for (const l of sampleRows(equipment, equipment.activeSample, "Active")) {
      lines.push(l);
    }
  }
  for (const h of equipment.history) {
    for (const l of sampleRows(equipment, h, "Archived")) {
      lines.push(l);
    }
  }

  return lines.join("\r\n");
}

/** Build a flat fleet-wide CSV with one row per equipment item plus rolled-up counts. */
export function fleetToCsv(equipment: Equipment[]): string {
  const header = [
    "Name / Tag",
    "Type",
    "Manufacturer",
    "Location",
    "Criticality",
    "Lubricant Type",
    "Lubricant Grade",
    "Oil Capacity",
    "Sampling Interval (days)",
    "Status",
    "Last Sampled",
    "Active Sample Date",
    "Active Result",
    "Steps Completed",
    "Corrective Actions Logged",
    "Archived Samples",
  ];
  const lines: string[] = [row(header)];

  for (const e of equipment) {
    const status = getEquipmentStatus(e);
    const active = e.activeSample;
    const stepsDone = active
      ? `${active.steps.filter((s) => s.completed).length}/${active.steps.length}`
      : "";
    lines.push(
      row([
        e.name,
        e.type,
        e.manufacturer,
        e.location,
        e.criticality,
        e.lubricantType,
        e.lubricantGrade,
        e.oilCapacityLitres,
        e.samplingIntervalDays,
        STATUS_META[status].label,
        getLastSampledDate(e) ?? "Never",
        active?.date ?? "",
        active?.result ?? "",
        stepsDone,
        active?.actions.length ?? 0,
        e.history.length,
      ])
    );
  }

  return lines.join("\r\n");
}

/** Fleet CSV scoped to a KPI category with a context header row. */
export function kpiEquipmentToCsv(
  equipment: Equipment[],
  kpiKey: keyof typeof KPI_FILTER_LABELS
): string {
  const label = KPI_FILTER_LABELS[kpiKey];
  const lines: string[] = [
    row(["KPI Category", label]),
    row(["Equipment Count", equipment.length]),
    row(["Exported At", new Date().toISOString()]),
    "",
  ];
  lines.push(fleetToCsv(equipment));
  return lines.join("\r\n");
}

/** Wide-format trend CSV for comparing KPI metrics over time. */
export function kpiTrendToCsv(
  snapshots: KpiSnapshot[],
  metrics: KpiTrendMetric[]
): string {
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );
  const header = ["Date", ...metrics.map((m) => KPI_TREND_LABELS[m])];
  const lines: string[] = [row(header)];
  for (const snap of sorted) {
    lines.push(
      row([
        formatDate(snap.at.slice(0, 10)),
        ...metrics.map((m) => snapshotMetricValue(snap, m)),
      ])
    );
  }
  return lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
